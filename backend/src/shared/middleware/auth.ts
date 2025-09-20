import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@shared/database/models';
import { AuthenticatedRequest } from '@shared/types/common.types';
import { unauthorizedResponse, forbiddenResponse } from '@shared/utils/helpers';
import config from '@shared/config';

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

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // Fetch user from database to ensure it still exists and is active
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return unauthorizedResponse(res, 'User not found');
    }

    if (!user.isVerified) {
      return unauthorizedResponse(res, 'Account not verified');
    }

    // Add user to request object
    req.user = user.toJSON();
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
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      const user = await User.findByPk(decoded.userId);
      
      if (user && user.isVerified) {
        req.user = user.toJSON();
      }
    }
    
    next();
  } catch (error) {
    // Ignore auth errors in optional auth
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
  
  if (!serviceToken || serviceToken !== config.serviceSecret) {
    return unauthorizedResponse(res, 'Invalid service token');
  }

  next();
};

/**
 * Generate JWT token
 */
export const generateToken = (payload: any, expiresIn?: string): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: expiresIn || config.jwt.expiresIn
  } as jwt.SignOptions);
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (payload: any): string => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn
  } as jwt.SignOptions);
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, config.jwt.refreshSecret);
};

/**
 * Token blacklist (in production, use Redis or database)
 * For now, using in-memory set
 */
const tokenBlacklist = new Set<string>();

/**
 * Add token to blacklist
 */
export const blacklistToken = (token: string): void => {
  tokenBlacklist.add(token);
};

/**
 * Check if token is blacklisted
 */
export const isTokenBlacklisted = (token: string): boolean => {
  return tokenBlacklist.has(token);
};

/**
 * Middleware to check blacklisted tokens
 */
export const checkBlacklist = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token && isTokenBlacklisted(token)) {
    return unauthorizedResponse(res, 'Token has been revoked');
  }

  next();
};

/**
 * Setup Passport strategies for OAuth providers
 */
export const setupPassportStrategies = () => {
  // Passport session setup
  // passport.serializeUser((user: any, done) => {
  //   done(null, user.id);
  // });

  // passport.deserializeUser(async (id: string, done) => {
  //   try {
  //     const user = await User.findByPk(id);
  //     done(null, user);
  //   } catch (error) {
  //     done(error, null);
  //   }
  // });

  // Google OAuth Strategy
  // passport.use(new GoogleStrategy({
  //   clientID: config.auth.google.clientId,
  //   clientSecret: config.auth.google.clientSecret,
  //   callbackURL: '/api/auth/google/callback'
  // }, async (accessToken, refreshToken, profile, done) => {
  //   // Implementation will be added later
  //   return done(null, profile);
  // }));
};