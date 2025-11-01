/**
 * Configurazione specifica per l'email worker
 * Tutte le configurazioni sono lette dal file .env principale
 */

/**
 * Configurazione SMTP per l'invio email
 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

/**
 * Configurazione SMTP letta dal .env principale
 */
export const emailConfig: EmailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  user: process.env.SMTP_USER || '',
  password: process.env.SMTP_PASSWORD || '',
  from: process.env.EMAIL_FROM || 'noreply@dietiestates25.com',
};

export interface WorkerConfig {
  schedule: string;
  timezone?: string;
  runOnInit?: boolean;
}

/**
 * Schedule predefiniti per il cron
 * Formato cron: minute hour day month weekday
 */
export const CRON_SCHEDULES = {
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_10_MINUTES: '*/10 * * * *',
  EVERY_15_MINUTES: '*/15 * * * *',
  EVERY_30_MINUTES: '*/30 * * * *',
  EVERY_HOUR: '0 * * * *',
  EVERY_DAY_MIDNIGHT: '0 0 * * *',
  EVERY_WEEKDAY_9AM: '0 9 * * 1-5',
} as const;

/**
 * Configurazione di default per l'email worker
 */
export const emailWorkerConfig: WorkerConfig = {
  schedule: process.env.EMAIL_WORKER_CRON || CRON_SCHEDULES.EVERY_5_MINUTES,
  timezone: process.env.EMAIL_WORKER_TIMEZONE || 'Europe/Rome',
  runOnInit: process.env.EMAIL_WORKER_RUN_ON_INIT === 'true',
};

/**
 * Opzioni avanzate per il processing delle notifiche
 */
export const emailWorkerOptions = {
  // Numero massimo di tentativi per l'invio di una singola email
  maxRetries: parseInt(process.env.EMAIL_WORKER_MAX_RETRIES || '3'),
  
  // Delay in millisecondi tra un invio e l'altro (rate limiting)
  sendDelay: parseInt(process.env.EMAIL_WORKER_SEND_DELAY || '1000'),
  
  // Delay in millisecondi tra tentativi falliti
  retryDelay: parseInt(process.env.EMAIL_WORKER_RETRY_DELAY || '5000'),
  
  // Numero di notifiche da processare per batch
  batchSize: parseInt(process.env.EMAIL_WORKER_BATCH_SIZE || '10'),
  
  // Timeout massimo per il processo di invio in millisecondi
  timeout: parseInt(process.env.EMAIL_WORKER_TIMEOUT || '60000'),
};
