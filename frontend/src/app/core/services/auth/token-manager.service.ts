import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, tap, interval, Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '@src/environments/environment';
import { RefreshTokenRequest } from '@core-services/auth/dto/RefreshTokenRequest';
import { RefreshTokenResponse } from '@core-services/auth/dto/RefreshTokenResponse';
import { ApiResponse } from '@service-shared/dto/ApiResponse';

/**
 * Servizio responsabile della gestione completa dei token JWT:
 * - Storage e recupero token
 * - Decodifica JWT
 * - Controllo scadenza periodico
 * - Refresh automatico
 * - Notifiche all'utente
 */
@Injectable({
  providedIn: 'root'
})
export class TokenManagerService {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  private readonly API_URL = environment.apiUrlAuth;

  // Storage keys
  private readonly ACCESS_TOKEN_KEY = 'auth_access_token';
  private readonly REFRESH_TOKEN_KEY = 'auth_refresh_token';
  private readonly ID_TOKEN_KEY = 'auth_id_token';

  // Token expiration configuration (in milliseconds)
  private readonly TOKEN_CHECK_INTERVAL = 60000; // Controlla ogni minuto
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // Rinnova se mancano meno di 5 minuti
  private readonly TOKEN_WARNING_THRESHOLD = 2 * 60 * 1000; // Avvisa se mancano meno di 2 minuti

  private tokenCheckSubscription?: Subscription;

  // Segnale per avvisare l'UI che il token sta per scadere
  tokenExpiringWarning = signal<boolean>(false);

  // Callbacks
  private onTokenExpiredCallback?: () => void;

  // ===== PUBLIC METHODS =====

  /**
   * Imposta il callback da chiamare quando il token è scaduto e il refresh fallisce
   */
  setOnTokenExpiredCallback(callback: () => void): void {
    this.onTokenExpiredCallback = callback;
  }

  /**
   * Salva i token nel localStorage
   */
  storeTokens(accessToken: string, idToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.ID_TOKEN_KEY, idToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Aggiorna i token nel localStorage
   */
  updateTokens(accessToken: string, idToken: string, refreshToken?: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.ID_TOKEN_KEY, idToken);
    // Il refresh token rimane lo stesso se non fornito
    if (refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  /**
   * Ottieni access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Ottieni refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Ottieni ID token
   */
  getIdToken(): string | null {
    return localStorage.getItem(this.ID_TOKEN_KEY);
  }

  /**
   * Rimuove tutti i token dal localStorage
   */
  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.ID_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Verifica se esiste un access token valido
   */
  hasValidToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    return !this.isTokenExpired(token);
  }

  /**
   * Avvia il controllo periodico della scadenza del token
   */
  startTokenExpirationCheck(): void {
    // Ferma eventuali controlli precedenti
    this.stopTokenExpirationCheck();

    // Avvia un nuovo intervallo di controllo
    this.tokenCheckSubscription = interval(this.TOKEN_CHECK_INTERVAL).subscribe(() => {
      this.checkTokenExpiration();
    });

    // Esegui un controllo immediato
    this.checkTokenExpiration();
  }

  /**
   * Ferma il controllo periodico della scadenza del token
   */
  stopTokenExpirationCheck(): void {
    if (this.tokenCheckSubscription) {
      this.tokenCheckSubscription.unsubscribe();
      this.tokenCheckSubscription = undefined;
    }
    this.tokenExpiringWarning.set(false);
  }

  /**
   * Refresh del token di accesso
   */
  refreshToken(): Observable<ApiResponse<RefreshTokenResponse>> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const request: RefreshTokenRequest = { refreshToken };

    return this.http.post<ApiResponse<RefreshTokenResponse>>(`${this.API_URL}/refresh-token`, request)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.updateTokens(response.data.accessToken, response.data.idToken, refreshToken);
          }
        })
      );
  }

  /**
   * Rinnova manualmente la sessione (può essere chiamato dall'UI)
   */
  renewSession(): Observable<ApiResponse<RefreshTokenResponse>> {
    console.log('Rinnovo manuale della sessione richiesto dall\'utente');
    return this.refreshToken().pipe(
      tap(() => {
        this.snackBar.open(
          'Sessione rinnovata con successo',
          'OK',
          {
            duration: 3000,
            panelClass: ['success-snackbar']
          }
        );
        this.tokenExpiringWarning.set(false);
      })
    );
  }

  /**
   * Ottiene informazioni sul token (tempo rimanente, scadenza, ecc.)
   */
  getTokenInfo(): { expiresAt: Date | null; timeRemaining: number; isExpired: boolean } | null {
    const token = this.getAccessToken();
    if (!token) return null;

    const expiration = this.getTokenExpiration(token);
    if (!expiration) return null;

    const now = Date.now();
    return {
      expiresAt: new Date(expiration),
      timeRemaining: Math.max(0, expiration - now),
      isExpired: now >= expiration
    };
  }

  // ===== PRIVATE METHODS =====

  /**
   * Decodifica un JWT per estrarre il payload
   */
  private decodeToken(token: string): { exp?: number } | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload) as { exp?: number };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Ottiene il timestamp di scadenza del token (in millisecondi)
   */
  private getTokenExpiration(token: string): number | null {
    const decoded = this.decodeToken(token);
    if (decoded?.exp) {
      return decoded.exp * 1000; // Converti da secondi a millisecondi
    }
    return null;
  }

  /**
   * Verifica se il token sta per scadere
   */
  private isTokenExpiringSoon(token: string, thresholdMs: number): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return false;

    const timeUntilExpiration = expiration - Date.now();
    return timeUntilExpiration > 0 && timeUntilExpiration < thresholdMs;
  }

  /**
   * Verifica se il token è già scaduto
   */
  private isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;

    return Date.now() >= expiration;
  }

  /**
   * Controlla la scadenza del token e prende le azioni necessarie
   */
  private checkTokenExpiration(): void {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      return; // Nessun token, niente da fare
    }

    // Verifica se il token è già scaduto
    if (this.isTokenExpired(accessToken)) {
      console.warn('Token scaduto rilevato durante il controllo periodico');
      this.attemptTokenRefresh('Token scaduto');
      return;
    }

    // Verifica se il token sta per scadere e necessita refresh
    if (this.isTokenExpiringSoon(accessToken, this.TOKEN_REFRESH_THRESHOLD)) {
      console.log('Token in scadenza - avvio refresh automatico');
      this.attemptTokenRefresh('Refresh preventivo');
      return;
    }

    // Verifica se mostrare il warning all'utente
    if (this.isTokenExpiringSoon(accessToken, this.TOKEN_WARNING_THRESHOLD)) {
      this.tokenExpiringWarning.set(true);
      this.showTokenExpiringNotification();
    } else {
      this.tokenExpiringWarning.set(false);
    }
  }

  /**
   * Tenta il refresh del token
   */
  private attemptTokenRefresh(reason: string): void {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      console.warn(`${reason} - Nessun refresh token disponibile, logout necessario`);
      this.handleTokenExpired(); // Il callback mostrerà la notifica
      return;
    }

    console.log(`${reason} - Tentativo di refresh del token`);

    this.refreshToken().subscribe({
      next: () => {
        console.log('Token rinnovato con successo');
        this.tokenExpiringWarning.set(false);
      },
      error: (error) => {
        console.error('Errore durante il refresh del token:', error);
        this.handleTokenExpired(); // Il callback mostrerà la notifica
      }
    });
  }

  /**
   * Gestisce il caso in cui il token è scaduto e non può essere rinnovato
   */
  private handleTokenExpired(): void {
    if (this.onTokenExpiredCallback) {
      this.onTokenExpiredCallback();
    }
  }

  /**
   * Mostra una notifica all'utente che la sessione sta per scadere
   */
  private showTokenExpiringNotification(): void {
    // Mostra solo una volta
    if (this.tokenExpiringWarning()) {
      return;
    }

    this.snackBar.open(
      'La tua sessione sta per scadere. Salva il tuo lavoro.',
      'OK',
      {
        duration: 10000,
        panelClass: ['warning-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'top'
      }
    );
  }

  /**
   * Mostra una notifica all'utente che la sessione è scaduta
   */
  showSessionExpiredNotification(): void {
    this.snackBar.open(
      'La tua sessione è scaduta. Effettua nuovamente il login.',
      'OK',
      {
        duration: 5000,
        panelClass: ['error-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'top'
      }
    );
  }
}

