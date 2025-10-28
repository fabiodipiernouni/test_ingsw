import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { searchService } from '../services/SearchService';
import { SavedSearchCreateDto } from '../dto/SavedSearchCreateDto';
import { ToggleNotificationsDto } from '../dto/ToggleNotificationsDto';
import { UpdateSavedSearchNameDto } from '../dto/UpdateSavedSearchNameDto';
import { AuthenticatedRequest } from '@shared/dto/AuthenticatedRequest';
import { setResponseAsSuccess, setResponseAsError, setResponseAsValidationError, setResponseAsNotFound, formatValidationErrors } from '@shared/utils/helpers';
import logger from '@shared/utils/logger';

export class SearchController {
  /**
   * Salva una ricerca
   * POST /search/saved
   */
  async saveSearch(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Verifica autenticazione
      if (!req.user || !req.user.id) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User authentication required', 401);
        return;
      }

      const searchData: SavedSearchCreateDto = plainToInstance(SavedSearchCreateDto, req.body);
      
      const errors = await validate(searchData);
      logger.info('Validation errors:', { errors });
      if (errors.length > 0) {
        const str_errors = formatValidationErrors(errors);
        setResponseAsValidationError(res, str_errors);
        return;
      }

      logger.info('Save search request', { 
        filters: searchData.filters, 
        userId: req.user.id
      });

      const savedSearch = await searchService.createSavedSearch(req.user.id, searchData);

      setResponseAsSuccess(res, savedSearch, 'Search saved successfully', 201);

    } catch (error: any) {
      logger.error('Error in saveSearch controller:', error);

      if (error.name === 'ValidationError') {
        setResponseAsValidationError(res, [error.message]);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to save search', 500);
    }
  }

  /**
   * Ottieni ricerche salvate dell'utente
   * GET /search/saved
   */
  async getSavedSearches(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Verifica autenticazione
      if (!req.user || !req.user.id) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User authentication required', 401);
        return;
      }

      const savedSearches = await searchService.getUserSavedSearches(req.user.id);
      setResponseAsSuccess(res, savedSearches);

    } catch (error: any) {
      logger.error('Error in getSavedSearches controller:', error);
      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get saved searches', 500);
    }
  }
  /**
   * Elimina una ricerca salvata
   * DELETE /search/saved/:searchId
   */
  async deleteSavedSearch(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Verifica autenticazione
      if (!req.user || !req.user.id) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User authentication required', 401);
        return;
      }

      const { searchId } = req.params;

      if (!searchId) {
        setResponseAsError(res, 'BAD_REQUEST', 'Search ID is required', 400);
        return;
      }

      logger.info('Delete saved search request', { 
        searchId, 
        userId: req.user.id 
      });

      await searchService.deleteSavedSearch(req.user.id, searchId);
      setResponseAsSuccess(res, { message: 'Search deleted successfully' });

    } catch (error: any) {
      logger.error('Error in deleteSavedSearch controller:', error);

      if (error.name === 'NotFoundError') {
        setResponseAsNotFound(res, error.message);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to delete search', 500);
    }
  }

  /**
   * Attiva/Disattiva le notifiche per una ricerca salvata
   * PATCH /search/saved/:searchId/notifications
   */
  async toggleNotifications(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Verifica autenticazione
      if (!req.user || !req.user.id) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User authentication required', 401);
        return;
      }

      const { searchId } = req.params;
      
      const toggleDto: ToggleNotificationsDto = plainToInstance(ToggleNotificationsDto, req.body);
      
      const errors = await validate(toggleDto);
      if (errors.length > 0) {
        const str_errors = formatValidationErrors(errors);
        setResponseAsValidationError(res, str_errors);
        return;
      }

      if (!searchId) {
        setResponseAsError(res, 'BAD_REQUEST', 'Search ID is required', 400);
        return;
      }

      logger.info('Toggle notifications request', { 
        searchId, 
        userId: req.user.id,
        isNotificationEnabled: toggleDto.isNotificationEnabled 
      });

      const updatedSearch = await searchService.toggleNotifications(req.user.id, searchId, toggleDto.isNotificationEnabled);
      setResponseAsSuccess(res, updatedSearch, 'Notifications updated successfully');

    } catch (error: any) {
      logger.error('Error in toggleNotifications controller:', error);

      if (error.name === 'NotFoundError') {
        setResponseAsNotFound(res, error.message);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to update notifications', 500);
    }
  }

  /**
   * Aggiorna il nome di una ricerca salvata
   * PATCH /search/saved/:searchId/name
   */
  async updateSavedSearchName(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Verifica autenticazione
      if (!req.user || !req.user.id) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User authentication required', 401);
        return;
      }

      const { searchId } = req.params;
      
      const updateDto: UpdateSavedSearchNameDto = plainToInstance(UpdateSavedSearchNameDto, req.body);
      
      const errors = await validate(updateDto);
      if (errors.length > 0) {
        const str_errors = formatValidationErrors(errors);
        setResponseAsValidationError(res, str_errors);
        return;
      }

      if (!searchId) {
        setResponseAsError(res, 'BAD_REQUEST', 'Search ID is required', 400);
        return;
      }

      logger.info('Update saved search name request', { 
        searchId, 
        userId: req.user.id,
        newName: updateDto.name 
      });

      const updatedSearch = await searchService.updateSavedSearchName(req.user.id, searchId, updateDto.name);
      setResponseAsSuccess(res, updatedSearch, 'Search name updated successfully');

    } catch (error: any) {
      logger.error('Error in updateSavedSearchName controller:', error);

      if (error.name === 'NotFoundError') {
        setResponseAsNotFound(res, error.message);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to update search name', 500);
    }
  }
}

export const searchController = new SearchController();