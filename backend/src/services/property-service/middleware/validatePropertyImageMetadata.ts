import { Request, Response, NextFunction } from 'express';
import { validate, ValidatorOptions } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import logger from '@shared/utils/logger';
import { AddPropertyImageRequest } from '@property/dto/addPropertyImageEndpoint';
import { PropertyImageFileRequest } from '@property/dto/addPropertyImageEndpoint/PropertyImageFileRequest';
import { PropertyImageMetadata } from '@property/dto/addPropertyImageEndpoint/PropertyImageMetadata';

const validatorOptions: ValidatorOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true
};

/**
 * Middleware per validare i metadata delle immagini delle proprietà
 * Combina i file caricati da Multer (req.files) con i metadata dal body (req.body.metadata)
 * e crea la struttura DTO AddPropertyImageRequest
 */
export const validatePropertyImageMetadata = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Recupera i file caricati da Multer
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'No files uploaded',
        details: ['At least one image file is required']
      });
      return;
    }

    // Recupera i metadata dal body
    let metadata: any[];
    try {
      // Se metadata è una stringa JSON, parsala
      if (typeof req.body.metadata === 'string') {
        metadata = JSON.parse(req.body.metadata);
      } else if (Array.isArray(req.body.metadata)) {
        metadata = req.body.metadata;
      } else {
        throw new Error('metadata must be an array');
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Invalid metadata format',
        details: ['metadata must be a valid JSON array']
      });
      return;
    }

    // Verifica che il numero di metadata corrisponda al numero di file
    if (metadata.length !== files.length) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Metadata count mismatch',
        details: [`Expected ${files.length} metadata objects, got ${metadata.length}`]
      });
      return;
    }

    // Combina file e metadata in PropertyImageFileRequest
    const propertyImages: PropertyImageFileRequest[] = files.map((file, index) => {
      // Crea un'istanza di PropertyImageMetadata dal singolo oggetto
      const metadataObj = metadata[index];
      const imageMetadata = Object.assign(new PropertyImageMetadata(
        metadataObj.isPrimary,
        metadataObj.order,
        metadataObj.caption,
        metadataObj.altText
      ), metadataObj);

      return new PropertyImageFileRequest(file, imageMetadata);
    });

    // Crea l'oggetto AddPropertyImageRequest
    const requestBody: AddPropertyImageRequest = plainToInstance(AddPropertyImageRequest, {
      propertyImages
    });

    // Esegui la validazione (include tutte le validazioni dei decorator)
    const errors = await validate(requestBody, validatorOptions);

    if (errors.length > 0) {
      // Estrai tutti i messaggi di errore, inclusi quelli nested
      const extractErrors = (validationErrors: any[]): string[] => {
        const messages: string[] = [];
        for (const error of validationErrors) {
          if (error.constraints) {
            messages.push(...(Object.values(error.constraints) as string[]));
          }
          if (error.children && error.children.length > 0) {
            messages.push(...extractErrors(error.children));
          }
        }
        return messages;
      };

      const formattedErrors = extractErrors(errors);

      logger.warn('Property image metadata validation failed', {
        errors: formattedErrors,
        fileCount: files.length,
        metadataCount: metadata.length
      });

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'One or more validation errors occurred',
        details: formattedErrors
      });
      return;
    }

    // Sostituisci req.body con l'oggetto validato
    req.body = requestBody;

    logger.debug('Property image metadata validated successfully', {
      fileCount: files.length,
      metadata: metadata
    });

    // Tutto ok, procedi
    next();

  } catch (error) {
    logger.error('Error in validatePropertyImageMetadata middleware:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to validate image metadata'
    });
  }
};

