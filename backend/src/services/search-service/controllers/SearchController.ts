import { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/SearchService';
import { SearchRequest } from '../models/types';
import { AuthenticatedRequest } from '@shared/types/common.types';
import { successResponse, errorResponse, validationErrorResponse, notFoundResponse } from '@shared/utils/helpers';
import logger from '@shared/utils/logger';

export class SearchController {
  /**
   * Ricerca proprietà con filtri avanzati
   * POST /search
   */
  async searchProperties(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const searchRequest: SearchRequest = req.body;
      
      // Estrai l'ID utente se autenticato (opzionale per la ricerca)
      const userId = req.user?.id;
      
      logger.info('Property search request', { 
        filters: searchRequest,
        userId: userId || 'anonymous'
      });

      // Esegui la ricerca
      const result = await searchService.searchProperties(searchRequest, userId);

      successResponse(res, result, 'Search completed successfully');

    } catch (error: any) {
      logger.error('Error in searchProperties controller:', error);

      if (error.name === 'ValidationError') {
        validationErrorResponse(res, error.details?.errors || [error.message]);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Search failed', 500);
    }
  }

  /**
   * Ottieni suggerimenti di ricerca
   * GET /search/suggestions
   */
  async getSearchSuggestions(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { query, type = 'location' } = req.query;

      if (!query || typeof query !== 'string') {
        errorResponse(res, 'BAD_REQUEST', 'Query parameter is required', 400);
        return;
      }

      if (query.length < 2) {
        successResponse(res, []);
        return;
      }

      const suggestions = await searchService.getSearchSuggestions(query, type as string);

      successResponse(res, suggestions);

    } catch (error: any) {
      logger.error('Error in getSearchSuggestions controller:', error);
      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to get suggestions', 500);
    }
  }

  /**
   * Ottieni località popolari
   * GET /search/popular-locations
   */
  async getPopularLocations(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    //TODO: per ora commento altrimenti non posso eseguire
    /*try {
      const popularLocations = await searchService.getPopularLocations();

      successResponse(res, popularLocations);

    } catch (error: any) {
      logger.error('Error in getPopularLocations controller:', error);
      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to get popular locations', 500);
    }
    */
  }

  /**
   * Salva una ricerca
   * POST /search/saved
   */
  async saveSearch(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Verifica autenticazione
      if (!req.user || !req.user.id) {
        errorResponse(res, 'UNAUTHORIZED', 'User authentication required', 401);
        return;
      }

      const { name, filters, isNotificationEnabled = true } = req.body;

      if (!name || !filters) {
        errorResponse(res, 'BAD_REQUEST', 'Name and filters are required', 400);
        return;
      }

      logger.info('Save search request', { 
        name, 
        filters, 
        userId: req.user.id,
        isNotificationEnabled 
      });

      const savedSearch = await searchService.createSavedSearch(req.user.id, {
        name,
        filters,
        isNotificationEnabled
      });

      successResponse(res, savedSearch, 'Search saved successfully', 201);

    } catch (error: any) {
      logger.error('Error in saveSearch controller:', error);

      if (error.name === 'ValidationError') {
        validationErrorResponse(res, error.details?.errors || [error.message]);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to save search', 500);
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
        errorResponse(res, 'UNAUTHORIZED', 'User authentication required', 401);
        return;
      }

      const savedSearches = await searchService.getUserSavedSearches(req.user.id);
      successResponse(res, savedSearches);

    } catch (error: any) {
      logger.error('Error in getSavedSearches controller:', error);
      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to get saved searches', 500);
    }
  }
  /**
   * Aggiorna una ricerca salvata
   * PUT /search/saved/:searchId
   */
  async updateSavedSearch(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Verifica autenticazione
      if (!req.user || !req.user.id) {
        errorResponse(res, 'UNAUTHORIZED', 'User authentication required', 401);
        return;
      }

      const { searchId } = req.params;
      const updateData = req.body;

      if (!searchId) {
        errorResponse(res, 'BAD_REQUEST', 'Search ID is required', 400);
        return;
      }

      logger.info('Update saved search request', { 
        searchId, 
        updateData, 
        userId: req.user.id 
      });

      const updatedSearch = await searchService.updateSavedSearch(req.user.id, searchId, updateData);
      successResponse(res, updatedSearch, 'Search updated successfully');

    } catch (error: any) {
      logger.error('Error in updateSavedSearch controller:', error);

      if (error.name === 'NotFoundError') {
        notFoundResponse(res, error.message);
        return;
      }

      if (error.name === 'ValidationError') {
        validationErrorResponse(res, error.details?.errors || [error.message]);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to update search', 500);
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
        errorResponse(res, 'UNAUTHORIZED', 'User authentication required', 401);
        return;
      }

      const { searchId } = req.params;

      if (!searchId) {
        errorResponse(res, 'BAD_REQUEST', 'Search ID is required', 400);
        return;
      }

      logger.info('Delete saved search request', { 
        searchId, 
        userId: req.user.id 
      });

      await searchService.deleteSavedSearch(req.user.id, searchId);
      successResponse(res, { message: 'Search deleted successfully' });

    } catch (error: any) {
      logger.error('Error in deleteSavedSearch controller:', error);

      if (error.name === 'NotFoundError') {
        notFoundResponse(res, error.message);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to delete search', 500);
    }
  }

  /**
   * Ottieni storico ricerche dell'utente
   * GET /search/history
   */
  async getSearchHistory(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Verifica autenticazione
      if (!req.user || !req.user.id) {
        errorResponse(res, 'UNAUTHORIZED', 'User authentication required', 401);
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      logger.info('Get search history request', { 
        page, 
        limit, 
        userId: req.user.id 
      });

      const historyResponse = await searchService.getUserSearchHistory(req.user.id, page, limit);
      successResponse(res, historyResponse);

    } catch (error: any) {
      logger.error('Error in getSearchHistory controller:', error);
      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to get search history', 500);
    }
  }
}

export const searchController = new SearchController();