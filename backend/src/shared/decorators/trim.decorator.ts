import { Transform } from 'class-transformer';

/**
 * Decorator che applica trim() automaticamente alle stringhe
 * Rimuove gli spazi all'inizio e alla fine dei valori stringa
 * 
 * @example
 * class MyDto {
 *   @Trim()
 *   @IsString()
 *   name: string;
 * }
 */
export function Trim() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  });
}
