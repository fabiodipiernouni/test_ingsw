import { Request, Response, NextFunction } from 'express';
import { propertyService } from '../services/PropertyService';
import { AuthenticatedRequest } from '@shared/dto/AuthenticatedRequest';
import { setResponseAsSuccess, setResponseAsError, setResponseAsValidationError, setResponseAsNotFound } from '@shared/utils/helpers';
import logger from '@shared/utils/logger';
import { CreatePropertyRequest } from '@property/dto/CreatePropertyRequest';
import { GetPropertiesCardsRequest } from '@property/dto/GetPropertiesCardsRequest';

export class PropertyController {
  /**
   * Crea una nuova proprietà
   * POST /properties
   */
  async createProperty(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Verifica che l'utente sia autenticato
      if (!req?.user?.id) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User authentication required', 401);
        return;
      }

      // Verifica che l'utente sia un agente
      if (req.user.role !== 'agent') {
        setResponseAsError(res, 'FORBIDDEN', 'Only agents can create properties', 403);
        return;
      }

      const propertyData: CreatePropertyRequest = req.body;
      
      logger.info(`Property creation request from agent ${req.user.id}`, { 
        title: propertyData.title,
        agentId: req.user.id 
      });

      // Crea la proprietà tramite il service
      const result = await propertyService.createProperty(propertyData, req.user.id);

      setResponseAsSuccess(
        res, 
        result.data, 
        result.message,
        201
      );

    } catch (error: any) {
      logger.error('Error in createProperty controller:', error);

      if (error.name === 'ValidationError') {
        setResponseAsValidationError(res, error.details?.errors || [error.message]);
        return;
      }

      if (error.name === 'BadRequestError') {
        setResponseAsError(res, 'BAD_REQUEST', error.message, 400);
        return;
      }

      // Errore generico del server
      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to create property', 500);
    }
  }

  /**
   * Ottiene una proprietà per ID
   * GET /properties/:propertyId
   */
  async getPropertyById(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { propertyId } = req.params;

      if (!propertyId) {
        setResponseAsError(res, 'BAD_REQUEST', 'Property ID is required', 400);
        return;
      }

      const property = await propertyService.getPropertyById(propertyId);

      setResponseAsSuccess(res, property);

    } catch (error: any) {
      logger.error('Error in getPropertyById controller:', error);

      if (error.name === 'NotFoundError') {
        setResponseAsNotFound(res, error.message);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get property', 500);
    }
  }

  /**
   * Lista proprietà con paginazione - logica basata su ruoli
   * POST /properties/cards
   */
  async getPropertiesCardsPost(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    const getPropertiesCardsRequest: GetPropertiesCardsRequest = req.body;

    const page = getPropertiesCardsRequest.pagedRequest?.page || 1;
    const limit = Math.min(getPropertiesCardsRequest.pagedRequest?.limit || 20, 200);
    const sortBy = getPropertiesCardsRequest.pagedRequest?.sortBy || 'createdAt';
    const sortOrder = getPropertiesCardsRequest.pagedRequest?.sortOrder || 'DESC';
    const filters = getPropertiesCardsRequest.filters || {};
    const status = getPropertiesCardsRequest.status;
    const agencyId = getPropertiesCardsRequest.agencyId;
    const geoFilters = getPropertiesCardsRequest.geoFilters;

    try {
      // Chiama il service per ottenere le proprietà
      const result = await propertyService.getPropertiesCards({
        page,
        limit,
        filters,
        geoFilters,
        status,
        agencyId,
        sortBy,
        sortOrder
      });

      setResponseAsSuccess(res, result);
    } catch (error: any) {
      logger.error('Error in getPropertiesCardsPost PropertyController:', error);
      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get properties', 500);
    }
  }


  /**
   * Registra visualizzazione proprietà
   * POST /properties/:propertyId/view
   */
  async recordPropertyView(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { propertyId } = req.params;
      const { source = 'web' } = req.body;

      if (!propertyId) {
        setResponseAsError(res, 'BAD_REQUEST', 'Property ID is required', 400);
        return;
      }

      // TODO: Implementare la logica per registrare la visualizzazione
      // Per ora restituiamo solo un successo
      
      logger.info('Property view recorded', { propertyId, source });
      
      setResponseAsSuccess(res, { message: 'View recorded' });

    } catch (error: any) {
      logger.error('Error in recordPropertyView controller:', error);

      if (error.name === 'NotFoundError') {
        setResponseAsNotFound(res, error.message);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to record view', 500);
    }
  }
}

export const propertyController = new PropertyController();