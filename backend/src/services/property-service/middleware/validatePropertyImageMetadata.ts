import { Request, Response, NextFunction } from 'express';
import { validate, ValidatorOptions } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PropertyImageMetadataArray } from '@property/dto/addPropertyImageEndpoint/PropertyImageMetadataArray';
import logger from '@shared/utils/logger';

const validatorOptions: ValidatorOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true
};

/**
 * Middleware per validare i metadata delle immagini delle proprietà
 * Si aspetta un array di metadata nel body della richiesta
 */
export const validatePropertyImageMetadata = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Trasforma il body in un'istanza della classe wrapper
    const metadataWrapper = plainToInstance(PropertyImageMetadataArray, req.body);

    // Esegui la validazione (include tutte le validazioni dei decorator)
    const errors = await validate(metadataWrapper, validatorOptions);

    if (errors.length > 0) {
      const formattedErrors = errors.flatMap(error => {
        const messages: string[] = [];

        if (error.constraints) {
          messages.push(...Object.values(error.constraints));
        }

        // Gestisci errori nested (nell'array)
        if (error.children && error.children.length > 0) {
          error.children.forEach((childError, index) => {
            if (childError.constraints) {
              Object.values(childError.constraints).forEach(msg => {
                messages.push(`metadata[${index}]: ${msg}`);
              });
            }

            // Gestisci errori ancora più nested (nei campi degli oggetti)
            if (childError.children && childError.children.length > 0) {
              childError.children.forEach(nestedError => {
                if (nestedError.constraints) {
                  Object.values(nestedError.constraints).forEach(msg => {
                    messages.push(`metadata[${index}].${nestedError.property}: ${msg}`);
                  });
                }
              });
            }
          });
        }

        return messages;
      });

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'One or more validation errors occurred',
        details: formattedErrors
      });
      return;
    }

    // Verifica che il numero di metadata corrisponda al numero di file
    const files = req.files as Express.Multer.File[] || [];
    const metadata = metadataWrapper.metadata;

    if (metadata.length !== files.length) {
      res.status(400).json({
        success: false,
        error: 'Metadata count mismatch',
        message: `Metadata count (${metadata.length}) must match files count (${files.length})`
      });
      return;
    }

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

