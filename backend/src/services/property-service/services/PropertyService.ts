import { Property, PropertyImage } from '@shared/database/models';
import logger from '@shared/utils/logger';
import { imageService } from '@shared/services/ImageService';
import config from '@shared/config';
import { PropertyCardDto } from '@property/dto/PropertyCardDto';
import { CreatePropertyRequest } from '@property/dto/CreatePropertyRequest';
import { CreatePropertyResponse } from '@property/dto/CreatePropertyResponse';
import { PropertyModel } from '@property/models/PropertyModel';
import { isValidGeoJSONPoint } from '@shared/types/geojson.types';
import { Helper } from '@services/property-service/utils/helper';

// Custom error classes for better error handling
class ValidationError extends Error {
  public details: any;
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class PropertyService {
  /**
   * Crea una nuova proprietà
   */
  async createProperty(propertyData: CreatePropertyRequest, agentId: string): Promise<CreatePropertyResponse> {
    try {
      logger.info(`Creating property for agent ${agentId}`, { title: propertyData.title });

      // Validazione base dei dati
      this.validatePropertyData(propertyData);

      // Normalizza features: lowercase e trim
      const normalizedFeatures = propertyData.features
        ? propertyData.features.map(f => f.trim().toLowerCase())
        : undefined;

      // Crea la proprietà nel database
      const property = await Property.create({
        ...propertyData,
        // Address fields
        street: propertyData.address.street,
        city: propertyData.address.city,
        province: propertyData.address.province,
        zipCode: propertyData.address.zipCode,
        country: propertyData.address.country || 'Italy',
        // Location field (GeoJSON)
        location: propertyData.location,
        // Normalized features
        features: normalizedFeatures,
        // Agent
        agentId: agentId,
        // Defaults
        status: 'active',
        isActive: true,
        views: 0,
        favorites: 0,
        hasElevator: propertyData.hasElevator || false,
        hasBalcony: propertyData.hasBalcony || false,
        hasGarden: propertyData.hasGarden || false,
        hasParking: propertyData.hasParking || false
      });

      // Carica la proprietà creata con le associazioni
      const createdProperty = await this.getPropertyById(property.id);

      logger.info('Property created successfully', { propertyId: property.id });

      return {
        success: true,
        data: createdProperty,
        message: 'Property created successfully'
      };

    } catch (error) {
      logger.error('Error creating property:', error);
      
      if (error instanceof ValidationError || error instanceof BadRequestError) {
        throw error;
      }
      
      throw new Error('Failed to create property');
    }
  }

  /**
   * Formatta la risposta della proprietà per l'API
   */
  private async formatPropertyCardResponse(property: Property): Promise<PropertyCardDto> {
    // Generate signed URLs for images
    const imagesWithUrls = await Promise.all(
      (property.images || []).map(async (image) => {
        // If image has S3 keys, generate signed URLs using getImageVariants()
        if (image.s3KeyOriginal) {
          const variants = image.getImageVariants();
          const urls = await imageService.getImageUrls(variants);

          return {
            id: image.id,
            fileName: image.fileName,
            contentType: image.contentType,
            fileSize: image.fileSize,
            width: image.width,
            height: image.height,
            caption: image.caption,
            alt: image.alt,
            isPrimary: image.isPrimary,
            order: image.order,
            uploadDate: image.uploadDate,
            urls
          };
        }
        return undefined; // Should not happen since all images should have S3 keys
      })
    );

    return {
      id: property.id,
      title: property.title,
      description: property.description,
      price: property.price,
      propertyType: property.propertyType,
      listingType: property.listingType,
      status: property.status,
      rooms: property.rooms,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      floor: property.floor,
      city: property.city,
      province: property.province,
      primaryImage: imagesWithUrls.find(img => img?.isPrimary),
      energyClass: property.energyClass,
      hasElevator: property.hasElevator,
      hasBalcony: property.hasBalcony,
      hasGarden: property.hasGarden,
      hasParking: property.hasParking,
      //images: imagesWithUrls as any,
      agentId: property.agentId,
      views: property.views,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString()
    };
  }

  /**
   * Ottiene una proprietà per ID con tutte le associazioni
   */
  async getPropertyById(propertyId: string): Promise<PropertyModel> {
    const property = await Property.findByPk(propertyId, {
      include: [
        {
          association: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          association: 'images',
          attributes: ['id', 's3KeyOriginal', 's3KeySmall', 's3KeyMedium', 's3KeyLarge', 
                      'bucketName', 'fileName', 'contentType', 'fileSize', 'width', 'height',
                      'caption', 'alt', 'isPrimary', 'order', 'uploadDate']
        }
      ]
    });

    if (!property) {
      throw new NotFoundError('Property not found');
    }

    return await this.formatPropertyToModel(property);
  }

  /**
   * Formatta la risposta della proprietà per l'API
   */
  private async formatPropertyToModel(property: Property): Promise<PropertyModel> {
    // Generate signed URLs for images
    const imagesWithUrls = await Promise.all(
      (property.images || []).map(async (image) => {
        // If image has S3 keys, generate signed URLs using getImageVariants()
        if (image.s3KeyOriginal) {
          const variants = image.getImageVariants();
          const urls = await imageService.getImageUrls(variants);

          return {
            id: image.id,
            fileName: image.fileName,
            contentType: image.contentType,
            fileSize: image.fileSize,
            width: image.width,
            height: image.height,
            caption: image.caption,
            alt: image.alt,
            isPrimary: image.isPrimary,
            order: image.order,
            uploadDate: image.uploadDate,
            urls
          };
        }
        return undefined; // Should not happen since all images should have S3 keys
      })
    );

    return {
      id: property.id,
      title: property.title,
      description: property.description,
      price: property.price,
      propertyType: property.propertyType,
      listingType: property.listingType,
      status: property.status,
      rooms: property.rooms,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      floor: property.floor,
      energyClass: property.energyClass,
      hasElevator: property.hasElevator,
      hasBalcony: property.hasBalcony,
      hasGarden: property.hasGarden,
      hasParking: property.hasParking,
      features: property.features,
      address: {
        street: property.street,
        city: property.city,
        province: property.province,
        zipCode: property.zipCode,
        country: property.country
      },
      location: property.location,  // GeoJSON Point format
      images: imagesWithUrls as any,
      agentId: property.agentId,
      agent: Helper.userToUserModel(property.agent),
      views: property.views,
      favorites: property.favorites,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString()
    };
  }

  /**
   * Validazione dei dati della proprietà
   */
  private validatePropertyData(data: CreatePropertyRequest): void {
    const errors: string[] = [];

    // Validazione titolo
    if (!data.title || data.title.length < 10 || data.title.length > 200) {
      errors.push('Title must be between 10 and 200 characters');
    }

    // Validazione descrizione
    if (!data.description || data.description.length < 50 || data.description.length > 2000) {
      errors.push('Description must be between 50 and 2000 characters');
    }

    // Validazione prezzo
    if (!data.price || data.price <= 0) {
      errors.push('Price must be greater than 0');
    }

    // Validazione camere
    if (data.bedrooms < 0 || data.bedrooms > 20) {
      errors.push('Bedrooms must be between 0 and 20');
    }

    // Validazione bagni
    if (data.bathrooms < 0 || data.bathrooms > 20) {
      errors.push('Bathrooms must be between 0 and 20');
    }

    // Validazione area
    if (!data.area || data.area < 1 || data.area > 10000) {
      errors.push('Area must be between 1 and 10000 square meters');
    }

    // Validazione indirizzo
    if (!data.address) {
      errors.push('Address is required');
    } else {
      if (!data.address.street || data.address.street.length < 5) {
        errors.push('Street must be at least 5 characters');
      }
      if (!data.address.city || data.address.city.length < 2) {
        errors.push('City must be at least 2 characters');
      }
      if (!data.address.province || data.address.province.length < 2) {
        errors.push('Province must be at least 2 characters');
      }
      if (!data.address.zipCode || !/^\d{5}$/.test(data.address.zipCode)) {
        errors.push('Zip code must be exactly 5 digits');
      }
    }

    // Validazione location (GeoJSON Point)
    if (!isValidGeoJSONPoint(data.location)) {
      errors.push('Location must be a valid GeoJSON Point with coordinates [longitude, latitude]');
    }

    // Validazione features
    if (data.features && data.features.length > 20) {
      errors.push('Maximum 20 features allowed');
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', { errors });
    }
  }

  /**
   * Add images to a property from S3 upload results
   */
  async addPropertyImages(
    propertyId: string,
    uploadResults: any[],
    userId: string
  ): Promise<PropertyImage[]> {
    try {
      // Verify property exists and user has permission
      const property = await Property.findByPk(propertyId);
      if (!property) {
        throw new NotFoundError('Property not found');
      }

      // Check if user is the agent of this property
      if (property.agentId !== userId) {
        throw new Error('You do not have permission to add images to this property');
      }

      const images: PropertyImage[] = [];

      // Get current max order
      const maxOrderImage = await PropertyImage.findOne({
        where: { propertyId },
        order: [['order', 'DESC']]
      });
      let currentOrder = maxOrderImage ? maxOrderImage.order + 1 : 0;

      // Check if this is the first image (make it primary)
      const existingImages = await PropertyImage.count({ where: { propertyId } });
      const isFirstImage = existingImages === 0;

      for (const result of uploadResults) {
        if (result.error) continue;

        const image = await PropertyImage.create({
          propertyId,
          s3KeyOriginal: result.originalKey,
          s3KeySmall: result.smallKey,
          s3KeyMedium: result.mediumKey,
          s3KeyLarge: result.largeKey,
          bucketName: config.s3.bucketName,
          fileName: result.fileName,
          contentType: result.contentType,
          fileSize: result.fileSize,
          uploadDate: new Date(),
          width: result.width,
          height: result.height,
          isPrimary: isFirstImage && currentOrder === 0,
          order: currentOrder++
        });

        images.push(image);
      }

      logger.info(`Added ${images.length} images to property ${propertyId}`);
      return images;

    } catch (error) {
      logger.error('Error adding property images:', error);
      throw error;
    }
  }

  /**
   * Get all images for a property with signed URLs
   */
  async getPropertyImages(propertyId: string): Promise<any[]> {
    try {
      const images = await PropertyImage.findAll({
        where: { propertyId },
        order: [['order', 'ASC']]
      });

      // Generate signed URLs for each image using getImageVariants()
      const imagesWithUrls = await Promise.all(
        images.map(async (image) => {
          const variants = image.getImageVariants();
          const urls = await imageService.getImageUrls(variants);

          return {
            id: image.id,
            fileName: image.fileName,
            contentType: image.contentType,
            fileSize: image.fileSize,
            width: image.width,
            height: image.height,
            caption: image.caption,
            alt: image.alt,
            isPrimary: image.isPrimary,
            order: image.order,
            uploadDate: image.uploadDate,
            urls
          };
        })
      );

      return imagesWithUrls;

    } catch (error) {
      logger.error('Error getting property images:', error);
      throw error;
    }
  }

  /**
   * Delete an image
   */
  async deletePropertyImage(imageId: string, userId: string): Promise<void> {
    try {
      const image = await PropertyImage.findByPk(imageId, {
        include: [{ association: 'property' }]
      });

      if (!image) {
        throw new NotFoundError('Image not found');
      }

      // Check permission
      if (image.property.agentId !== userId) {
        throw new Error('You do not have permission to delete this image');
      }

      // Delete from S3
      const keysToDelete = [
        image.s3KeyOriginal,
        image.s3KeySmall,
        image.s3KeyMedium,
        image.s3KeyLarge
      ].filter(Boolean) as string[];

      await imageService.deleteImage(keysToDelete);

      // Delete from database
      await image.destroy();

      logger.info(`Deleted image ${imageId}`);

    } catch (error) {
      logger.error('Error deleting property image:', error);
      throw error;
    }
  }

  /**
   * Set an image as primary
   */
  async setPrimaryImage(imageId: string, userId: string): Promise<PropertyImage> {
    try {
      const image = await PropertyImage.findByPk(imageId, {
        include: [{ association: 'property' }]
      });

      if (!image) {
        throw new NotFoundError('Image not found');
      }

      // Check permission
      if (image.property.agentId !== userId) {
        throw new Error('You do not have permission to modify this image');
      }

      // Set as primary (this also unsets other primary images)
      await image.setPrimary();

      logger.info(`Set image ${imageId} as primary`);
      return image;

    } catch (error) {
      logger.error('Error setting primary image:', error);
      throw error;
    }
  }

  /**
   * Update image metadata (caption, alt text, order)
   */
  async updateImageMetadata(
    imageId: string,
    userId: string,
    updates: {
      caption?: string;
      alt?: string;
      order?: number;
    }
  ): Promise<PropertyImage> {
    try {
      const image = await PropertyImage.findByPk(imageId, {
        include: [{ association: 'property' }]
      });

      if (!image) {
        throw new NotFoundError('Image not found');
      }

      // Check permission
      if (image.property.agentId !== userId) {
        throw new Error('You do not have permission to modify this image');
      }

      // Update fields
      if (updates.caption !== undefined) image.caption = updates.caption;
      if (updates.alt !== undefined) image.alt = updates.alt;
      if (updates.order !== undefined) image.order = updates.order;

      await image.save();

      logger.info(`Updated metadata for image ${imageId}`);
      return image;

    } catch (error) {
      logger.error('Error updating image metadata:', error);
      throw error;
    }
  }
}

export const propertyService = new PropertyService();