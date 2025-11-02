import { Transform } from 'class-transformer';

/**
 * Decorator che applica toLowerCase() automaticamente alle stringhe
 * Rimuove gli spazi all'inizio e alla fine dei valori stringa
 */
export function ToLowerCase() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    return value;
  });
}
