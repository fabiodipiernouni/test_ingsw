import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
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
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user as any);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  if (config.auth.google.clientId && config.auth.google.clientSecret) {
    passport.use(new GoogleStrategy({
      clientID: config.auth.google.clientId,
      clientSecret: config.auth.google.clientSecret,
      callbackURL: '/oauth/google/callback'
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        return done(null, {
          provider: 'google',
          providerId: profile.id,
          email: profile.emails?.[0]?.value,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          avatar: profile.photos?.[0]?.value,
          accessToken,
          refreshToken
        });
      } catch (error) {
        return done(error, false);
      }
    }));
  }

  // GitHub OAuth Strategy
  if (config.auth.github.clientId && config.auth.github.clientSecret) {
    passport.use(new GitHubStrategy({
      clientID: config.auth.github.clientId,
      clientSecret: config.auth.github.clientSecret,
      callbackURL: '/oauth/github/callback'
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
        const names = (profile.displayName || profile.username || '').split(' ');
        
        return done(null, {
          provider: 'github',
          providerId: profile.id,
          email,
          firstName: names[0] || profile.username || 'GitHub',
          lastName: names.slice(1).join(' ') || 'User',
          avatar: profile.photos?.[0]?.value,
          accessToken,
          refreshToken
        });
      } catch (error) {
        return done(error, false);
      }
    }));
  }
};