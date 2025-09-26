import { Request, Response, NextFunction } from 'express';
import { User } from '../database/models/User';
import { Agency } from '../database/models/Agency';
import { AuthenticatedRequest } from '../types/common.types';
import logger from '../utils/logger';

/**
 * Middleware per verificare che l'utente sia admin dell'agenzia
 * e possa creare agenti per la sua agenzia
 */
export const requireAgencyAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findByPk(userId, {
      include: [{
        model: Agency,
        as: 'agency'
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verifica che l'utente sia admin e abbia un'agenzia
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only agency administrators can create agents'
      });
    }

    if (!user.agencyId) {
      return res.status(403).json({
        success: false,
        message: 'User must be associated with an agency'
      });
    }

    // Aggiunge l'agenzia al request per uso nei controller
    req.userAgency = user.agency;
    next();
  } catch (error) {
    logger.error('Error in requireAgencyAdmin middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware per verificare che l'utente sia il creator dell'agenzia
 * e possa creare admin per la sua agenzia
 */
export const requireAgencyCreator = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const user = await User.findByPk(userId, {
      include: [{
        model: Agency,
        as: 'agency'
      }]
    });

    if (!user || !user.agency) {
      return res.status(403).json({
        success: false,
        message: 'User not found or not associated with an agency'
      });
    }

    // Verifica che l'utente sia il creator dell'agenzia
    if (user.agency.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only the agency creator can create administrators'
      });
    }

    // Aggiunge l'agenzia al request per uso nei controller
    req.userAgency = user.agency;
    next();
  } catch (error) {
    logger.error('Error in requireAgencyCreator middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware generico per verificare che l'utente sia autenticato
 * e abbia un ruolo specifico
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      logger.error('Error in requireRole middleware:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};