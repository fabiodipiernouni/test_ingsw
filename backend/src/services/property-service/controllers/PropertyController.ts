import { Request, Response, NextFunction } from 'express';
import { propertyService } from '../services/PropertyService';
import { AuthenticatedRequest } from '@shared/types/common.types';
import { setResponseAsSuccess, setResponseAsError, setResponseAsValidationError, setResponseAsNotFound } from '@shared/utils/helpers';
import logger from '@shared/utils/logger';
import { CreatePropertyRequest } from '@property/dto/CreatePropertyRequest';

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
   * GET /properties/cards
   */
  async getPropertiesCards(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const page = Number.parseInt(req.query.page as string) || 1;
      const limit = Math.min(Number.parseInt(req.query.limit as string) || 20, 100);
      const status = req.query.status as string;
      const requestedAgentId = req.query.agentId as string;

      // Determina filtri basati sul ruolo dell'utente
      let filters: any = {};

      if (!req.user || req.user.role === 'client') {
        // UTENTI NON AUTENTICATI e CLIENTI: Solo proprietà pubbliche e attive
        filters = {
          status: 'active',
          isActive: true
        };
        logger.info('Properties list request - public access', { 
          userId: req.user?.id || 'anonymous' 
        });
        
      } else {
        const userRole = req.user.role;
        const userId = req.user.id;

        switch (userRole) {

          case 'agent':
            // AGENTI: Solo le proprie proprietà (tutte) + possibilità di vedere solo attive se specificato
            filters = {
              agentId: userId
            };
            
            // Gli agenti possono filtrare per status se vogliono
            if (status) {
              filters.status = status;
            }
            
            logger.info('Properties list request - agent (own properties)', { userId, status });
            break;

          case 'admin':
            // ADMIN: Solo proprietà della propria agenzia
            if (!req.user.agencyId) {
              setResponseAsError(res, 'FORBIDDEN', 'Admin must be associated with an agency', 403);
              return;
            }
            
            // Gli admin vedono solo proprietà degli agenti della loro agenzia
            filters.agencyId = req.user.agencyId;
            
            // Possono filtrare per agente specifico (solo della loro agenzia)
            if (requestedAgentId) {
              filters.specificAgentId = requestedAgentId;
            }
            if (status) {
              filters.status = status;
            }
            
            logger.info('Properties list request - admin (agency scope)', { 
              userId, 
              agencyId: req.user.agencyId,
              requestedAgentId, 
              status 
            });
            break;

          default:
            setResponseAsError(res, 'FORBIDDEN', 'Invalid user role', 403);
            return;
        }
      }

      // Chiama il service per ottenere le proprietà
      const result = await propertyService.getPropertiesCards({
        page,
        limit,
        filters
      });

      setResponseAsSuccess(res, result);

    } catch (error: any) {
      logger.error('Error in getPropertiesCards PropertyController:', error);
      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get properties', 500);
    }
  }

  /**
   * Lista proprietà con paginazione - logica basata su ruoli
   * GET /properties
   */
  /*async getProperties(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const status = req.query.status as string;
      const requestedAgentId = req.query.agentId as string;

      // Determina filtri basati sul ruolo dell'utente
      let filters: any = {};

      if (!req.user || req.user.role === 'client') {
        // UTENTI NON AUTENTICATI e CLIENTI: Solo proprietà pubbliche e attive
        filters = {
          status: 'active',
          isActive: true
        };
        logger.info('Properties list request - public access', { 
          userId: req.user?.id || 'anonymous' 
        });
        
      } else {
        const userRole = req.user.role;
        const userId = req.user.id;

        switch (userRole) {

          case 'agent':
            // AGENTI: Solo le proprie proprietà (tutte) + possibilità di vedere solo attive se specificato
            filters = {
              agentId: userId
            };
            
            // Gli agenti possono filtrare per status se vogliono
            if (status) {
              filters.status = status;
            }
            
            logger.info('Properties list request - agent (own properties)', { userId, status });
            break;

          case 'admin':
            // ADMIN: Solo proprietà della propria agenzia
            if (!req.user.agencyId) {
              errorResponse(res, 'FORBIDDEN', 'Admin must be associated with an agency', 403);
              return;
            }
            
            // Gli admin vedono solo proprietà degli agenti della loro agenzia
            filters.agencyId = req.user.agencyId;
            
            // Possono filtrare per agente specifico (solo della loro agenzia)
            if (requestedAgentId) {
              filters.specificAgentId = requestedAgentId;
            }
            if (status) {
              filters.status = status;
            }
            
            logger.info('Properties list request - admin (agency scope)', { 
              userId, 
              agencyId: req.user.agencyId,
              requestedAgentId, 
              status 
            });
            break;

          default:
            errorResponse(res, 'FORBIDDEN', 'Invalid user role', 403);
            return;
        }
      }

      // Chiama il service per ottenere le proprietà
      const result = await propertyService.getProperties({
        page,
        limit,
        filters
      });

      successResponse(res, result);

    } catch (error: any) {
      logger.error('Error in getProperties controller:', error);
      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to get properties', 500);
    }
  }*/

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