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
  port: Number.parseInt(process.env.SMTP_PORT || '587'),
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
 * Configurazione di default per l'email worker
 */
export const emailWorkerConfig: WorkerConfig = {
  schedule: process.env.EMAIL_WORKER_CRON || '*/5 * * * *',
  timezone: process.env.EMAIL_WORKER_TIMEZONE || 'Europe/Rome',
  runOnInit: process.env.EMAIL_WORKER_RUN_ON_INIT === 'true',
};

/**
 * Opzioni avanzate per il processing delle notifiche
 */
export const emailWorkerOptions = {

  // Delay in millisecondi tra un invio e l'altro (rate limiting)
  sendDelay: Number.parseInt(process.env.EMAIL_WORKER_SEND_DELAY || '1000'),
  
  // Numero di notifiche da processare per batch
  batchSize: Number.parseInt(process.env.EMAIL_WORKER_BATCH_SIZE || '10'),
  
};
