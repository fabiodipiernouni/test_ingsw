import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@shared/dto/AuthenticatedRequest';
import sharp from 'sharp';
import { propertyService } from '@property/services/PropertyService';

/**
 * Middleware per validare i file immagine caricati
 * Esegue solo controlli formali sui file senza fare upload
 */
export const validateImageFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Ottieni i file da multer
    const files = req.files as Express.Multer.File[] || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No files uploaded',
        message: 'At least one image file is required'
      });
      return;
    }

    // Validazioni per ogni file
    const validationErrors: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Valida il file con Sharp
        const metadata = await sharp(file.buffer).metadata();

        if (!metadata.format) {
          throw new Error('Invalid image file');
        }

        // Formati consentiti
        const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
        if (!allowedFormats.includes(metadata.format)) {
          throw new Error(`Invalid image format: ${metadata.format}. Allowed: ${allowedFormats.join(', ')}`);
        }

        // Verifica dimensioni
        if (!metadata.width || !metadata.height) {
          throw new Error('Unable to read image dimensions');
        }

        if (metadata.width > 10000 || metadata.height > 10000) {
          throw new Error('Image dimensions too large (max 10000x10000)');
        }

        // Previeni decompression bombs
        if (metadata.width * metadata.height > 25000000) {
          throw new Error('Image resolution too high (max 25 megapixels)');
        }

        // Verifica ratio di compressione sospetto
        if (file.buffer.length > 0 && 
            (metadata.width * metadata.height * 4) / file.buffer.length < 0.1) {
          throw new Error('Suspicious compression ratio detected');
        }

        // Valida canali di colore
        if (metadata.channels && metadata.channels > 4) {
          throw new Error('Invalid number of color channels');
        }

        // Aggiungi metadata al file per uso successivo
        (file as any).imageMetadata = {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        };

      } catch (fileError) {
        validationErrors.push({
          file: file.originalname,
          index: i,
          error: fileError instanceof Error ? fileError.message : 'Validation failed'
        });
      }
    }

    // Se ci sono errori, restituiscili
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'File validation failed',
        message: 'One or more files are invalid',
        details: validationErrors
      });
      return;
    }

    // Tutti i file sono validi, procedi
    next();

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to validate image files'
    });
  }
};

/**
 * Middleware per verificare i permessi di upload immagini per una proprietà
 */
export const validatePropertyImageUploadPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;

    // Verifica autenticazione
    if (!authReq?.user?.id) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'User authentication required'
      });
      return;
    }

    // Verifica propertyId
    const propertyId = req.params.propertyId || req.params.id;
    if (!propertyId) {
      res.status(400).json({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Property ID is required'
      });
      return;
    }

    // Verifica formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(propertyId)) {
      res.status(400).json({
        success: false,
        error: 'BAD_REQUEST',
        message: 'Invalid property ID format'
      });
      return;
    }

    // Verifica che l'utente appartenga a un'agenzia
    if (!authReq.user.agencyId) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'User must belong to an agency to upload images'
      });
      return;
    }

    const property = await propertyService.getPropertyById(propertyId);

    const propertyAgencyId = property.agent!.agencyId;

    if (propertyAgencyId !== authReq.user.agencyId) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'User does not have permission to upload images for this property which belongs to a different agency'
      });
      return;
    }

    // Aggiungi propertyId alla request per uso successivo
    (req as any).validatedPropertyId = propertyId;
    (req as any).property = property;

    //pulisci req.params
    delete req.params.propertyId;

    next();

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to validate permissions'
    });
  }
};

