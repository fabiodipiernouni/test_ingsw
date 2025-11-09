import dotenv from 'dotenv';
dotenv.config();

/**
 * Configurazione per il Property Matcher Worker
 * 
 * Questo worker viene eseguito giornalmente per trovare nuove proprietà
 * che matchano con le ricerche salvate degli utenti e creare le notifiche
 */

export const propertyMatcherWorkerConfig = {
  // Schedule cron: ogni giorno alle 2:00 AM
  // Formato: secondi minuti ore giorno mese giorno-settimana
  schedule: process.env.PROPERTY_MATCHER_SCHEDULE || '0 2 * * *',
  
  // Timezone per l'esecuzione (opzionale)
  timezone: process.env.PROPERTY_MATCHER_TIMEZONE || 'Europe/Rome',
  
  // Esegui immediatamente all'avvio (utile per sviluppo e test)
  runOnInit: process.env.PROPERTY_MATCHER_RUN_ON_INIT === 'true'
};

export const propertyMatcherWorkerOptions = {
  // Numero massimo di ricerche salvate da processare per batch
  savedSearchBatchSize: Number.parseInt(process.env.PROPERTY_MATCHER_SAVED_SEARCH_BATCH_SIZE || '50', 10),
  
  // Delay in millisecondi tra i batch (per non sovraccaricare il DB)
  batchDelay: Number.parseInt(process.env.PROPERTY_MATCHER_BATCH_DELAY || '100', 10)

};

/**
 * Validazione configurazione
 */
export function validateConfig(): void {
  if (propertyMatcherWorkerOptions.savedSearchBatchSize < 1) {
    throw new Error('PROPERTY_MATCHER_SAVED_SEARCH_BATCH_SIZE must be at least 1');
  }
}
