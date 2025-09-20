import express from 'express';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { config } from '../../config/index';
import { setupPassportStrategies } from '../../shared/middleware/auth';
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

// Session configuration
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.app.env === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 ore
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Configurazione strategie Passport
setupPassportStrategies();

// Load OpenAPI specification
const openApiPath = path.join(__dirname, 'auth-service.yaml');
const swaggerDocument = YAML.load(openApiPath);

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Auth Service API Documentation'
}));

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