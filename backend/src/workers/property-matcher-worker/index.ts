import 'reflect-metadata';
import dotenv from 'dotenv';
import { database } from '@shared/database';
import { propertyMatcherWorker } from './property-matcher.worker';
import { propertyMatcherWorkerConfig, validateConfig } from './config/worker.config';
import logger from '@shared/utils/logger';

// Carica le variabili d'ambiente
dotenv.config();

async function startWorker() {
  try {
    logger.info('='.repeat(70));
    logger.info('Starting Property Matcher Worker');
    logger.info('='.repeat(70));

    // Valida la configurazione
    logger.info('Validating configuration...');
    validateConfig();
    logger.info('Configuration validated successfully');

    // Log configurazione
    logger.info('Worker Configuration:', {
      schedule: propertyMatcherWorkerConfig.schedule,
      timezone: propertyMatcherWorkerConfig.timezone,
      runOnInit: propertyMatcherWorkerConfig.runOnInit
    });

    // Connessione al database
    logger.info('Connecting to database...');
    await database.connect();
    logger.info('Database connection established successfully');

    // Sincronizza i modelli (senza alterare lo schema in produzione)
    if (process.env.NODE_ENV !== 'production') {
      await database.sequelize.sync();
      logger.info('Database models synchronized');
    }

    // Ottieni l'espressione cron dalla configurazione
    const cronSchedule = propertyMatcherWorkerConfig.schedule;
    
    logger.info(`Worker will run with schedule: ${cronSchedule}`);
    if (propertyMatcherWorkerConfig.timezone) {
      logger.info(`Timezone: ${propertyMatcherWorkerConfig.timezone}`);
    }

    // Avvia il worker
    propertyMatcherWorker.start(cronSchedule);

    logger.info('Property Matcher Worker is now running');
    logger.info('Press Ctrl+C to stop the worker');

    // Gestione graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      // Ferma il worker
      propertyMatcherWorker.stop();
      
      // Chiudi la connessione al database
      try {
        await database.disconnect();
        logger.info('Database connection closed');
      } catch (error) {
        logger.error('Error closing database connection:', error);
      }
      
      logger.info('Worker stopped successfully');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start Property Matcher Worker:', error);
    process.exit(1);
  }
}

// Avvia il worker
startWorker();
