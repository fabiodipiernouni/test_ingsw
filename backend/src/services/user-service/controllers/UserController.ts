import { Request, Response } from 'express';
import { userService } from '../services/UserService';
import { AuthenticatedRequest } from '../../../shared/types/common.types';
import { setResponseAsSuccess, setResponseAsError, validationErrorResponse, notFoundResponse } from '@shared/utils/helpers';
import logger from '../../../shared/utils/logger';

export class UserController {
  /**
   * GET /users/profile
   * Ottiene il profilo dell'utente corrente
   */
  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
        return;
      }

      const userProfile = await userService.getUserProfile(userId);
      setResponseAsSuccess(res, userProfile);

    } catch (error: any) {
      logger.error('Error in getProfile controller:', error);

      if (error.name === 'NotFoundError') {
        notFoundResponse(res, error.message);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get user profile', 500);
    }
  }

  /**
   * PUT /users/profile
   * Aggiorna il profilo dell'utente corrente
   */
  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User not authentication', 401);
        return;
      }

      const updateData = req.body;
      const updatedUser = await userService.updateUserProfile(userId, updateData);

      setResponseAsSuccess(res, updatedUser, 'Profile updated successfully');

    } catch (error: any) {
      logger.error('Error in updateProfile controller:', error);

      if (error.name === 'NotFoundError') {
        notFoundResponse(res, error.message);
        return;
      }

      if (error.name === 'ValidationError') {
        validationErrorResponse(res, error.details?.errors || [error.message]);
        return;
      }

      if (error.name === 'BadRequestError') {
        setResponseAsError(res, 'BAD_REQUEST', error.message, 400);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to update profile', 500);
    }
  }

  /**
   * GET /users/{userId}
   * Ottiene il profilo pubblico di un utente
   */
  async getUserById(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        setResponseAsError(res, 'BAD_REQUEST', 'User ID is required', 400);
        return;
      }

      const userProfile = await userService.getUserById(userId);
      setResponseAsSuccess(res, userProfile);

    } catch (error: any) {
      logger.error('Error in getUserById controller:', error);

      if (error.name === 'NotFoundError') {
        notFoundResponse(res, error.message);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get user', 500);
    }
  }

  /**
   * GET /users/preferences
   * Ottiene le preferenze dell'utente corrente
   */
  async getUserPreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
        return;
      }

      const preferences = await userService.getUserPreferences(userId);
      setResponseAsSuccess(res, preferences);

    } catch (error: any) {
      logger.error('Error in getUserPreferences controller:', error);

      if (error.name === 'NotFoundError') {
        notFoundResponse(res, error.message);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get user preferences', 500);
    }
  }

  /**
   * PUT /users/preferences
   * Aggiorna le preferenze dell'utente corrente
   */
  async updateUserPreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
        return;
      }

      const preferencesData = req.body;
      const updatedPreferences = await userService.updateUserPreferences(userId, preferencesData);

      setResponseAsSuccess(res, updatedPreferences, 'Preferences updated successfully');

    } catch (error: any) {
      logger.error('Error in updateUserPreferences controller:', error);

      if (error.name === 'ValidationError') {
        validationErrorResponse(res, error.details?.errors || [error.message]);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to update preferences', 500);
    }
  }

  /**
   * GET /users/notification-preferences
   * Ottiene le preferenze di notifica dell'utente corrente
   */
  async getNotificationPreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
        return;
      }

      const preferences = await userService.getNotificationPreferences(userId);
      setResponseAsSuccess(res, preferences);

    } catch (error: any) {
      logger.error('Error in getNotificationPreferences controller:', error);

      if (error.name === 'NotFoundError') {
        notFoundResponse(res, error.message);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get notification preferences', 500);
    }
  }

  /**
   * PUT /users/notification-preferences
   * Aggiorna le preferenze di notifica dell'utente corrente
   */
  async updateNotificationPreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
        return;
      }

      const notificationData = req.body;
      const updatedPreferences = await userService.updateNotificationPreferences(userId, notificationData);

      setResponseAsSuccess(res, updatedPreferences, 'Notification preferences updated successfully');

    } catch (error: any) {
      logger.error('Error in updateNotificationPreferences controller:', error);

      if (error.name === 'ValidationError') {
        validationErrorResponse(res, error.details?.errors || [error.message]);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to update notification preferences', 500);
    }
  }

  /**
   * POST /users/avatar
   * Carica avatar dell'utente
   */
  async uploadAvatar(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
        return;
      }

      // Per ora implementiamo solo la risposta di placeholder
      // TODO: Implementare logica di upload file
      // da valutare perché non è richiesto
      setResponseAsSuccess(res, { message: 'Avatar upload functionality not yet implemented' });

    } catch (error: any) {
      logger.error('Error in uploadAvatar controller:', error);
      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to upload avatar', 500);
    }
  }

  /**
   * GET /users/activity
   * Ottiene l'attività dell'utente corrente
   */
  async getUserActivity(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
        return;
      }

      // Per ora implementiamo solo la risposta di placeholder
      // TODO: Implementare logica di recupero attività nel UserService
      // da valutare perché non è richiesto
      const activity = {
        recentSearches: [],
        favoriteProperties: [],
        viewedProperties: [],
        savedSearches: []
      };
      setResponseAsSuccess(res, activity);

    } catch (error: any) {
      logger.error('Error in getUserActivity controller:', error);
      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get user activity', 500);
    }
  }

  /**
   * POST /users/agent
   * Crea un nuovo agente (solo per admin di agenzia)
   */
  async createAgent(req: AuthenticatedRequest, res: Response) {
    try {
      const creatorId = req.user?.id;
      if (!creatorId) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
        return;
      }

      const agentData = req.body;
      const result = await userService.createAgent(creatorId, agentData);

      setResponseAsSuccess(res, result, 'Agent created successfully', 201);

    } catch (error: any) {
      logger.error('Error in createAgent controller:', error);

      if (error.name === 'ValidationError') {
        validationErrorResponse(res, error.details?.errors || [error.message]);
        return;
      }

      if (error.name === 'BadRequestError') {
        setResponseAsError(res, 'BAD_REQUEST', error.message, 400);
        return;
      }

      if (error.name === 'UnauthorizedError') {
        setResponseAsError(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      if (error.name === 'ForbiddenError') {
        setResponseAsError(res, 'FORBIDDEN', error.message, 403);
        return;
      }

      if (error.name === 'ConflictError') {
        setResponseAsError(res, 'CONFLICT', error.message, 409);
        return;
      }

      if (error.name === 'NotFoundError') {
        setResponseAsError(res, 'NOT_FOUND', error.message, 404);
        return;
      }

      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors?.map((err: any) => err.message) || [error.message];
        validationErrorResponse(res, validationErrors);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to create agent', 500);
    }
  }

  /**
   * POST /users/admin
   * Crea un nuovo admin (solo per il creatore dell'agenzia)
   */
  async createAdmin(req: AuthenticatedRequest, res: Response) {
    try {
      const creatorId = req.user?.id;
      if (!creatorId) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
        return;
      }

      const adminData = req.body;
      const result = await userService.createAdmin(creatorId, adminData);

      setResponseAsSuccess(res, result, 'Admin created successfully', 201);

    } catch (error: any) {
      logger.error('Error in createAdmin controller:', error);

      if (error.name === 'ValidationError') {
        validationErrorResponse(res, error.details?.errors || [error.message]);
        return;
      }

      if (error.name === 'BadRequestError') {
        setResponseAsError(res, 'BAD_REQUEST', error.message, 400);
        return;
      }

      if (error.name === 'UnauthorizedError') {
        setResponseAsError(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      if (error.name === 'ForbiddenError') {
        setResponseAsError(res, 'FORBIDDEN', error.message, 403);
        return;
      }

      if (error.name === 'ConflictError') {
        setResponseAsError(res, 'CONFLICT', error.message, 409);
        return;
      }

      if (error.name === 'NotFoundError') {
        setResponseAsError(res, 'NOT_FOUND', error.message, 404);
        return;
      }

      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors?.map((err: any) => err.message) || [error.message];
        validationErrorResponse(res, validationErrors);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to create admin', 500);
    }
  }
}

export const userController = new UserController();