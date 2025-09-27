//TODO: cancellare elementi non usati
/**
 * Utility functions for password generation and management
 */

import crypto from 'crypto';

/**
 * Genera una password temporanea sicura
 * @param length Lunghezza della password (default: 12)
 * @returns Password sicura con caratteri misti
 */
export function generateSecurePassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '@$!%*?&';
  
  const allCharacters = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  
  // Assicura almeno un carattere da ogni categoria
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += symbols[crypto.randomInt(0, symbols.length)];
  
  // Riempie il resto della password con caratteri casuali
  for (let i = password.length; i < length; i++) {
    password += allCharacters[crypto.randomInt(0, allCharacters.length)];
  }
  
  // Mischia i caratteri per evitare pattern prevedibili
  return password
    .split('')
    .sort(() => crypto.randomInt(0, 2) - 0.5)
    .join('');
}

/**
 * Valida se una password soddisfa i requisiti di sicurezza
 * @param password Password da validare
 * @returns true se la password è valida, false altrimenti
 */
export function validatePasswordStrength(password: string): boolean {
  const minLength = 8;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  
  return (
    password.length >= minLength &&
    hasLowercase &&
    hasUppercase &&
    hasNumbers &&
    hasSpecialChar
  );
}

/**
 * Genera un token sicuro per reset password o verifica email
 * @param length Lunghezza del token (default: 32)
 * @returns Token esadecimale sicuro
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}