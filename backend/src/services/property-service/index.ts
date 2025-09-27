import express from 'express';
import cors from 'cors';
import { config } from '../../config/index';
import { errorHandler, notFoundHandler } from '../../shared/middleware/errorHandler';
import logger from '../../shared/utils/logger';
import { connectToDatabase } from '@shared/database';

const app = express();
const PORT = config.property?.port || 3002;

// Middleware
app.use(cors({
  origin: config.app.cors.origins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'property-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Routes
import propertyRoutes from './routes/properties';
app.use('/properties', propertyRoutes);

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