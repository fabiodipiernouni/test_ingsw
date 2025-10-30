import { Request, Response, NextFunction } from 'express';
import { setResponseAsValidationError } from '@shared/utils/helpers';
import { isValidGeoJSONPoint } from '@shared/types/geojson.types';
import { CreatePropertyRequest } from '@property/dto/CreatePropertyRequestEndpoint/CreatePropertyRequest';
import { ApiResponse } from '@shared/dto/ApiResponse';
import { validate } from 'class-validator';
import logger from '@shared/utils/logger';
import { plainToInstance } from 'class-transformer';
import { GetPropertiesCardsRequest } from '@property/dto/GetPropertiesCardsRequest';

export class PropertiesMiddlewareValidation {
  /**
   * Middleware per validare i dati di creazione proprietà
   */
  static async validatePropertyCreate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const data: CreatePropertyRequest = plainToInstance(CreatePropertyRequest, req.body);
    const errors = await validate(data);
    const str_errors: Array<string> = [];

    // Validazione location (GeoJSON Point)
    if (!isValidGeoJSONPoint(data.location)) {
      str_errors.push(
        'Location must be a valid GeoJSON Point with coordinates [longitude, latitude]'
      );
    }

    // Se ci sono errori, restituisce una risposta di errore
    if (errors.length > 0) {
      str_errors.push(...errors.map(err => Object.values(err.constraints || {}).join(', ')));
      setResponseAsValidationError(res, str_errors);
      return;
    }

    // Se tutto ok, continua con il prossimo middleware
    next();
  }

  /**
   * Middleware per validare l'UUID del parametro propertyId
   */
  static validatePropertyId(req: Request, res: Response, next: NextFunction): void {
    const { propertyId } = req.params;

    // Regex per validare UUID v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!propertyId || !uuidRegex.test(propertyId)) {
      setResponseAsValidationError(res, ['Invalid property ID format 1']);
      return;
    }

    next();
  }

  /**
   * DTO for property search filters
   * @param req
   * @param res
   * @param next
   */
  static async validatePropertySearchFilters(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = plainToInstance(GetPropertiesCardsRequest, req.body, {
        enableImplicitConversion: true,
        excludeExtraneousValues: false
      });

      const errors = await validate(filters);

      if (errors.length > 0) {
        // Log dettagliato per debug
        logger.debug('Validation errors details:', {
          errors: errors.map(err => ({
            property: err.property,
            value: err.value,
            constraints: err.constraints,
            children: err.children
          })),
          originalBody: req.body,
          transformedObject: filters
        });

        const formattedErrors = errors.map(err => {
          const collectErrors = (error: any): string[] => {
            const msgs: string[] = [];
            if (error.constraints) {
              msgs.push(...(Object.values(error.constraints) as string[]));
            }
            if (error.children && error.children.length > 0) {
              error.children.forEach((child: any) => {
                const childMsgs = collectErrors(child);
                msgs.push(...childMsgs.map(msg => `${error.property}.${child.property}: ${msg}`));
              });
            }
            return msgs;
          };

          return {
            field: err.property,
            errors: collectErrors(err)
          };
        });

        const response: ApiResponse<never> = {
          success: false,
          message: 'Validazione filtri fallita',
          error: 'VALIDATION_ERROR',
          timestamp: new Date(),
          details: formattedErrors.flatMap(e => e.errors),
          path: res.req?.originalUrl || ''
        };

        return res.status(400).json(response);
      }

      req.body = filters; // Sostituisci con l'oggetto validato
      next();
    } catch (error) {
      logger.error('Error in validatePropertySearchFilters:', error);
      const response: ApiResponse<never> = {
        success: false,
        message: 'Errore durante la validazione',
        error: 'VALIDATION_ERROR',
        timestamp: new Date(),
        path: res.req?.originalUrl || ''
      };
      return res.status(500).json(response);
    }
  }
}