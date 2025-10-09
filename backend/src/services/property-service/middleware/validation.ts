import { Request, Response, NextFunction } from 'express';
import { validationErrorResponse } from '@shared/utils/helpers';
import { isValidGeoJSONPoint } from '@shared/types/geojson.types';
import { CreatePropertyRequest } from '@property/dto/CreatePropertyRequest';

/**
 * Middleware per validare i dati di creazione proprietà
 */
export const validatePropertyCreate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const data: CreatePropertyRequest = req.body;
  const errors: string[] = [];

  // Validazione campi obbligatori
  if (!data.title) {
    errors.push('Title is required');
  } else if (data.title.length < 10 || data.title.length > 200) {
    errors.push('Title must be between 10 and 200 characters');
  }

  if (!data.description) {
    errors.push('Description is required');
  } else if (data.description.length < 50 || data.description.length > 2000) {
    errors.push('Description must be between 50 and 2000 characters');
  }

  if (!data.price) {
    errors.push('Price is required');
  } else if (data.price <= 0) {
    errors.push('Price must be greater than 0');
  }

  if (!data.propertyType) {
    errors.push('Property type is required');
  } else {
    const validPropertyTypes = ['apartment', 'villa', 'house', 'loft', 'office', 'commercial', 'land'];
    if (!validPropertyTypes.includes(data.propertyType)) {
      errors.push('Invalid property type');
    }
  }

  if (!data.listingType) {
    errors.push('Listing type is required');
  } else {
    const validListingTypes = ['sale', 'rent'];
    if (!validListingTypes.includes(data.listingType)) {
      errors.push('Invalid listing type');
    }
  }

  if (data.bedrooms === undefined || data.bedrooms === null) {
    errors.push('Bedrooms is required');
  } else if (data.bedrooms < 0 || data.bedrooms > 20) {
    errors.push('Bedrooms must be between 0 and 20');
  }

  if (data.bathrooms === undefined || data.bathrooms === null) {
    errors.push('Bathrooms is required');
  } else if (data.bathrooms < 0 || data.bathrooms > 20) {
    errors.push('Bathrooms must be between 0 and 20');
  }

  if (!data.area) {
    errors.push('Area is required');
  } else if (data.area < 1 || data.area > 10000) {
    errors.push('Area must be between 1 and 10000 square meters');
  }

  // Validazione energy class se presente
  if (data.energyClass) {
    const validEnergyClasses = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
    if (!validEnergyClasses.includes(data.energyClass)) {
      errors.push('Invalid energy class');
    }
  }

  // Validazione features
  if (data.features && data.features.length > 20) {
    errors.push('Maximum 20 features allowed');
  } else if (data.features) {
    for (const feature of data.features) {
      if (typeof feature !== 'string' || feature.trim().length < 2) {
        errors.push(`Feature must be a string with at least 2 characters: ${feature}`);
      }
    }
  }

  // Validazione indirizzo
  //TODO: potremmo integrare un servizio di geocoding per validare l'indirizzo
  if (!data.address) {
    errors.push('Address is required');
  } else {
    if (!data.address.street) {
      errors.push('Street is required');
    } else if (data.address.street.length < 5 || data.address.street.length > 200) {
      errors.push('Street must be between 5 and 200 characters');
    }

    if (!data.address.city) {
      errors.push('City is required');
    } else if (data.address.city.length < 2 || data.address.city.length > 100) {
      errors.push('City must be between 2 and 100 characters');
    }

    if (!data.address.province) {
      errors.push('Province is required');
    } else if (data.address.province.length < 2 || data.address.province.length > 100) {
      errors.push('Province must be between 2 and 100 characters');
    }

    if (!data.address.zipCode) {
      errors.push('Zip code is required');
    } else if (!/^\d{5}$/.test(data.address.zipCode)) {
      errors.push('Zip code must be exactly 5 digits');
    }
  }

  // Validazione location (GeoJSON Point)
  //TODO: la location potrebbe essere prelevata dall'indirizzo tramite geocoding?
  if (!isValidGeoJSONPoint(data.location)) {
    errors.push('Location must be a valid GeoJSON Point with coordinates [longitude, latitude]');
  }

  // Se ci sono errori, restituisce una risposta di errore
  if (errors.length > 0) {
    validationErrorResponse(res, errors);
    return;
  }

  // Se tutto ok, continua con il prossimo middleware
  next();
};

/**
 * Middleware per validare l'UUID del parametro propertyId
 */
export const validatePropertyId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { propertyId } = req.params;
  
  // Regex per validare UUID v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!propertyId || !uuidRegex.test(propertyId)) {
    validationErrorResponse(res, ['Invalid property ID format']);
    return;
  }

  next();
};