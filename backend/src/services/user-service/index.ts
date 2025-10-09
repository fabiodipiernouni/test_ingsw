import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import { config } from '../../config/index';
import { errorHandler, notFoundHandler } from '../../shared/middleware/errorHandler';
import logger from '../../shared/utils/logger';
import { connectToDatabase } from '@shared/database';
import { specs } from './config/swagger';

const app = express();
const PORT = config.user?.port || 3004;

// Middleware
app.use(cors({
  origin: config.app.cors.origins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OpenAPI file downloads - DEVONO essere prima del middleware Swagger UI
/**
 * @swagger
 * /docs/openapi.json:
 *   get:
 *     summary: Download OpenAPI specification in JSON format
 *     description: Scarica la specifica OpenAPI del servizio utenti in formato JSON
 *     tags:
 *       - Documentation
 *     responses:
 *       200:
 *         description: Specifica OpenAPI in formato JSON
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.get('/docs/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="user-service-openapi.json"');
  res.json(specs);
});

/**
 * @swagger
 * /docs/openapi.yaml:
 *   get:
 *     summary: Download OpenAPI specification in YAML format
 *     description: Scarica la specifica OpenAPI del servizio utenti in formato YAML
 *     tags:
 *       - Documentation
 *     responses:
 *       200:
 *         description: Specifica OpenAPI in formato YAML
 *         content:
 *           application/x-yaml:
 *             schema:
 *               type: string
 */
app.get('/docs/openapi.yaml', (req, res) => {
  try {
    const yamlStr = yaml.dump(specs, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      skipInvalid: true
    });
    res.setHeader('Content-Type', 'application/x-yaml');
    res.setHeader('Content-Disposition', 'attachment; filename="user-service-openapi.yaml"');
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
  customSiteTitle: 'User Service API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check del servizio
 *     description: Endpoint per verificare lo stato di salute del servizio utenti
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Servizio funzionante correttamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get('/api/health', (req, res) => {
  res.json({
    service: 'user-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
import userRoutes from './routes/userRoutes';
app.use('/api/users', userRoutes);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

async function startServer() {
  try {
    logger.info('Starting User Service...');
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
      logger.info(`User Service running on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/docs`);
      logger.info(`Health check available at http://localhost:${PORT}/api/health`);
    });
  } catch (error: any) {
    logger.error('Failed to start User Service:', error);
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