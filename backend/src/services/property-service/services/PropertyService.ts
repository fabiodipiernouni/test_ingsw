import { Property } from '@shared/database/models';
import { PropertyCreateRequest, PropertyResponse, CreatePropertyResponse } from '../models/types';
import logger from '@shared/utils/logger';

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
  async createProperty(propertyData: PropertyCreateRequest, agentId: string): Promise<CreatePropertyResponse> {
    try {
      logger.info(`Creating property for agent ${agentId}`, { title: propertyData.title });

      // Validazione base dei dati
      this.validatePropertyData(propertyData);

      // Crea la proprietà nel database
      const property = await Property.create({
        ...propertyData,
        // Address fields
        street: propertyData.address.street,
        city: propertyData.address.city,
        province: propertyData.address.province,
        zipCode: propertyData.address.zipCode,
        country: propertyData.address.country || 'Italy',
        // Location fields
        latitude: propertyData.location.latitude,
        longitude: propertyData.location.longitude,
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

      logger.info(`Property created successfully`, { propertyId: property.id });

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
  async getPropertyById(propertyId: string): Promise<PropertyResponse> {
    const property = await Property.findByPk(propertyId, {
      include: [
        {
          association: 'agent',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          association: 'images',
          attributes: ['id', 'url', 'alt', 'isPrimary', 'order']
        }
      ]
    });

    if (!property) {
      throw new NotFoundError('Property not found');
    }

    return this.formatPropertyResponse(property);
  }

  /**
   * Formatta la risposta della proprietà per l'API
   */
  private formatPropertyResponse(property: Property): PropertyResponse {
    return {
      id: property.id,
      title: property.title,
      description: property.description,
      price: property.price,
      propertyType: property.propertyType,
      listingType: property.listingType,
      status: property.status,
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
      location: {
        latitude: property.latitude,
        longitude: property.longitude
      },
      images: property.images || [],
      agentId: property.agentId,
      agent: property.agent ? {
        id: property.agent.id,
        firstName: property.agent.firstName,
        lastName: property.agent.lastName,
        email: property.agent.email,
        phone: property.agent.phone
      } : undefined,
      isActive: property.isActive,
      views: property.views,
      favorites: property.favorites,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString()
    };
  }

  /**
   * Validazione dei dati della proprietà
   */
  private validatePropertyData(data: PropertyCreateRequest): void {
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

    // Validazione location
    if (!data.location) {
      errors.push('Location is required');
    } else {
      if (data.location.latitude < -90 || data.location.latitude > 90) {
        errors.push('Latitude must be between -90 and 90');
      }
      if (data.location.longitude < -180 || data.location.longitude > 180) {
        errors.push('Longitude must be between -180 and 180');
      }
    }

    // Validazione features
    if (data.features && data.features.length > 20) {
      errors.push('Maximum 20 features allowed');
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', { errors });
    }
  }
}

export const propertyService = new PropertyService();