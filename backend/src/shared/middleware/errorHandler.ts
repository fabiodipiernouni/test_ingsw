import express from 'express';
import logger from '../utils/logger';
import { config } from '../../config/index';

/**
 * Middleware comune per la gestione degli errori in tutti i microservizi
 * Distingue tra diversi tipi di errori e restituisce status code appropriati
 */
export const errorHandler = (err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Log dell'errore per debugging
  logger.error(`${req.method} ${req.path} - Error:`, {
    message: err.message,
    stack: config.app.env === 'development' ? err.stack : undefined,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  // JSON parsing error (es. JSON malformato)
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format',
      error: 'Malformed JSON in request body',
      ...(config.app.env === 'development' && { details: err.message })
    });
  }
  
  // Validation errors (da express-validator o joi)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors || err.details,
      ...(config.app.env === 'development' && { error: err.message })
    });
  }
  
  // Authentication errors
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error: 'Authentication required',
      ...(config.app.env === 'development' && { details: err.message })
    });
  }
  
  // Authorization errors (forbidden)
  if (err.status === 403 || err.name === 'ForbiddenError') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden',
      error: 'Insufficient permissions',
      ...(config.app.env === 'development' && { details: err.message })
    });
  }
  
  // Not Found errors
  if (err.status === 404 || err.name === 'NotFoundError') {
    return res.status(404).json({
      success: false,
      message: 'Resource not found',
      ...(config.app.env === 'development' && { error: err.message })
    });
  }
  
  // Database errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Database validation error',
      errors: err.errors?.map((e: any) => ({
        field: e.path,
        message: e.message
      })),
      ...(config.app.env === 'development' && { details: err.message })
    });
  }
  
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
      error: 'Unique constraint violation',
      ...(config.app.env === 'development' && { details: err.message })
    });
  }
  
  // Rate limiting errors
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests',
      error: 'Rate limit exceeded',
      ...(config.app.env === 'development' && { details: err.message })
    });
  }
  
  // Default: Internal Server Error
  res.status(err.status || 500).json({
    success: false,
    message: err.status ? err.message : 'Internal server error',
    ...(config.app.env === 'development' && { 
      error: err.message,
      stack: err.stack
    })
  });
};

/**
 * Middleware per gestire le route non trovate (404)
 */
export const notFoundHandler = (req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
};