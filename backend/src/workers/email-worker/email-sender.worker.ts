import * as cron from 'node-cron';
import { Notification } from '@shared/database/models/Notification';
import { User } from '@shared/database/models/User';
import { Agency } from '@shared/database/models/Agency';
import { emailService } from './services/EmailService';
import { emailWorkerConfig, emailWorkerOptions } from './config/worker.config';
import logger from '@shared/utils/logger';

export class EmailSenderWorker {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  /**
   * Utility per aggiungere un delay tra gli invii
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Avvia il worker con un intervallo specificato (default: ogni 5 minuti)
   * @param cronExpression Espressione cron
   */
  start(cronExpression: string = emailWorkerConfig.schedule): void {
    if (this.cronJob) {
      logger.warn('Email sender worker is already running');
      return;
    }

    logger.info(`Starting email sender worker with schedule: ${cronExpression}`);

    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.processUnsentNotifications();
    });

    logger.info('Email sender worker started successfully');

    if (emailWorkerConfig.runOnInit) {
      logger.info('Running initial email sending process on startup');
      this.processUnsentNotifications();
    }
  }

  /**
   * Ferma il worker
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Email sender worker stopped');
    }
  }

  /**
   * Processa le notifiche non ancora inviate
   */
  private async processUnsentNotifications(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Previous email sending process is still running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting to process unsent notifications');

      // Recupera solo un batch limitato di notifiche con sentAt = null
      const batchSize = emailWorkerOptions.batchSize;
      const unsentNotifications = await Notification.findAll({
        where: {
          sentAt: null
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'email', 'firstName', 'lastName']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'agencyId'],
            required: false,
            include: [
              {
                model: Agency,
                as: 'agency',
                attributes: ['id', 'name'],
                required: false
              }
            ]
          }
        ],
        order: [['createdAt', 'ASC']], // Invia prima le più vecchie
        limit: batchSize // Limita il numero di notifiche da processare
      });

      if (unsentNotifications.length === 0) {
        logger.info('No unsent notifications found');
        return;
      }

      // Conta il totale delle notifiche in attesa (per logging)
      const totalPending = await Notification.count({
        where: {
          sentAt: null
        }
      });

      logger.info(
        `Found ${unsentNotifications.length} notifications to process in this batch (${totalPending} total pending)`
      );

      let successCount = 0;
      let failureCount = 0;

      // Processa ogni notifica
      for (const notification of unsentNotifications) {
        try {
          const user = notification.user;

          if (!user?.email) {
            logger.error(`User not found or email missing for notification ${notification.id}`);
            failureCount++;
            continue;
          }

          // Invia l'email
          const agencyName = notification.creator?.agency?.name;
          logger.info(
            `Sending email for notification ${notification.id} to ${user.email}`
          );
          const emailSent = await emailService.sendNotificationEmail(
            user.email,
            notification.title,
            notification.message,
            notification.actionUrl,
            notification.imageUrl,
            agencyName
          );

          if (emailSent) {
            // Aggiorna sentAt con la data corrente
            notification.sentAt = new Date();
            await notification.save();

            logger.info(
              `Email sent successfully for notification ${notification.id} to ${user.email}`
            );
            successCount++;
            
            // Delay tra gli invii per evitare rate limiting SMTP
            // Non aggiungiamo delay dopo l'ultima email
            const isLastNotification = 
              successCount + failureCount === unsentNotifications.length;
            
            if (!isLastNotification) {
              logger.debug(`Waiting ${emailWorkerOptions.sendDelay}ms before next send...`);
              await this.sleep(emailWorkerOptions.sendDelay);
            }
          } else {
            logger.error(
              `Failed to send email for notification ${notification.id} to ${user.email}`
            );
            failureCount++;
          }
        } catch (error) {
          logger.error(
            `Error processing notification ${notification.id}:`,
            error
          );
          failureCount++;
        }
      }

      const duration = Date.now() - startTime;
      const remaining = totalPending - successCount;
      
      logger.info(
        `Email sending process completed in ${duration}ms. ` +
        `Success: ${successCount}, Failed: ${failureCount}, Remaining: ${remaining}`
      );
      
      if (remaining > 0) {
        logger.info(
          `There are still ${remaining} notifications pending. ` +
          `They will be processed in the next cycle.`
        );
      }
    } catch (error) {
      logger.error('Error in email sending process:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Restituisce lo stato del worker
   */
  getStatus(): { running: boolean; processing: boolean } {
    return {
      running: this.cronJob !== null,
      processing: this.isRunning,
    };
  }
}

// Export singleton instance
export const emailSenderWorker = new EmailSenderWorker();
