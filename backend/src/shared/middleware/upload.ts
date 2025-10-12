import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import config from '@shared/config';
import { imageService } from '../services/ImageService';
import { Property } from '../database/models/Property';
import { AuthenticatedRequest } from '@shared/dto/AuthenticatedRequest';

// Memory storage for processing before upload to S3
const storage = multer.memoryStorage();

// File filter to validate image types
const fileFilter = (req: Request, file: Express.Multer.File, cb: any) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];

  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG and WebP images are allowed'));
  }

  cb(null, true);
};

// Multer configuration
export const uploadToMemory = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10 // Max 10 images per request
  }
});

/**
 * Middleware to process and upload images to S3
 * Use after multer middleware
 */
export const processAndUploadToS3 = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle both single and multiple file uploads
  const files = req.files as Express.Multer.File[] || (req.file ? [req.file] : []);

  if (!files || files.length === 0) {
    return next();
  }

  try {
    const propertyId = req.params.id || req.params.propertyId;
    
    if (!propertyId) {
      return res.status(400).json({ 
        error: 'Property ID is required for image upload' 
      });
    }

    // Get user's agencyId from authenticated request
    const authReq = req as AuthenticatedRequest;
    const agencyId = authReq.user?.agencyId;

    if (!agencyId) {
      return res.status(400).json({ 
        error: 'User must belong to an agency to upload images' 
      });
    }

    // Fetch property to get listingType and verify ownership
    const property = await Property.findByPk(propertyId, {
      include: [{
        model: (await import('../database/models/User')).User,
        as: 'agent',
        attributes: ['id', 'agencyId']
      }]
    });

    if (!property) {
      return res.status(404).json({ 
        error: 'Property not found' 
      });
    }

    // Verify property belongs to user's agency
    const propertyAgencyId = (property.agent as any)?.agencyId;
    if (propertyAgencyId !== agencyId) {
      return res.status(403).json({ 
        error: 'Property does not belong to your agency' 
      });
    }

    const listingType = property.listingType;
    const uploadResults = [];

    for (const file of files) {
      try {
        // 1. Validate image with Sharp
        const metadata = await sharp(file.buffer).metadata();

        if (!metadata.format) {
          throw new Error('Invalid image file');
        }

        // Enhanced security validations
        const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
        if (!allowedFormats.includes(metadata.format)) {
          throw new Error('Invalid image format detected');
        }

        if (!metadata.width || !metadata.height) {
          throw new Error('Unable to read image dimensions');
        }

        if (metadata.width > 10000 || metadata.height > 10000) {
          throw new Error('Image dimensions too large (max 10000x10000)');
        }

        // Prevent decompression bombs
        if (metadata.width * metadata.height > 25000000) {
          throw new Error('Image resolution too high (max 25 megapixels)');
        }

        // Check suspicious compression ratio
        if (file.buffer.length > 0 && 
            (metadata.width * metadata.height * 4) / file.buffer.length < 0.1) {
          throw new Error('Suspicious compression ratio detected');
        }

        // Validate color channels
        if (metadata.channels && metadata.channels > 4) {
          throw new Error('Invalid number of color channels');
        }

        // 2. Upload to S3 with variants
        const uploadResult = await imageService.uploadImage(
          file.buffer,
          file.originalname,
          file.mimetype,
          propertyId,
          agencyId,
          listingType
        );

        uploadResults.push({
          ...uploadResult,
          originalName: file.originalname,
          metadata: {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format
          }
        });

      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        // Continue with other files, but log the error
        uploadResults.push({
          originalName: file.originalname,
          error: fileError instanceof Error ? fileError.message : 'Processing failed'
        });
      }
    }

    // Add upload results to request for use in route handlers
    (req as any).uploadResults = uploadResults;

    // Check if any uploads succeeded
    const successfulUploads = uploadResults.filter(r => !r.error);
    const failedUploads = uploadResults.filter(r => r.error);

    if (successfulUploads.length === 0) {
      return res.status(400).json({
        error: 'All image uploads failed',
        details: failedUploads
      });
    }

    // If some failed, add warning to response
    if (failedUploads.length > 0) {
      (req as any).uploadWarnings = failedUploads;
    }

    next();

  } catch (error) {
    console.error('Image processing error:', error);

    // Handle timeout error specifically
    if (error instanceof Error && error.message === 'Image processing timeout') {
      return res.status(408).json({ error: 'Image processing took too long' });
    }

    return res.status(500).json({ 
      error: 'Failed to process images',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Middleware to validate image upload request
 */
export const validateImageUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const propertyId = req.params.id || req.params.propertyId;

  if (!propertyId) {
    return res.status(400).json({ 
      error: 'Property ID is required' 
    });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(propertyId)) {
    return res.status(400).json({ 
      error: 'Invalid property ID format generated'
    });
  }

  next();
};

/**
 * Error handler for multer errors
 */
export const handleMulterError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        maxSize: `${config.upload.maxFileSize / 1024 / 1024}MB`
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 10 files per upload'
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected field name',
        message: 'Use "images" field for file uploads'
      });
    }

    return res.status(400).json({
      error: 'Upload error',
      message: err.message
    });
  }

  if (err) {
    return res.status(400).json({
      error: 'Upload error',
      message: err.message || 'Unknown upload error'
    });
  }

  next();
};

/**
 * Cleanup S3 files on error
 */
export const cleanupS3OnError = async (uploadResults: any[]) => {
  if (!uploadResults || uploadResults.length === 0) {
    return;
  }

  const keysToDelete: string[] = [];

  for (const result of uploadResults) {
    if (!result.error) {
      keysToDelete.push(result.originalKey);
      if (result.smallKey) keysToDelete.push(result.smallKey);
      if (result.mediumKey) keysToDelete.push(result.mediumKey);
      if (result.largeKey) keysToDelete.push(result.largeKey);
    }
  }

  if (keysToDelete.length > 0) {
    try {
      await imageService.deleteImage(keysToDelete);
    } catch (error) {
      console.error('Failed to cleanup S3 files:', error);
    }
  }
};
