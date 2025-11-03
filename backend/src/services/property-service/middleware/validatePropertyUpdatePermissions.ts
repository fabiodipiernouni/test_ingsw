import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@shared/dto/AuthenticatedRequest';
import { Property } from '@shared/database/models/Property';
import { setResponseAsError, setResponseAsNotFound } from '@shared/utils/helpers';
import logger from '@shared/utils/logger';

/**
 * Middleware per validare i permessi di aggiornamento di una proprietà
 *
 * Verifica:
 * 1. PropertyId è un UUID v4 valido
 * 2. La proprietà esiste
 * 3. L'utente autenticato è il proprietario (agentId)
 *
 * Se tutto ok, pre-carica la proprietà in req.property per evitare query duplicate
 */
export const validatePropertyUpdatePermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const authReq = req as AuthenticatedRequest;

    // Verifica formato UUID v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      setResponseAsError(res, 'BAD_REQUEST', 'Invalid property ID format', 400);
      return;
    }

    // Verifica esistenza proprietà
    const property = await Property.findByPk(propertyId);

    if (!property) {
      setResponseAsNotFound(res, 'Property not found');
      return;
    }

    // Verifica ownership - solo l'agente proprietario può modificare
    if (property.agentId !== authReq.user!.id) {
      setResponseAsError(
        res,
        'FORBIDDEN',
        'You do not have permission to update this property',
        403
      );
      return;
    }

    // Pre-carica la proprietà per evitare query duplicate nel controller
    (req as any).property = property;

    logger.debug('Property update permissions validated', {
      propertyId,
      userId: authReq.user!.id
    });

    next();
  } catch (error) {
    logger.error('Error in validatePropertyUpdatePermissions:', error);
    setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to validate permissions', 500);
  }
};

