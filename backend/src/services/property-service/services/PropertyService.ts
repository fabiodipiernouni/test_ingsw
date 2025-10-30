import { Property, PropertyImage, User } from '@shared/database/models';
import logger from '@shared/utils/logger';
import { imageService } from '@shared/services/ImageService';
import config from '@shared/config';
import { PropertyCardDto } from '@property/dto/PropertyCardDto';
import { PagedResult } from '@shared/dto/pagedResult';
import { CreatePropertyRequest } from '@property/dto/CreatePropertyRequestEndpoint/CreatePropertyRequest';
import { CreatePropertyResponse } from '@property/dto/CreatePropertyRequestEndpoint/CreatePropertyResponse';
import { PropertyModel } from '@property/models/PropertyModel';
import { isValidGeoJSONPoint } from '@shared/types/geojson.types';
import { Helper } from '@services/property-service/utils/helper';
import { SearchPropertiesFilters } from '@property/dto/SearchPropertiesFilters';
import { PropertyStatus } from '@property/models/types';
import { GeoSearchPropertiesFilters } from '@property/dto/GeoSearchPropertiesFilters';
import { GeoPropertyCardDto } from '@property/dto/GeoPropertyCardDto';
import { Mappers } from '@property/utils/mappers';

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

    return await Mappers.formatPropertyToModel(property);
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

  async getPropertiesCards(options: {
    page: number;
    limit: number;
    filters?: SearchPropertiesFilters;
    geoFilters?: GeoSearchPropertiesFilters;
    status?: PropertyStatus;
    agencyId?: string;       // Per admin: filtra tutte le proprietà di una certa agenzia
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
  }): Promise<PagedResult<PropertyCardDto>> {
    return this.getPropertiesCardsV2(options);
  }

  async getGeoPropertiesCardsV1(options: {
    filters?: SearchPropertiesFilters;
    geoFilters?: GeoSearchPropertiesFilters;
    status?: PropertyStatus;
    agencyId?: string;       // Per admin: filtra tutte le proprietà di una certa agenzia
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
  }): Promise<GeoPropertyCardDto[]> {
    try {
      const whereClause: any = {};
      const includeClause: any[] = [
        {
          association: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'agencyId']
        },
        {
          association: 'images',
          attributes: ['id', 's3KeyOriginal', 's3KeySmall', 's3KeyMedium', 's3KeyLarge',
            'bucketName', 'fileName', 'contentType', 'fileSize', 'width', 'height',
            'caption', 'alt', 'isPrimary', 'order', 'uploadDate'],
          where: { isPrimary: true },
          required: false
        }
      ];

      whereClause.status = options.status ?? 'active';

      if(options.geoFilters) {
        Helper.applyGeoSearchFilters(whereClause, options.geoFilters);
      }

      if(options.filters) Helper.applySearchFilters(whereClause, options.filters);

      if (options.agencyId) {
        includeClause[0].where = { agencyId: options.agencyId };
        includeClause[0].required = true; // INNER JOIN per garantire che l'agente appartenga all'agenzia
      }

      const { sortBy, sortOrder } = options;

      // Esegue la query con conteggio
      const properties = await Property.findAll({
        where: whereClause,
        include: includeClause,
        order: [[sortBy, sortOrder]]
      });

      // Formatta le proprietà per la risposta (gestisce Promise.all per gli URL S3)
      return await Promise.all(
        properties.map(property => Mappers.formatGeoPropertyCardResponse(property))
      );
    } catch (error) {
      logger.error('Error getting properties:', error);
      throw error;
    }
  }


    async getPropertiesCardsV2(options: {
    page: number;
    limit: number;
    filters?: SearchPropertiesFilters;
    geoFilters?: GeoSearchPropertiesFilters;
    status?: PropertyStatus;
    agencyId?: string;       // Per admin: filtra tutte le proprietà di una certa agenzia
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
  }): Promise<PagedResult<PropertyCardDto>> {
    try {
      const offset = (options.page - 1) * options.limit;

      logger.info('Getting properties with filters', { filters: options.filters, page: options.page, limit: options.limit });

      // Costruisce la query con i filtri
      const whereClause: any = {};
      const includeClause: any[] = [
        {
          association: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'agencyId']
        },
        {
          association: 'images',
          attributes: ['id', 's3KeyOriginal', 's3KeySmall', 's3KeyMedium', 's3KeyLarge',
            'bucketName', 'fileName', 'contentType', 'fileSize', 'width', 'height',
            'caption', 'alt', 'isPrimary', 'order', 'uploadDate'],
          where: { isPrimary: true },
          required: false
        }
      ];

      whereClause.status = options.status ?? 'active';

      if(options.geoFilters) {
        Helper.applyGeoSearchFilters(whereClause, options.geoFilters);
      }

      if(options.filters) Helper.applySearchFilters(whereClause, options.filters);

      if (options.agencyId) {
        includeClause[0].where = { agencyId: options.agencyId };
        includeClause[0].required = true; // INNER JOIN per garantire che l'agente appartenga all'agenzia
      }

      const { sortBy, sortOrder } = options;

      // Esegue la query con conteggio
      const { rows: properties, count: totalCount } = await Property.findAndCountAll({
        where: whereClause,
        include: includeClause,
        order: [[sortBy, sortOrder]],
        limit: options.limit,
        offset,
        distinct: true
      });

      const totalPages = Math.ceil(totalCount / options.limit);

      // Formatta le proprietà per la risposta (gestisce Promise.all per gli URL S3)
      const formattedProperties = await Promise.all(
        properties.map(property => Mappers.formatPropertyCardResponse(property))
      );

      const result: PagedResult<PropertyCardDto> = {
        data: formattedProperties,
        totalCount,
        currentPage: options.page,
        totalPages,
        hasNextPage: options.page < totalPages,
        hasPreviousPage: options.page > 1
      };

      return result;
    } catch (error) {
      logger.error('Error getting properties:', error);
      throw error;
    }
  }


    /**
   * Ottiene lista proprietà con filtri e paginazione
   */
  async getPropertiesCardsV1(options: {
    page: number;
    limit: number;
    filters?: SearchPropertiesFilters;
    geoFilters?: GeoSearchPropertiesFilters;
    status?: PropertyStatus;
    agencyId?: string;       // Per admin: filtra tutte le proprietà di una certa agenzia
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
  }): Promise<PagedResult<PropertyCardDto>> {
    try {
      const offset = (options.page - 1) * options.limit;

      logger.info('Getting properties with filters', { filters: options.filters, page: options.page, limit: options.limit });

      // Costruisce la query con i filtri
      const whereClause: any = {};
      const includeClause: any[] = [
        {
          association: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'agencyId']
        },
        {
          association: 'images',
          attributes: ['id', 's3KeyOriginal', 's3KeySmall', 's3KeyMedium', 's3KeyLarge',
                      'bucketName', 'fileName', 'contentType', 'fileSize', 'width', 'height',
                      'caption', 'alt', 'isPrimary', 'order', 'uploadDate'],
          where: { isPrimary: true },
          required: false
        }
      ];

      whereClause.status = options.status ?? 'active';

      if(options.filters) Helper.applySearchFilters(whereClause, options.filters);
      if(options.geoFilters) Helper.applyGeoSearchFilters(whereClause, options.geoFilters);

      // Filtro per agenzia (per admin): filtra attraverso l'agente
      if (options.agencyId) {
        includeClause[0].where = { agencyId: options.agencyId };
        includeClause[0].required = true; // INNER JOIN per garantire che l'agente appartenga all'agenzia
      }

      const { sortBy, sortOrder } = options;

      // Esegue la query con conteggio
      const { rows: properties, count: totalCount } = await Property.findAndCountAll({
        where: whereClause,
        include: includeClause,
        order: [[sortBy, sortOrder]],
        limit: options.limit,
        offset,
        distinct: true
      });

      const totalPages = Math.ceil(totalCount / options.limit);

      // Formatta le proprietà per la risposta (gestisce Promise.all per gli URL S3)
      const formattedProperties = await Promise.all(
        properties.map(property => Mappers.formatPropertyCardResponse(property))
      );

      const result: PagedResult<PropertyCardDto> = {
        data: formattedProperties,
        totalCount,
        currentPage: options.page,
        totalPages,
        hasNextPage: options.page < totalPages,
        hasPreviousPage: options.page > 1
      };

      return result;
    } catch (error) {
      logger.error('Error getting properties:', error);
      throw error;
    }
  }


  /**
   * Ottiene lista proprietà con filtri e paginazione
   */
  /*async getProperties(options: {
    page: number;
    limit: number;
    filters: any;
  }): Promise<SearchResult> {
    try {
      const { page, limit, filters } = options;
      const offset = (page - 1) * limit;

      logger.info('Getting properties with filters', { filters, page, limit });

      // Costruisce la query con i filtri
      const whereClause: any = {};
      const includeClause: any[] = [
        {
          association: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'agencyId']
        },
        {
          association: 'images',
          attributes: ['id', 's3KeyOriginal', 's3KeySmall', 's3KeyMedium', 's3KeyLarge',
                      'bucketName', 'fileName', 'contentType', 'fileSize', 'width', 'height',
                      'caption', 'alt', 'isPrimary', 'order', 'uploadDate'],
          where: { isPrimary: true },
          required: false
        }
      ];

      if (filters.status) {
        whereClause.status = filters.status;
      }
      if (filters.isActive !== undefined) {
        whereClause.isActive = filters.isActive;
      }
      if (filters.agentId) {
        whereClause.agentId = filters.agentId;
      }

      // Filtro per agenzia (per admin): filtra attraverso l'agente
      if (filters.agencyId) {
        includeClause[0].where = { agencyId: filters.agencyId };
        includeClause[0].required = true; // INNER JOIN per garantire che l'agente appartenga all'agenzia

        // Se specificato anche un agente particolare (solo della stessa agenzia)
        if (filters.specificAgentId) {
          includeClause[0].where.id = filters.specificAgentId;
        }
      }

      // Esegue la query con conteggio
      const { rows: properties, count: totalCount } = await Property.findAndCountAll({
        where: whereClause,
        include: includeClause,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true
      });

      const totalPages = Math.ceil(totalCount / limit);

      // Formatta le proprietà per la risposta (gestisce Promise.all per gli URL S3)
      const formattedProperties = await Promise.all(
        properties.map(property => Mappers.formatPropertyToModel(property))
      );

      return {
        properties: formattedProperties,
        totalCount,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };

    } catch (error) {
      logger.error('Error getting properties:', error);
      throw error;
    }
  }

  /**
   * Add images to a property - gestisce upload S3 e salvataggio DB
   */
  async addPropertyImages(
    propertyId: string,
    files: Express.Multer.File[],
    metadata: any[],
    userId: string
  ): Promise<{ images: PropertyImage[], warnings?: any[] }> {
    try {
      // Verify property exists and user has permission
      const property = await Property.findByPk(propertyId, {
        include: [{
          model: User,
          as: 'agent',
          attributes: ['id', 'agencyId']
        }]
      });

      if (!property) {
        throw new NotFoundError('Property not found');
      }

      // Check if user is the agent of this property
      if (property.agentId !== userId) {
        throw new Error('You do not have permission to add images to this property');
      }

      // Validate metadata array length matches files
      if (metadata.length !== files.length) {
        throw new ValidationError('Metadata count must match uploaded files count');
      }

      const images: PropertyImage[] = [];
      const warnings: any[] = [];

      // Get user's agency for S3 path
      const agent = property.agent as any;
      const agencyId = agent?.agencyId;

      if (!agencyId) {
        throw new Error('Agent must belong to an agency');
      }

      // Check if there are existing images
      const existingImages = await PropertyImage.count({ where: { propertyId } });

      // Handle primary image logic
      const hasPrimaryInMetadata = metadata.some(m => m.isPrimary);

      // If a new primary is being set, unset existing primary images
      if (hasPrimaryInMetadata && existingImages > 0) {
        await PropertyImage.update(
          { isPrimary: false },
          { where: { propertyId } }
        );
      }

      // Import imageService dynamically to avoid circular dependencies
      const { imageService } = await import('@shared/services/ImageService');

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageMetadata = metadata[i];

        try {
          // Upload to S3 with variants
          const uploadResult = await imageService.uploadImage(
            file.buffer,
            file.originalname,
            file.mimetype,
            propertyId,
            agencyId,
            property.listingType
          );

          // Determine if this image should be primary
          let isPrimary = false;
          if (existingImages === 0 && i === 0 && !hasPrimaryInMetadata) {
            // First image of property and no explicit primary set
            isPrimary = true;
          } else {
            isPrimary = imageMetadata.isPrimary || false;
          }

          // Get image metadata from file
          const fileMetadata = (file as any).imageMetadata;

          // Create database record
          const image = await PropertyImage.create({
            propertyId,
            s3KeyOriginal: uploadResult.originalKey,
            s3KeySmall: uploadResult.smallKey,
            s3KeyMedium: uploadResult.mediumKey,
            s3KeyLarge: uploadResult.largeKey,
            bucketName: config.s3.bucketName,
            fileName: uploadResult.fileName,
            contentType: uploadResult.contentType,
            fileSize: uploadResult.fileSize,
            uploadDate: new Date(),
            width: fileMetadata?.width || uploadResult.width,
            height: fileMetadata?.height || uploadResult.height,
            isPrimary: isPrimary,
            order: imageMetadata.order,
            caption: imageMetadata.caption || null,
            alt: imageMetadata.altText || null
          });

          images.push(image);

        } catch (fileError) {
          logger.error(`Error uploading file ${file.originalname}:`, fileError);
          warnings.push({
            fileName: file.originalname,
            error: fileError instanceof Error ? fileError.message : 'Upload failed'
          });
        }
      }

      // If no images were successfully uploaded, throw error
      if (images.length === 0) {
        throw new Error('All image uploads failed');
      }

      logger.info(`Added ${images.length} images to property ${propertyId}`);

      return {
        images: images.map(img => ({
          id: img.id,
          fileName: img.fileName,
          fileSize: img.fileSize,
          contentType: img.contentType,
          width: img.width,
          height: img.height,
          isPrimary: img.isPrimary,
          order: img.order,
          caption: img.caption,
          alt: img.alt,
          uploadDate: img.uploadDate
        } as any)),
        warnings: warnings.length > 0 ? warnings : undefined
      };

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

  async getPropertiesCardsByIdList(options: {
    ids: string[];
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
  }): Promise<PropertyCardDto[]> {
    try {
      logger.info('Getting properties by Id List.');

      // Costruisce la query con i filtri
      const whereClause: any = {};
      const includeClause: any[] = [
        {
          association: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'agencyId']
        },
        {
          association: 'images',
          attributes: ['id', 's3KeyOriginal', 's3KeySmall', 's3KeyMedium', 's3KeyLarge',
            'bucketName', 'fileName', 'contentType', 'fileSize', 'width', 'height',
            'caption', 'alt', 'isPrimary', 'order', 'uploadDate'],
          where: { isPrimary: true },
          required: false
        }
      ];

      whereClause.id = options.ids;

      const { sortBy, sortOrder } = options;

      // Esegue la query con conteggio
      const properties = await Property.findAll({
        where: whereClause,
        include: includeClause,
        order: [[sortBy, sortOrder]]
      });

      // Formatta le proprietà per la risposta (gestisce Promise.all per gli URL S3)
      const formattedProperties = await Promise.all(
        properties.map(property => Mappers.formatPropertyCardResponse(property))
      );

      return formattedProperties;
    } catch (error) {
      logger.error('Error getting properties:', error);
      throw error;
    }
  }
}

export const propertyService = new PropertyService();