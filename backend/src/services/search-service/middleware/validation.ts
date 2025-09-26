import { Request, Response, NextFunction } from 'express';
import { validationErrorResponse } from '@shared/utils/helpers';
import { SearchRequest } from '../models/types';

/**
 * Middleware per validare la richiesta di ricerca
 */
export const validateSearchRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const data: SearchRequest = req.body;
  const errors: string[] = [];

  // Validazione paginazione
  if (data.page && data.page < 1) {
    errors.push('Page must be greater than 0');
  }
  if (data.limit && (data.limit < 1 || data.limit > 100)) {
    errors.push('Limit must be between 1 and 100');
  }

  // Validazione range prezzo
  if (data.priceMin !== undefined && data.priceMin < 0) {
    errors.push('Price minimum must be greater than or equal to 0');
  }
  if (data.priceMax !== undefined && data.priceMax < 0) {
    errors.push('Price maximum must be greater than or equal to 0');
  }
  if (data.priceMin && data.priceMax && data.priceMin > data.priceMax) {
    errors.push('Price minimum cannot be greater than maximum');
  }

  // Validazione range area
  if (data.areaMin !== undefined && data.areaMin < 0) {
    errors.push('Area minimum must be greater than or equal to 0');
  }
  if (data.areaMax !== undefined && data.areaMax < 0) {
    errors.push('Area maximum must be greater than or equal to 0');
  }
  if (data.areaMin && data.areaMax && data.areaMin > data.areaMax) {
    errors.push('Area minimum cannot be greater than maximum');
  }

  // Validazione camere e bagni
  if (data.bedrooms !== undefined && data.bedrooms < 0) {
    errors.push('Bedrooms must be greater than or equal to 0');
  }
  if (data.bathrooms !== undefined && data.bathrooms < 0) {
    errors.push('Bathrooms must be greater than or equal to 0');
  }

  // Validazione property type
  if (data.propertyType) {
    const validPropertyTypes = ['apartment', 'villa', 'house', 'loft', 'office', 'commercial', 'land'];
    if (!validPropertyTypes.includes(data.propertyType)) {
      errors.push('Invalid property type');
    }
  }

  // Validazione listing type
  if (data.listingType) {
    const validListingTypes = ['sale', 'rent'];
    if (!validListingTypes.includes(data.listingType)) {
      errors.push('Invalid listing type');
    }
  }

  // Validazione energy class
  if (data.energyClass) {
    const validEnergyClasses = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
    if (!validEnergyClasses.includes(data.energyClass)) {
      errors.push('Invalid energy class');
    }
  }

  // Validazione coordinate geografiche
  if (data.centerLat !== undefined && (data.centerLat < -90 || data.centerLat > 90)) {
    errors.push('Latitude must be between -90 and 90');
  }
  if (data.centerLng !== undefined && (data.centerLng < -180 || data.centerLng > 180)) {
    errors.push('Longitude must be between -180 and 180');
  }
  if (data.radius !== undefined && (data.radius < 0.1 || data.radius > 100)) {
    errors.push('Radius must be between 0.1 and 100 km');
  }

  // Validazione ricerca geografica (tutti i parametri devono essere presenti)
  const hasGeoParams = data.centerLat !== undefined || data.centerLng !== undefined || data.radius !== undefined;
  if (hasGeoParams) {
    if (data.centerLat === undefined || data.centerLng === undefined || data.radius === undefined) {
      errors.push('Geographic search requires centerLat, centerLng, and radius');
    }
  }

  // Validazione sortBy
  if (data.sortBy) {
    const validSortOptions = ['price_asc', 'price_desc', 'area_asc', 'area_desc', 'date_desc', 'relevance'];
    if (!validSortOptions.includes(data.sortBy)) {
      errors.push('Invalid sort option');
    }
  }

  // Validazione features
  if (data.features) {
    if (!Array.isArray(data.features)) {
      errors.push('Features must be an array');
    } else if (data.features.length > 10) {
      errors.push('Maximum 10 features allowed');
    }
  }

  // Validazione query text
  if (data.query && data.query.length > 200) {
    errors.push('Query text cannot exceed 200 characters');
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
 * Middleware per validare i parametri di ricerca suggerimenti
 */
export const validateSuggestionsRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { query, type } = req.query;
  const errors: string[] = [];

  // Validazione query
  if (!query) {
    errors.push('Query parameter is required');
  } else if (typeof query !== 'string') {
    errors.push('Query must be a string');
  } else if (query.length < 2) {
    errors.push('Query must be at least 2 characters long');
  } else if (query.length > 100) {
    errors.push('Query cannot exceed 100 characters');
  }

  // Validazione type
  if (type) {
    const validTypes = ['location', 'property_type', 'feature'];
    if (!validTypes.includes(type as string)) {
      errors.push('Invalid suggestion type. Valid types: location, property_type, feature');
    }
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
 * Middleware per validare l'UUID nei parametri del path
 */
export const validateUUID = (paramName: string) => (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const id = req.params[paramName];
  
  // Regex per validare UUID v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!id || !uuidRegex.test(id)) {
    validationErrorResponse(res, [`Invalid ${paramName} format`]);
    return;
  }

  next();
};

/**
 * Middleware per validare i dati di creazione/aggiornamento ricerca salvata
 */
export const validateSavedSearchData = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { name, filters, isNotificationEnabled } = req.body;
  const errors: string[] = [];

  // Validazione name (obbligatorio per creazione)
  if (req.method === 'POST') {
    if (!name) {
      errors.push('Name is required');
    } else if (typeof name !== 'string' || name.length < 1 || name.length > 100) {
      errors.push('Name must be between 1 and 100 characters');
    }

    if (!filters) {
      errors.push('Filters are required');
    }
  } else {
    // Per aggiornamento, name è opzionale ma se presente deve essere valido
    if (name && (typeof name !== 'string' || name.length < 1 || name.length > 100)) {
      errors.push('Name must be between 1 and 100 characters');
    }
  }

  // Validazione filters se presente
  if (filters && typeof filters !== 'object') {
    errors.push('Filters must be an object');
  }

  // Validazione isNotificationEnabled se presente
  if (isNotificationEnabled !== undefined && typeof isNotificationEnabled !== 'boolean') {
    errors.push('isNotificationEnabled must be a boolean');
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
 * Middleware per validare i parametri di paginazione
 */
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { page, limit } = req.query;
  const errors: string[] = [];

  // Validazione page
  if (page) {
    const pageNum = parseInt(page as string);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Page must be a positive integer');
    }
  }

  // Validazione limit
  if (limit) {
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('Limit must be between 1 and 100');
    }
  }

  // Se ci sono errori, restituisce una risposta di errore
  if (errors.length > 0) {
    validationErrorResponse(res, errors);
    return;
  }

  // Se tutto ok, continua con il prossimo middleware
  next();
};