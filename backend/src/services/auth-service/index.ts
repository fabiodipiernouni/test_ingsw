import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import { config } from '../../config/index';
import { errorHandler, notFoundHandler } from '../../shared/middleware/errorHandler';
import authRoutes from './routes/auth';
import logger from '../../shared/utils/logger';
import { connectToDatabase } from '@shared/database';
import { specs } from './config/swagger';

const app = express();
const PORT = config.auth.port || 3001;

logger.info('Avvio Auth Service...');

// Middleware
app.use(cors({
  origin: config.app.cors.origins,
  credentials: true
}));
logger.debug('CORS configurato:', config.app.cors.origins);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
logger.debug('Middleware JSON e URL encoded configurati');

// OpenAPI file downloads
app.get('/docs/openapi.json', (req, res) => {
  logger.debug('Richiesta OpenAPI JSON');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="auth-service-openapi.json"');
  res.json(specs);
});

app.get('/docs/openapi.yaml', (req, res) => {
  logger.debug('Richiesta OpenAPI YAML');
  try {
    const yamlStr = yaml.dump(specs, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      skipInvalid: true
    });
    res.setHeader('Content-Type', 'application/x-yaml');
    res.setHeader('Content-Disposition', 'attachment; filename="auth-service-openapi.yaml"');
    res.send(yamlStr);
  } catch (error) {
    logger.error('Error generating YAML specification:', error);
    res.status(500).json({
      error: 'Failed to generate YAML specification',
      message: 'Internal server error'
    });
  }
});

// Swagger Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Auth Service API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));
logger.debug('Swagger UI configurato');

// Routes
app.use('/api', authRoutes);
logger.debug('Route /api configurata');

app.get('/api/health', (req, res) => {
  logger.debug('Health check richiesto');
  res.json({
    service: 'auth-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);
logger.debug('Gestore 404 configurato');

// Global error handler
app.use(errorHandler);
logger.debug('Gestore errori globali configurato');

async function startServer() {
  try {
    logger.info('Starting Auth Service...');
    logger.info(`Environment: ${config.app.env}`);
    logger.info(`Port: ${PORT}`);

    // Try to connect to database
    logger.info('Attempting database connection...');
    try {
      await connectToDatabase();
      logger.info('Database connection established successfully');
    } catch (dbError: any) {
      logger.error('Database connection failed:', dbError);
      logger.error('Database error details:', {
        message: dbError.message,
        code: dbError.code,
        stack: dbError.stack
      });
      // Continue without database for now - log the error but don't crash
      logger.warn('Continuing without database connection...');
    }

    app.listen(PORT, () => {
      logger.info(`Auth Service running on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/docs`);
      logger.info(`Health check available at http://localhost:${PORT}/api/health`);
    });
  } catch (error: any) {
    logger.error('Failed to start Auth Service:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Catch uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

export default app;