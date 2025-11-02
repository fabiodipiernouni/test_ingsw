import { Response, NextFunction } from 'express';
import { User } from '../database/models/User';
import { Agency } from '@shared/database/models';
import { AuthenticatedRequest } from '@shared/dto/AuthenticatedRequest';
import logger from '../utils/logger';
import { setResponseAsError, setResponseAsForbidden, unauthorizedResponse } from '@shared/utils/helpers';

/**
 * Middleware per verificare che l'utente sia admin dell'agenzia
 */
export const requireAgencyAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorizedResponse(res, 'Authentication required');
      return;
    }

    const user = await User.findByPk(userId, {
      include: [{
        model: Agency,
        as: 'agency'
      }]
    });

    if (!user) {
      unauthorizedResponse(res, 'User not found');
      return;
    }

    // Verifica che l'utente sia admin/owner e abbia un'agenzia
    if (!['admin', 'owner'].includes(user.role)) {
      setResponseAsForbidden(res, 'Only agency admins can perform this action');
      return;
    }

    if (!user.agencyId) {
      setResponseAsForbidden(res, 'User must be associated with an agency');
      return;
    }

    // Aggiunge l'agenzia al request per uso nei controller
    req.userAgency = user.agency;
    next();
  } catch (error) {
    logger.error('Error in requireAgencyAdmin middleware:', error);
    setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Internal server error');
  }
};

/**
 * Middleware per verificare che l'utente sia il owner dell'agenzia
 */
export const requireAgencyOwner = async (
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

    if (!user?.agency) {
      setResponseAsForbidden(res, 'User not found or not associated with an agency');
      return;
    }

    // Verifica che l'utente sia il owner dell'agenzia
    if (user.role !== 'owner') {
      setResponseAsForbidden(res, 'Only agency owners can perform this action');
      return;
    }

    if (user.agency.createdBy !== userId) {
      setResponseAsForbidden(res, 'Only the agency owner can create new admins');
      return;
    }

    // Aggiunge l'agenzia al request per uso nei controller
    req.userAgency = user.agency;
    next();
  } catch (error) {
    logger.error('Error in requireAgencyOwner middleware:', error);
    setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Internal server error');
    return;
  }
};

/**
 * Middleware per verificare che l'utente sia admin O owner
 */
export const requireAdminOrOwner = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      unauthorizedResponse(res, 'Authentication required');
      return;
    }

    if (!req.user || !['admin', 'owner'].includes(req.user.role)) {
      setResponseAsForbidden(res, 'Admin or owner role required');
      return;
    }

    next();
  } catch (error) {
    logger.error('Error in requireAdminOrOwner middleware:', error);
    setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Internal server error');
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
        unauthorizedResponse(res, 'Authentication required');
        return;
      }

      const user = await User.findByPk(userId);
      if (!user) {
        unauthorizedResponse(res, 'User not found');
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        setResponseAsForbidden(res, 'Access denied');
        return;
      }

      next();
    } catch (error) {
      logger.error('Error in requireRole middleware:', error);
      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Internal server error');
      return;
    }
  };
};