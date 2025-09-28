import express from 'express';
import cors from 'cors';
import { config } from '../../config/index';
import { errorHandler, notFoundHandler } from '../../shared/middleware/errorHandler';
import authRoutes from './routes/auth';
import logger from '../../shared/utils/logger';
import { connectToDatabase } from '@shared/database';

const app = express();
const PORT = config.auth.port || 3001;

// Middleware
app.use(cors({
  origin: config.app.cors.origins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'auth-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

async function startServer() {
  try {
    // Connessione al database
    await connectToDatabase();
    
    app.listen(PORT, () => {
      logger.info(`Auth Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Auth Service:', error);
    process.exit(1);
  }
}

startServer();

export default app;