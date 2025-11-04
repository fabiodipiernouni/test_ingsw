import { Response } from 'express';
import { ValidationError } from 'class-validator';
import { ApiResponse } from '@shared/dto/ApiResponse';

/**
 * Estrae ricorsivamente tutti i messaggi di errore da un ValidationError,
 * inclusi gli errori innestati nei children
 */
export const extractValidationErrors = (error: ValidationError): string[] => {
  const errors: string[] = [];
  
  // Aggiungi i constraints del livello corrente
  if (error.constraints) {
    errors.push(...Object.values(error.constraints));
  }
  
  // Processa ricorsivamente i children (errori innestati)
  if (error.children && error.children.length > 0) {
    for (const child of error.children) {
      errors.push(...extractValidationErrors(child));
    }
  }
  
  return errors;
};

/**
 * Converte un array di ValidationError in un array di stringhe di errore,
 * gestendo anche gli errori innestati
 */
export const formatValidationErrors = (errors: ValidationError[]): string[] => {
  return errors.flatMap(error => extractValidationErrors(error));
};

/**
 * Success response helper
 */
export const setResponseAsSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void => {
  const apiResponse: ApiResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date(),
    path: res.req?.originalUrl || ''
  };

  res.status(statusCode).json(apiResponse);
};

/**
 * Error response helper
 */
export const setResponseAsError = (
  res: Response,
  error: string,
  message: string,
  statusCode: number = 500,
  details?: string[]
): void => {
  const errorResponse: ApiResponse<never> = {
    success: false,
    error,
    message,
    timestamp: new Date(),
    path: res.req?.originalUrl || '',
    ...(details && { details })
  };

  res.status(statusCode).json(errorResponse);
};

/**
 * Validation error response
 */
export const setResponseAsValidationError = (
  res: Response,
  errors: string[]
): void =>
  setResponseAsError(
    res,
    'VALIDATION_ERROR',
    'Validation failed',
    400,
    errors
  );


/**
 * Not found error response
 */
export const setResponseAsNotFound = (
  res: Response,
  resource: string = 'Resource'
): void =>
  setResponseAsError(
    res,
    'NOT_FOUND',
    `${resource} not found`,
    404
  );

/**
 * Unauthorized error response
 */
export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized'
): void =>
  setResponseAsError(
    res,
    'UNAUTHORIZED',
    message,
    401
  );


/**
 * Forbidden error response
 */
export const setResponseAsForbidden = (
  res: Response,
  message: string = 'Forbidden'
): void =>
  setResponseAsError(
    res,
    'FORBIDDEN',
    message,
    403
  );


function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate password strength
 */
export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
  return password.length >= 8 && passwordRegex.test(password);
};

/**
 * Sanitize filename for safe storage
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Format file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Generate random string
 */
export const generateRandomString = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Verifica se un valore è compreso in un intervallo specificato (estremi inclusi)
 * 
 * @param value - Il valore da verificare
 * @param min - Valore minimo (incluso)
 * @param max - Valore massimo (incluso)
 * @returns true se il valore è compreso tra min e max (inclusi), false altrimenti
 * @throws Error se min > max (intervallo non valido)
 */
export function isInRange(value: number, min: number, max: number): boolean {
  // Se min > max, il range è invalido
  if (min > max) {
    throw new Error('Invalid range: min cannot be greater than max');
  }

  return value >= min && value <= max;
}

/**
 * Verifica se la lunghezza di una stringa è compresa in un intervallo specificato (estremi inclusi)
 *
 * @param text - La stringa da verificare
 * @param minLength - Lunghezza minima (inclusa, deve essere un intero non negativo)
 * @param maxLength - Lunghezza massima (inclusa, deve essere un intero non negativo)
 * @returns true se la lunghezza della stringa è compresa tra minLength e maxLength (inclusi), false altrimenti
 * @throws Error se minLength o maxLength sono negativi o se minLength > maxLength
 */
export function isStringInLengthRange(text: string, minLength: number, maxLength: number): boolean {
  // Validazione: minLength e maxLength devono essere numeri interi non negativi
  if (!Number.isInteger(minLength) || minLength < 0) {
    throw new Error('minLength must be a non-negative integer');
  }
  if (!Number.isInteger(maxLength) || maxLength < 0) {
    throw new Error('maxLength must be a non-negative integer');
  }

  // Se minLength > maxLength, il range è invalido
  if (minLength > maxLength) {
    throw new Error('Invalid range: minLength cannot be greater than maxLength');
  }

  const length = text.length;
  return length >= minLength && length <= maxLength;
}

/**
 * Calcola il numero totale di pagine per la paginazione
 * 
 * @param totalCount - Numero totale di elementi
 * @param limit - Numero di elementi per pagina
 * @returns Numero di pagine necessarie
 * @throws Error se i parametri non sono validi
 */
export function calculateTotalPages(totalCount: number, limit: number): number {
  // Validazione: totalCount deve essere un intero non negativo
  if (!Number.isInteger(totalCount) || totalCount < 0) {
    throw new Error('totalCount must be a non-negative integer');
  }

  // Validazione: limit deve essere un intero positivo
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('limit must be a positive integer');
  }

  return Math.ceil(totalCount / limit);
}