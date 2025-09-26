import { Request, Response, NextFunction } from 'express';
import { propertyService } from '../services/PropertyService';
import { PropertyCreateRequest } from '../models/types';
import { AuthenticatedRequest } from '@shared/types/common.types';
import { successResponse, errorResponse, validationErrorResponse, notFoundResponse } from '@shared/utils/helpers';
import logger from '@shared/utils/logger';

export class PropertyController {
  /**
   * Crea una nuova proprietà
   * POST /properties
   */
  async createProperty(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Verifica che l'utente sia autenticato
      if (!req.user || !req.user.id) {
        errorResponse(res, 'UNAUTHORIZED', 'User authentication required', 401);
        return;
      }

      // Verifica che l'utente sia un agente
      if (req.user.role !== 'agent') {
        errorResponse(res, 'FORBIDDEN', 'Only agents can create properties', 403);
        return;
      }

      const propertyData: PropertyCreateRequest = req.body;
      
      logger.info(`Property creation request from agent ${req.user.id}`, { 
        title: propertyData.title,
        agentId: req.user.id 
      });

      // Crea la proprietà tramite il service
      const result = await propertyService.createProperty(propertyData, req.user.id);

      successResponse(
        res, 
        result.data, 
        result.message,
        201
      );

    } catch (error: any) {
      logger.error('Error in createProperty controller:', error);

      if (error.name === 'ValidationError') {
        validationErrorResponse(res, error.details?.errors || [error.message]);
        return;
      }

      if (error.name === 'BadRequestError') {
        errorResponse(res, 'BAD_REQUEST', error.message, 400);
        return;
      }

      // Errore generico del server
      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to create property', 500);
    }
  }

  /**
   * Ottiene una proprietà per ID
   * GET /properties/:propertyId
   */
  async getPropertyById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { propertyId } = req.params;

      if (!propertyId) {
        errorResponse(res, 'BAD_REQUEST', 'Property ID is required', 400);
        return;
      }

      const property = await propertyService.getPropertyById(propertyId);

      successResponse(res, property);

    } catch (error: any) {
      logger.error('Error in getPropertyById controller:', error);

      if (error.name === 'NotFoundError') {
        notFoundResponse(res, error.message);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to get property', 500);
    }
  }

  /**
   * Lista proprietà con paginazione
   * GET /properties
   */
  async getProperties(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const agentId = req.query.agentId as string;

      // TODO: Implementare la logica di listing con paginazione
      // Per ora restituiamo una lista vuota come placeholder
      const result = {
        properties: [],
        totalCount: 0,
        currentPage: page,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      };

      successResponse(res, result);

    } catch (error: any) {
      logger.error('Error in getProperties controller:', error);
      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to get properties', 500);
    }
  }

  /**
   * Registra visualizzazione proprietà
   * POST /properties/:propertyId/view
   */
  async recordPropertyView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { propertyId } = req.params;
      const { source = 'web' } = req.body;

      if (!propertyId) {
        errorResponse(res, 'BAD_REQUEST', 'Property ID is required', 400);
        return;
      }

      // TODO: Implementare la logica per registrare la visualizzazione
      // Per ora restituiamo solo un successo
      
      logger.info(`Property view recorded`, { propertyId, source });
      
      successResponse(res, { message: 'View recorded' });

    } catch (error: any) {
      logger.error('Error in recordPropertyView controller:', error);

      if (error.name === 'NotFoundError') {
        notFoundResponse(res, error.message);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to record view', 500);
    }
  }
}

export const propertyController = new PropertyController();