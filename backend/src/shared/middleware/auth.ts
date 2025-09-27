import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@shared/database/models';
import { AuthenticatedRequest } from '@shared/types/common.types';
import { unauthorizedResponse, forbiddenResponse } from '@shared/utils/helpers';
import { config } from '../../config';

/**
 * JWT Authentication middleware
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

    const decoded = jwt.verify(token, config.auth.jwtSecret) as any;
    
    // Fetch user from database to ensure it still exists and is active
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return unauthorizedResponse(res, 'User not found');
    }

    // Add user to request object
    (req as any).user = user.toJSON();
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return unauthorizedResponse(res, 'Invalid token');
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return unauthorizedResponse(res, 'Token expired');
    }

    return unauthorizedResponse(res, 'Authentication failed');
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
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
      const decoded = jwt.verify(token, config.auth.jwtSecret) as any;
      const user = await User.findByPk(decoded.userId);
      
      //TODO: decidere se si vuole che un utente sia verificato (ha confermato la mail) per usare qualsiasi funzionalità dell'applicazione, al momento non è obbligatorio
      if (user) {
        req.user = user.toJSON();
      }
    }
    
    next();
  } catch (error: any) {
    // TODO: decidere se in caso di token non valido si vuole bloccare la richiesta o ignorare l'errore
    // nel caso non si voglia bloccare la richiesta cambiare tutto il codice nel catch in next();
    if (error instanceof jwt.JsonWebTokenError) {
      return unauthorizedResponse(res, 'Invalid token');
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return unauthorizedResponse(res, 'Token expired');
    }

    return unauthorizedResponse(res, 'Authentication failed');
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
      return forbiddenResponse(res, 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Agent authorization middleware
 */
export const requireAgent = requireRole(['agent', 'admin']);

/**
 * Admin authorization middleware
 */
export const requireAdmin = requireRole('admin');

/**
 * Resource ownership middleware
 */
export const requireOwnership = (
  getResourceUserId: (req: AuthenticatedRequest) => string | Promise<string>
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return unauthorizedResponse(res, 'Authentication required');
      }

      // Admins can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceUserId = await getResourceUserId(req);
      
      if (req.user.id !== resourceUserId) {
        return forbiddenResponse(res, 'Access denied to this resource');
      }

      next();
    } catch (error) {
      return forbiddenResponse(res, 'Unable to verify resource ownership');
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
  
  // TODO: Add serviceSecret to config or remove this middleware if not needed
  if (!serviceToken || serviceToken !== 'temp-service-secret') {
    return unauthorizedResponse(res, 'Invalid service token');
  }

  next();
};

/**
 * Generate JWT token
 */
export const generateToken = (payload: any, expiresIn?: string): string => {
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: expiresIn || config.auth.jwtExpiration
  } as jwt.SignOptions);
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (payload: any): string => {
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn: config.auth.refreshTokenExpiration
  } as jwt.SignOptions);
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, config.auth.jwtSecret);
};
