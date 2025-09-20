import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { config } from '../../config/index';
import { errorHandler, notFoundHandler } from '../../shared/middleware/errorHandler';
import logger from '../../shared/utils/logger';
import { connectToDatabase } from '@shared/database';

const app = express();
const PORT = config.search?.port || 3003;

// Middleware
app.use(cors({
  origin: config.app.cors.origins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load OpenAPI specification
const openApiPath = path.join(__dirname, 'search-service.yaml');
const swaggerDocument = YAML.load(openApiPath);

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Search Service API Documentation'
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'search-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
// app.use('/', searchRoutes);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

async function startServer() {
  try {
    // Connessione al database
    await connectToDatabase();
    
    app.listen(PORT, () => {
      logger.info(`Search Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Search Service:', error);
    process.exit(1);
  }
}

startServer();

export default app;