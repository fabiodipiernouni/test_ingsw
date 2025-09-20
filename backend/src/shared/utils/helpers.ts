import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ErrorResponse } from '@shared/types/common.types';

/**
 * Success response helper
 */
export const successResponse = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    timestamp: new Date()
  });
};

/**
 * Error response helper
 */
export const errorResponse = (
  res: Response,
  error: string,
  message: string,
  statusCode: number = 500,
  details?: any
): Response<ErrorResponse> => {
  return res.status(statusCode).json({
    success: false,
    error,
    message,
    details,
    timestamp: new Date(),
    path: res.req?.originalUrl || ''
  });
};

/**
 * Validation error response
 */
export const validationErrorResponse = (
  res: Response,
  errors: any[]
): Response<ErrorResponse> => {
  return errorResponse(
    res,
    'VALIDATION_ERROR',
    'Validation failed',
    400,
    { errors }
  );
};

/**
 * Not found error response
 */
export const notFoundResponse = (
  res: Response,
  resource: string = 'Resource'
): Response<ErrorResponse> => {
  return errorResponse(
    res,
    'NOT_FOUND',
    `${resource} not found`,
    404
  );
};

/**
 * Unauthorized error response
 */
export const unauthorizedResponse = (
  res: Response,
  message: string = 'Unauthorized'
): Response<ErrorResponse> => {
  return errorResponse(
    res,
    'UNAUTHORIZED',
    message,
    401
  );
};

/**
 * Forbidden error response
 */
export const forbiddenResponse = (
  res: Response,
  message: string = 'Forbidden'
): Response<ErrorResponse> => {
  return errorResponse(
    res,
    'FORBIDDEN',
    message,
    403
  );
};

/**
 * Conflict error response
 */
export const conflictResponse = (
  res: Response,
  message: string = 'Resource already exists'
): Response<ErrorResponse> => {
  return errorResponse(
    res,
    'CONFLICT',
    message,
    409
  );
};

/**
 * Internal server error response
 */
export const internalServerErrorResponse = (
  res: Response,
  message: string = 'Internal server error'
): Response<ErrorResponse> => {
  return errorResponse(
    res,
    'INTERNAL_SERVER_ERROR',
    message,
    500
  );
};

/**
 * Pagination helper for query results
 */
export const paginateResults = <T>(
  data: T[],
  totalCount: number,
  page: number,
  limit: number
) => {
  const totalPages = Math.ceil(totalCount / limit);
  
  return {
    data,
    pagination: {
      totalCount,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      limit
    }
  };
};

/**
 * Async handler wrapper to catch errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Generate unique filename for uploads
 */
export const generateUniqueFilename = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${randomString}.${extension}`;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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