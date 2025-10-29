import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { User, Agency } from '@shared/database/models';
import { AuthenticatedRequest } from '@shared/dto/AuthenticatedRequest';
import { unauthorizedResponse, setResponseAsForbidden, setResponseAsError } from '@shared/utils/helpers';
import appConfig from '@shared/config';
import { UserRole } from '@shared/types/user.types';
import logger from '@shared/utils/logger';

// JWKS Client per validare token Cognito
const jwksClient = jwksRsa({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
  jwksUri: `https://cognito-idp.${appConfig.cognito.region}.amazonaws.com/${appConfig.cognito.userPoolId}/.well-known/jwks.json`
});

/**
 * Helper per ottenere chiave pubblica da JWKS
 */
function getKey(header: any, callback: any) {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * JWT Authentication middleware con Cognito
 * Valida il token JWT di Cognito e carica l'utente dal DB
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return unauthorizedResponse(res, 'Access token required');
    }

    // Valida token JWT Cognito con firma RSA256
    jwt.verify(
      token,
      getKey,
      {
        issuer: appConfig.cognito.issuer,
        algorithms: ['RS256']
      },
      async (err, decoded: any) => {
        if (err) {
          if (err.name === 'TokenExpiredError') {
            return setResponseAsError(res, 'TOKEN_EXPIRED', 'Access token has expired. Please refresh your token.', 401);
          }
          return unauthorizedResponse(res, 'Invalid token');
        }

        try {
          // Estrai dati da token Cognito
          const cognitoSub = decoded.sub;
          const cognitoGroups: string[] = decoded['cognito:groups'] || [];

          // Recupera utente dal DB locale
          const user = await User.findOne({
            where: { cognitoSub },
            include: [
              {
                model: Agency,
                as: 'agency'
              }
            ]
          });

          if (!user) {
            return unauthorizedResponse(res, 'User not found');
          }

          if (!user.isActive) {
            return setResponseAsForbidden(res, 'Account is disabled');
          }

          // Determina ruolo dai Cognito Groups
          let role: 'client' | 'agent' | 'admin' | 'owner' = 'client';
          
          if (cognitoGroups.includes(appConfig.cognito.groups.owners)) {
            role = 'owner';
          } else if (cognitoGroups.includes(appConfig.cognito.groups.admins)) {
            role = 'admin';
          } else if (cognitoGroups.includes(appConfig.cognito.groups.agents)) {
            role = 'agent';
          } else if (cognitoGroups.includes(appConfig.cognito.groups.clients)) {
            role = 'client';
          }

          // Sincronizza ruolo con DB se diverso
          if (user.role !== role) {
            await user.update({ role });
            user.role = role;
          }

          // Aggiungi user a request
          req.user = user.toJSON();
          next();
        } catch (dbError) {
          logger.error('Database error in auth middleware:', dbError);
          return unauthorizedResponse(res, 'Authentication failed');
        }
      }
    );
  } catch (error) {
    logger.error('Authentication error:', error);
    return unauthorizedResponse(res, 'Authentication failed');
  }
};

/**
 * Optional authentication middleware con Cognito (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Valida token Cognito
      jwt.verify(
        token,
        getKey,
        {
          issuer: appConfig.cognito.issuer,
          algorithms: ['RS256']
        },
        async (err, decoded: any) => {
          if (!err && decoded) {
            try {
              const cognitoSub = decoded.sub;
              const cognitoGroups: string[] = decoded['cognito:groups'] || [];

              const user = await User.findOne({
                where: { cognitoSub },
                include: [{ model: Agency, as: 'agency' }]
              });

              if (user && user.isActive) {
                // Determina ruolo
                let role: UserRole = 'client';
                if (cognitoGroups.includes(appConfig.cognito.groups.owners)) {
                  role = 'owner';
                } else if (cognitoGroups.includes(appConfig.cognito.groups.admins)) {
                  role = 'admin';
                } else if (cognitoGroups.includes(appConfig.cognito.groups.agents)) {
                  role = 'agent';
                }

                // Sincronizza ruolo
                if (user.role !== role) {
                  await user.update({ role });
                  user.role = role;
                }

                req.user = user.toJSON();
              }
            } catch (dbError) {
              // Ignora errori DB in optionalAuth
              logger.warn('DB error in optionalAuth:', dbError);
            }
          }
          next();
        }
      );
    } else {
      next();
    }
  } catch (error) {
    // In optionalAuth ignoriamo gli errori e proseguiamo senza user
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return unauthorizedResponse(res, 'Authentication required');
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return setResponseAsForbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Agent authorization middleware
 */
export const requireAgent = requireRole(['agent', 'admin', 'owner']);

/**
 * Admin authorization middleware
 */
export const requireAdmin = requireRole(['admin', 'owner']);

/**
 * Resource ownership middleware
 */
export const requireOwnership = (
  getResourceUserId: (req: AuthenticatedRequest) => string | Promise<string | undefined> | undefined
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      // Owners and admins can access any resource
      if (req.user.role === 'admin') { // || req.user.role === 'owner') {
        return next();
      }

      const resourceUserId = await getResourceUserId(req);
      
      if (!resourceUserId || req.user.id !== resourceUserId) {
        return setResponseAsForbidden(res, 'Access denied to this resource');
      }

      next();
    } catch (error) {
      return setResponseAsForbidden(res, 'Unable to verify resource ownership');
    }
  };
};

/**
 * Service-to-service authentication middleware
 */
export const authenticateService = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const serviceToken = req.headers['x-service-token'];
  
  if (!serviceToken || serviceToken !== appConfig.serviceSecret) {
    return unauthorizedResponse(res, 'Invalid service token');
  }

  next();
};

/**
 * Middleware che controlla se l'utente deve cambiare password
 * Ritorna errore 403 con codice PASSWORD_CHANGE_REQUIRED
 */
export const requirePasswordChanged = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return unauthorizedResponse(res, 'Authentication required');
  }

  if (req.user.passwordChangeRequired) {
    return res.status(403).json({
      success: false,
      error: 'PASSWORD_CHANGE_REQUIRED',
      message: 'Password change is required before accessing this resource. Please change your password first.'
    });
  }

  next();
};

/**
 * Middleware che controlla se l'utente ha verificato l'email
 * Ritorna errore 403 con codice EMAIL_VERIFICATION_REQUIRED
 */
export const requireEmailVerified = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return unauthorizedResponse(res, 'Authentication required');
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      error: 'EMAIL_VERIFICATION_REQUIRED',
      message: 'Email verification is required before accessing this resource. Please verify your email first.'
    });
  }

  next();
};
