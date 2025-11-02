import * as cron from 'node-cron';
import { propertyMatcherService } from './services/PropertyMatcherService';
import { propertyMatcherWorkerConfig, propertyMatcherWorkerOptions } from './config/worker.config';
import logger from '@shared/utils/logger';

/**
 * Worker per il matching automatico tra nuove proprietà e ricerche salvate
 * 
 * Questo worker:
 * 1. Viene eseguito giornalmente (configurabile)
 * 2. Per ogni ricerca salvata con notifiche attive, cerca le proprietà create dalla data di ultima ricerca fino ad ora
 * 3. Crea le notifiche per gli utenti interessati
 * 4. Le notifiche vengono poi inviate dall'email-worker
 */
export class PropertyMatcherWorker {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  /**
   * Utility per aggiungere un delay tra i batch
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Avvia il worker con lo schedule configurato
   */
  start(cronExpression: string = propertyMatcherWorkerConfig.schedule): void {
    if (this.cronJob) {
      logger.warn('Property matcher worker is already running');
      return;
    }

    logger.info(`Starting property matcher worker with schedule: ${cronExpression}`);
    if (propertyMatcherWorkerConfig.timezone) {
      logger.info(`Timezone: ${propertyMatcherWorkerConfig.timezone}`);
    }

    this.cronJob = cron.schedule(
      cronExpression,
      async () => {
        await this.processPropertyMatches();
      },
      {
        timezone: propertyMatcherWorkerConfig.timezone
      }
    );

    logger.info('Property matcher worker started successfully');

    if (propertyMatcherWorkerConfig.runOnInit) {
      logger.info('Running initial property matching process on startup');
      this.processPropertyMatches();
    }
  }

  /**
   * Ferma il worker
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Property matcher worker stopped');
    }
  }

  /**
   * Processo principale: matcha le proprietà con le ricerche salvate
   */
  private async processPropertyMatches(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Previous property matching process is still running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    const overallStartTime = Date.now();

    try {
      logger.info('='.repeat(70));
      logger.info('Starting Property Matcher Worker Process');
      logger.info('='.repeat(70));
      logger.info('Note: Per ogni ricerca salvata, verifichiamo le proprietà create dalla data di ultima ricerca fino ad ora');

      // Statistiche generali
      let processedCount = 0;
      let successCount = 0;
      let failureCount = 0;
      let totalNotificationsCreated = 0;
      let searchesWithMatches = 0;

      // Processa le ricerche salvate in batch usando pagination
      const batchSize = propertyMatcherWorkerOptions.savedSearchBatchSize;
      let offset = 0;
      let hasMoreSearches = true;

      while (hasMoreSearches) {
        logger.info(`Processing batch: offset ${offset}, limit ${batchSize}`);

        // Recupera il batch di ricerche salvate
        const savedSearches = await propertyMatcherService.getActiveSavedSearches(
          offset,
          batchSize
        );

        if (savedSearches.length === 0) {
          hasMoreSearches = false;
          break;
        }

        // Processa ogni ricerca salvata nel batch
        for (const savedSearch of savedSearches) {
          try {
            const result = await propertyMatcherService.processSavedSearch(savedSearch);
            
            if (result.notificationCreated) {
              totalNotificationsCreated++;
              
              if (result.hasMatches) {
                searchesWithMatches++;
              }
            }
            
            successCount++;
          } catch (error) {
            logger.error(`Failed to process saved search ${savedSearch.id}:`, error);
            failureCount++;
          }

          processedCount++;
        }

        // Se abbiamo ricevuto meno risultati del batch size, non ci sono più ricerche
        if (savedSearches.length < batchSize) {
          hasMoreSearches = false;
        }

        // Incrementa offset per il prossimo batch
        offset += batchSize;
        
        // Delay tra i batch per non sovraccaricare il database
        if (hasMoreSearches && propertyMatcherWorkerOptions.batchDelay > 0) {
          logger.debug(`Waiting ${propertyMatcherWorkerOptions.batchDelay}ms before next batch...`);
          await this.sleep(propertyMatcherWorkerOptions.batchDelay);
        }
      }

      const overallDuration = Date.now() - overallStartTime;

      // Log finale con statistiche
      logger.info('='.repeat(70));
      logger.info('Property Matcher Worker Process Completed');
      logger.info('='.repeat(70));
      logger.info('Summary:', {
        processedCount,
        successCount,
        failureCount,
        searchesWithMatches,
        totalNotificationsCreated,
        durationMs: overallDuration,
        durationSeconds: (overallDuration / 1000).toFixed(2),
        avgTimePerSearch: processedCount > 0 ? (overallDuration / processedCount).toFixed(2) : 0
      });

      if (failureCount > 0) {
        logger.warn(`${failureCount} saved searches failed to process. Check logs for details.`);
      }

      if (totalNotificationsCreated === 0) {
        logger.info('No new properties found matching any saved search');
      } else {
        logger.info(`✓ Created ${totalNotificationsCreated} notifications for ${searchesWithMatches} saved searches with new property matches`);
      }

    } catch (error) {
      logger.error('Fatal error in property matcher worker:', error);
    } finally {
      this.isRunning = false;
      logger.info('Property matcher worker process finished');
    }
  }

}

export const propertyMatcherWorker = new PropertyMatcherWorker();
