import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '@shared/types/common.types';

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
export const validationErrorResponse = (
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
export const notFoundResponse = (
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