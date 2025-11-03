import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { UpdatePropertyRequest } from '@property/dto/UpdatePropertyEndpoint/UpdatePropertyRequest';
import { setResponseAsValidationError } from '@shared/utils/helpers';
import { isValidGeoJSONPoint } from '@shared/types/geojson.types';
import logger from '@shared/utils/logger';

/**
 * Middleware per validare i dati di aggiornamento proprietà
 * Valida solo i campi presenti nel body (skipMissingProperties: true)
 */
export const validatePropertyUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Trasforma il body in istanza del DTO
    const updateData = plainToInstance(UpdatePropertyRequest, req.body, {
      enableImplicitConversion: true
    });

    // Valida solo i campi presenti (skipMissingProperties: true è fondamentale per PATCH)
    const errors = await validate(updateData, {
      skipMissingProperties: true, // ⭐ Non valida campi undefined/null
      whitelist: true,              // Rimuove campi non decorati
      forbidNonWhitelisted: true    // Errore se ci sono campi sconosciuti
    });

    const strErrors: string[] = [];

    // Funzione ricorsiva per estrarre tutti i messaggi di errore (inclusi nested)
    const extractErrors = (validationErrors: ValidationError[]): string[] => {
      const messages: string[] = [];
      for (const error of validationErrors) {
        if (error.constraints) {
          messages.push(...Object.values(error.constraints) as string[]);
        }
        if (error.children && error.children.length > 0) {
          const childErrors = extractErrors(error.children);
          messages.push(...childErrors.map(msg => `${error.property}.${msg}`));
        }
      }
      return messages;
    };

    if (errors.length > 0) {
      strErrors.push(...extractErrors(errors));
    }

    // Validazione location (GeoJSON Point) - solo se presente e non ci sono già errori
    const hasLocationError = errors.some(err => err.property === 'location');
    if (updateData.location && !hasLocationError && !isValidGeoJSONPoint(updateData.location)) {
      strErrors.push(
        'Location must be a valid GeoJSON Point with coordinates [longitude, latitude]'
      );
    }

    // Se ci sono errori, restituisce una risposta di errore
    if (strErrors.length > 0) {
      logger.debug('Property update validation failed', {
        errors: strErrors,
        body: req.body
      });
      setResponseAsValidationError(res, strErrors);
      return;
    }

    // Verifica che almeno un campo sia presente
    const hasAtLeastOneField = Object.keys(req.body).length > 0;
    if (!hasAtLeastOneField) {
      setResponseAsValidationError(res, ['At least one field must be provided for update']);
      return;
    }

    logger.debug('Property update validation successful', {
      fieldsToUpdate: Object.keys(req.body)
    });

    // Sostituisci il body con l'oggetto validato
    req.body = updateData;

    next();
  } catch (error) {
    logger.error('Error in validatePropertyUpdate:', error);
    setResponseAsValidationError(res, ['Failed to validate update data']);
  }
};

