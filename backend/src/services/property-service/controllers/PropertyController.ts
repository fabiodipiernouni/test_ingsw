import { Request, Response, NextFunction } from 'express';
import { propertyService } from '../services/PropertyService';
import { AuthenticatedRequest } from '@shared/dto/AuthenticatedRequest';
import { setResponseAsSuccess, setResponseAsError, setResponseAsValidationError, setResponseAsNotFound } from '@shared/utils/helpers';
import logger from '@shared/utils/logger';
import { CreatePropertyRequest } from '@property/dto/CreatePropertyRequestEndpoint/CreatePropertyRequest';
import { GetPropertiesCardsRequest } from '@property/dto/GetPropertiesCardsRequest';
import { GetGeoPropertiesCardsRequest } from '@property/dto/GetGeoPropertiesCardsRequest';
import { AddPropertyImageRequest } from '@property/dto/addPropertyImageEndpoint/AddPropertyImageRequest';

export class PropertyController {
  /**
   * Crea una nuova proprietà
   * POST /properties
   */
  async createProperty(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      // authenticateToken middleware garantisce che req.user sia sempre presente
      const propertyData: CreatePropertyRequest = req.body;

      logger.info(`Property creation request from agent ${req.user!.id}`, {
        title: propertyData.title,
        agentId: req.user!.id
      });

      // Crea la proprietà tramite il service
      const result = await propertyService.createProperty(propertyData, req.user!.id);

      setResponseAsSuccess(
        res,
        result.data,
        result.message,
        201
      );

    } catch (error) {
      logger.error('Error in createProperty controller:', error);

      const err = error as Error & { name?: string; details?: { errors?: string[] }; message: string };

      if (err.name === 'ValidationError') {
        setResponseAsValidationError(res, err.details?.errors || [err.message]);
        return;
      }

      if (err.name === 'BadRequestError') {
        setResponseAsError(res, 'BAD_REQUEST', err.message, 400);
        return;
      }

      // Errore generico del server
      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to create property', 500);
    }
  }

  async getPropertiesByIdList(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { ids, sortBy, sortOrder } = req.body as { ids: string[], sortBy: string, sortOrder: 'ASC' | 'DESC' };

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        setResponseAsError(res, 'BAD_REQUEST', 'IDs list is required', 400);
        return;
      }

      const properties = await propertyService.getPropertiesCardsByIdList({ ids, sortBy, sortOrder });
      setResponseAsSuccess(res, properties);

    } catch (error) {
      logger.error('Error in getPropertiesByIdList controller:', error);
      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get properties by ID list', 500);
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

    } catch (error) {
      logger.error('Error in getPropertyById controller:', error);

      const err = error as Error & { name?: string; message: string };

      if (err.name === 'NotFoundError') {
        setResponseAsNotFound(res, err.message);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get property', 500);
    }
  }

  async getGeoPropertiesCardsPost(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    const getGeoPropertiesCardsRequest: GetGeoPropertiesCardsRequest = req.body;

    try {
      const result = await propertyService.getGeoPropertiesCardsV1({
        filters: getGeoPropertiesCardsRequest.filters,
        geoFilters: getGeoPropertiesCardsRequest.geoFilters,
        status: getGeoPropertiesCardsRequest.status,
        agencyId: getGeoPropertiesCardsRequest.agencyId,
        agentId: getGeoPropertiesCardsRequest.agentId,
        sortBy: getGeoPropertiesCardsRequest.sortBy,
        sortOrder: getGeoPropertiesCardsRequest.sortOrder
      });

      setResponseAsSuccess(res, result);
    } catch (error) {
      logger.error('Error in getGeoPropertiesCardsPost PropertyController:', error);
      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get properties (geo)', 500);
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
    const agentId = getPropertiesCardsRequest.agentId;
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
        agentId,
        sortBy,
        sortOrder
      });

      setResponseAsSuccess(res, result);
    } catch (error) {
      logger.error('Error in getPropertiesCardsPost PropertyController:', error);
      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get properties', 500);
    }
  }

  /**
   * Upload immagini per una proprietà
   * POST /properties/:propertyId/images
   *
   * Nota: Tutti i controlli di validazione sono gestiti dai middleware.
   * Questo metodo contiene solo la logica di business.
   */
  async addPropertyImagePost(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      // authenticateToken middleware garantisce che req.user sia sempre presente
      const propertyImageRequest = req.body as AddPropertyImageRequest;
      const propertyId = req.params.propertyId;
      const userId = req.user!.id;

      logger.info(`Adding ${propertyImageRequest.propertyImages.length} images to property ${propertyId}`, {
        userId,
        propertyId,
        fileCount: propertyImageRequest.propertyImages.length
      });

      // Estrai i file caricati da req.files
      const files = propertyImageRequest.propertyImages.map(img => img.file);
      const metadata = propertyImageRequest.propertyImages.map(img => img.metadata);

      // Chiama il service che gestirà l'upload e il salvataggio
      const result = await propertyService.addPropertyImages(
        propertyId,
        files,
        metadata,
        userId
      );

      setResponseAsSuccess(
        res,
        result,
        `Successfully uploaded ${result.images.length} image(s)`,
        201
      );

    } catch (error) {
      logger.error('Error in addPropertyImagePost controller:', error);

      const err = error as Error & { name?: string; details?: { errors?: string[] }; message: string };

      if (err.name === 'NotFoundError') {
        setResponseAsNotFound(res, err.message);
        return;
      }

      if (err.name === 'ValidationError') {
        setResponseAsValidationError(res, err.details?.errors || [err.message]);
        return;
      }

      if (err.message?.includes('permission')) {
        setResponseAsError(res, 'FORBIDDEN', err.message, 403);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to upload images', 500);
    }
  }
}

export const propertyController = new PropertyController();

