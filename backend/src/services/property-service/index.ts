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
const PORT = config.property?.port || 3002;

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
 *     description: Scarica la specifica OpenAPI del servizio proprietà in formato JSON
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
  res.setHeader('Content-Disposition', 'attachment; filename="property-service-openapi.json"');
  res.json(specs);
});

/**
 * @swagger
 * /docs/openapi.yaml:
 *   get:
 *     summary: Download OpenAPI specification in YAML format
 *     description: Scarica la specifica OpenAPI del servizio proprietà in formato YAML
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
    res.setHeader('Content-Disposition', 'attachment; filename="property-service-openapi.yaml"');
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
  customSiteTitle: 'Property Service API Documentation',
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
 *     description: Endpoint per verificare lo stato di salute del servizio proprietà
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
    service: 'property-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
import propertyRoutes from './routes/properties';
app.use('/api/properties', propertyRoutes);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

async function startServer() {
  try {
    // Connessione al database
    await connectToDatabase();
    
    app.listen(PORT, () => {
      logger.info(`Property Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Property Service:', error);
    process.exit(1);
  }
}

startServer();

export default app;