import express, { Request, Response } from 'express';
import { authenticateToken } from '@shared/middleware/auth';
import { 
  uploadToMemory, 
  processAndUploadToS3, 
  validateImageUpload,
  handleMulterError,
  cleanupS3OnError 
} from '@shared/middleware/upload';
import { propertyService } from '../services/PropertyService';
import logger from '@shared/utils/logger';

const router = express.Router();

/**
 * @swagger
 * /properties/{id}/images:
 *   post:
 *     summary: Upload images for a property
 *     description: Upload one or multiple images to a property. Images are processed and stored in S3 with multiple size variants (small, medium, large).
 *     tags:
 *       - Property Images
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Image files (max 10 files, 10MB each)
 *               captions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional captions for each image
 *     responses:
 *       201:
 *         description: Images uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       fileName:
 *                         type: string
 *                       fileSize:
 *                         type: number
 *                       uploadDate:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Bad request (invalid file, missing property ID, etc.)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not the property owner)
 *       413:
 *         description: File too large
 */
router.post(
  '/:id/images',
  authenticateToken as any,
  validateImageUpload,
  uploadToMemory.array('images', 10),
  handleMulterError,
  processAndUploadToS3,
  async (req: Request, res: Response) => {
    try {
      const propertyId = req.params.id;
      const userId = (req as any).user.id;
      const uploadResults = (req as any).uploadResults;

      if (!uploadResults || uploadResults.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid images were uploaded'
        });
      }

      // Add images to database
      const images = await propertyService.addPropertyImages(
        propertyId,
        uploadResults,
        userId
      );

      // If there were warnings (some uploads failed), include them
      const warnings = (req as any).uploadWarnings;

      return res.status(201).json({
        success: true,
        message: `Successfully uploaded ${images.length} image(s)`,
        data: images.map(img => ({
          id: img.id,
          fileName: img.fileName,
          fileSize: img.fileSize,
          contentType: img.contentType,
          width: img.width,
          height: img.height,
          isPrimary: img.isPrimary,
          order: img.order,
          uploadDate: img.uploadDate
        })),
        warnings: warnings ? warnings.map((w: any) => ({
          fileName: w.originalName,
          error: w.error
        })) : undefined
      });

    } catch (error) {
      logger.error('Error uploading property images:', error);

      // Cleanup uploaded files on error
      const uploadResults = (req as any).uploadResults;
      if (uploadResults) {
        await cleanupS3OnError(uploadResults);
      }

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ success: false, error: error.message });
        }
        if (error.message.includes('permission')) {
          return res.status(403).json({ success: false, error: error.message });
        }
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to upload images'
      });
    }
  }
);

/**
 * @swagger
 * /properties/{id}/images:
 *   get:
 *     summary: Get all images for a property
 *     description: Retrieve all images associated with a property, including pre-signed URLs for all size variants.
 *     tags:
 *       - Property Images
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     responses:
 *       200:
 *         description: Images retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: Property not found
 */
router.get(
  '/:id/images',
  async (req: Request, res: Response) => {
    try {
      const propertyId = req.params.id;

      const images = await propertyService.getPropertyImages(propertyId);

      return res.json({
        success: true,
        data: images
      });

    } catch (error) {
      logger.error('Error getting property images:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ success: false, error: error.message });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve images'
      });
    }
  }
);

/**
 * @swagger
 * /images/{id}:
 *   delete:
 *     summary: Delete an image
 *     description: Delete a specific image from a property. Only the property owner can delete images.
 *     tags:
 *       - Property Images
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not the property owner)
 *       404:
 *         description: Image not found
 */
router.delete(
  '/images/:id',
  authenticateToken as any,
  async (req: Request, res: Response) => {
    try {
      const imageId = req.params.id;
      const userId = (req as any).user.id;

      await propertyService.deletePropertyImage(imageId, userId);

      return res.json({
        success: true,
        message: 'Image deleted successfully'
      });

    } catch (error) {
      logger.error('Error deleting property image:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ success: false, error: error.message });
        }
        if (error.message.includes('permission')) {
          return res.status(403).json({ success: false, error: error.message });
        }
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to delete image'
      });
    }
  }
);

/**
 * @swagger
 * /images/{id}/primary:
 *   put:
 *     summary: Set an image as primary
 *     description: Set a specific image as the primary image for its property. Only one image can be primary per property.
 *     tags:
 *       - Property Images
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Image ID
 *     responses:
 *       200:
 *         description: Image set as primary successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not the property owner)
 *       404:
 *         description: Image not found
 */
router.put(
  '/images/:id/primary',
  authenticateToken as any,
  async (req: Request, res: Response) => {
    try {
      const imageId = req.params.id;
      const userId = (req as any).user.id;

      const image = await propertyService.setPrimaryImage(imageId, userId);

      return res.json({
        success: true,
        message: 'Image set as primary',
        data: {
          id: image.id,
          isPrimary: image.isPrimary
        }
      });

    } catch (error) {
      logger.error('Error setting primary image:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ success: false, error: error.message });
        }
        if (error.message.includes('permission')) {
          return res.status(403).json({ success: false, error: error.message });
        }
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to set primary image'
      });
    }
  }
);

/**
 * @swagger
 * /images/{id}:
 *   patch:
 *     summary: Update image metadata
 *     description: Update caption, alt text, or order of an image. Only the property owner can update images.
 *     tags:
 *       - Property Images
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Image ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               caption:
 *                 type: string
 *                 maxLength: 500
 *               alt:
 *                 type: string
 *                 maxLength: 255
 *               order:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Image metadata updated successfully
 *       400:
 *         description: Bad request (validation error)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not the property owner)
 *       404:
 *         description: Image not found
 */
router.patch(
  '/images/:id',
  authenticateToken as any,
  async (req: Request, res: Response) => {
    try {
      const imageId = req.params.id;
      const userId = (req as any).user.id;
      const { caption, alt, order } = req.body;

      // Validate inputs
      if (caption !== undefined && caption.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Caption must be 500 characters or less'
        });
      }

      if (alt !== undefined && alt.length > 255) {
        return res.status(400).json({
          success: false,
          error: 'Alt text must be 255 characters or less'
        });
      }

      if (order !== undefined && (order < 0 || !Number.isInteger(order))) {
        return res.status(400).json({
          success: false,
          error: 'Order must be a non-negative integer'
        });
      }

      const image = await propertyService.updateImageMetadata(
        imageId,
        userId,
        { caption, alt, order }
      );

      return res.json({
        success: true,
        message: 'Image metadata updated',
        data: {
          id: image.id,
          caption: image.caption,
          alt: image.alt,
          order: image.order
        }
      });

    } catch (error) {
      logger.error('Error updating image metadata:', error);

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({ success: false, error: error.message });
        }
        if (error.message.includes('permission')) {
          return res.status(403).json({ success: false, error: error.message });
        }
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to update image metadata'
      });
    }
  }
);

/**
 * @swagger
 * /admin/agency-storage:
 *   get:
 *     summary: Get storage usage for current agency
 *     description: Returns storage usage statistics for the authenticated user's agency
 *     tags:
 *       - Admin - Agency Images
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage usage retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: User not associated with an agency
 */
router.get(
  '/admin/agency-storage',
  authenticateToken as any,
  async (req: Request, res: Response) => {
    try {
      const agencyId = (req as any).user.agencyId;

      if (!agencyId) {
        return res.status(403).json({
          success: false,
          error: 'User must belong to an agency'
        });
      }

      const { imageService } = await import('@shared/services/ImageService');
      const storageUsage = await imageService.getAgencyStorageUsage(agencyId);

      return res.status(200).json({
        success: true,
        data: {
          agencyId,
          ...storageUsage,
          totalSizeMB: (storageUsage.totalSize / (1024 * 1024)).toFixed(2),
          byListingType: {
            sale: {
              ...storageUsage.byListingType.sale,
              sizeMB: (storageUsage.byListingType.sale.size / (1024 * 1024)).toFixed(2)
            },
            rent: {
              ...storageUsage.byListingType.rent,
              sizeMB: (storageUsage.byListingType.rent.size / (1024 * 1024)).toFixed(2)
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error getting agency storage usage:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get agency storage usage'
      });
    }
  }
);

/**
 * @swagger
 * /admin/agency-properties:
 *   get:
 *     summary: List all properties with images for current agency
 *     description: Returns a list of property IDs that have images in S3
 *     tags:
 *       - Admin - Agency Images
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: listingType
 *         schema:
 *           type: string
 *           enum: [sale, rent]
 *         description: Filter by listing type
 *     responses:
 *       200:
 *         description: Properties list retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/admin/agency-properties',
  authenticateToken as any,
  async (req: Request, res: Response) => {
    try {
      const agencyId = (req as any).user.agencyId;
      const listingType = req.query.listingType as 'sale' | 'rent' | undefined;

      if (!agencyId) {
        return res.status(403).json({
          success: false,
          error: 'User must belong to an agency'
        });
      }

      const { imageService } = await import('@shared/services/ImageService');
      const propertyIds = await imageService.listAgencyProperties(agencyId, listingType);

      return res.status(200).json({
        success: true,
        data: {
          agencyId,
          listingType: listingType || 'all',
          count: propertyIds.length,
          propertyIds
        }
      });
    } catch (error) {
      logger.error('Error listing agency properties:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to list agency properties'
      });
    }
  }
);

export default router;
