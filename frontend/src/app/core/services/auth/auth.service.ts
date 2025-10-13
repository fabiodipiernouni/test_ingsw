import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, catchError, tap, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { UserModel } from './models/UserModel';

import { AuthResponseUser, AuthResponseChallenge, AuthResponse } from './dto/AuthResponse';
import { ChangePasswordRequest } from './dto/ChangePasswordRequest';
import { CompleteNewPasswordRequest } from './dto/CompleteNewPasswordRequest';
import { ConfirmEmailRequest } from './dto/ConfirmEmailRequest';
import { ConfirmForgotPasswordRequest } from './dto/ConfirmForgotPasswordRequest';
import { ForgotPasswordRequest } from './dto/ForgotPasswordRequest';
import { LoginRequest } from './dto/LoginRequest';
import { RefreshTokenRequest } from './dto/RefreshTokenRequest';
import { RegisterRequest } from './dto/RegisterRequest';
import { ResendVerificationCodeRequest } from './dto/ResendVerificationCodeRequest';
import { UserResponse } from './dto/UserResponse';
import { OAuthProvider } from './models/OAuthProvider';

import { ApiResponse } from '../shared/dto/ApiResponse';
import { RefreshTokenResponse } from './dto/RefreshTokenResponse';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private snackBar = inject(MatSnackBar);

  private readonly API_URL = environment.apiUrlAuth;
  private readonly ACCESS_TOKEN_KEY = 'auth_access_token';
  private readonly REFRESH_TOKEN_KEY = 'auth_refresh_token';
  private readonly ID_TOKEN_KEY = 'auth_id_token';
  private readonly USER_KEY = 'auth_user';

  // State management
  private currentUserSubject = new BehaviorSubject<UserModel | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Signals for reactive UI
  currentUser = signal<UserModel | null>(null);
  isAuthenticated = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  constructor() {
    this.loadUserFromStorage();
  }

  // ===== PUBLIC METHODS =====

  /**
   * Registrazione nuovo utente
   */
  register(request: RegisterRequest): Observable<ApiResponse> {
    this.isLoading.set(true);
    
    return this.http.post<ApiResponse>(`${this.API_URL}/register`, request)
      .pipe(
        tap(response => {
          if (response.success) {
            this.snackBar.open('Registration successful', 'Close', { duration: 5000 });
            this.router.navigate(['/auth/login']);
          }
          else {
            throw new Error(response.message || 'Registration failed');
          }
        }),
        catchError(this.handleError.bind(this)),
        tap(() => this.isLoading.set(false))
      );
  }

  /**
   * Login utente
   */
  login(request: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    this.isLoading.set(true);
    
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/login`, request)
      .pipe(
        tap(response => this.handleApiAuthResponse(response)),
        catchError(this.handleError.bind(this)),
        tap(() => this.isLoading.set(false))
      );
  }

  /**
   * Completa la challenge NEW_PASSWORD_REQUIRED
   */
  completeNewPassword(request: CompleteNewPasswordRequest): Observable<ApiResponse<AuthResponse>> {
    this.isLoading.set(true);
    
    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/complete-new-password`, request)
      .pipe(
        tap(response => this.handleApiAuthResponse(response)),
        catchError(this.handleError.bind(this)),
        tap(() => this.isLoading.set(false))
      );
  }

  /**
   * Logout utente
   */
  logout(): Observable<ApiResponse> {
    const accessToken = this.getAccessToken();
    const headers = accessToken ? new HttpHeaders().set('Authorization', `Bearer ${accessToken}`) : undefined;
    
    return this.http.post<ApiResponse>(`${this.API_URL}/logout`, {}, { headers })
      .pipe(
        tap(() => this.handleLogout()),
        catchError((error) => {
          // Anche se il logout fallisce, rimuoviamo i dati locali
          this.handleLogout();
          return throwError(() => error);
        })
      );
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
        }),
        catchError((error) => {
          // Se il refresh fallisce, facciamo logout
          this.handleLogout();
          return throwError(() => error);
        })
      );
  }

  /**
   * Inizia il processo di recupero password
   */
  forgotPassword(request: ForgotPasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/forgot-password`, request)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Conferma il reset della password
   */
  confirmForgotPassword(request: ConfirmForgotPasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/confirm-forgot-password`, request)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Conferma email con codice di verifica
   */
  confirmEmail(request: ConfirmEmailRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/confirm-email`, request)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Reinvia codice di verifica email
   */
  resendVerificationCode(request: ResendVerificationCodeRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/resend-verification-code`, request)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Cambia password utente autenticato
   */
  changePassword(request: ChangePasswordRequest): Observable<ApiResponse> {
    const accessToken = this.getAccessToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${accessToken}`);
    
    return this.http.post<ApiResponse>(`${this.API_URL}/change-password`, request, { headers })
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Inizia autenticazione OAuth (redirect)
   */
  startOAuthAuthentication(provider: OAuthProvider, state?: string): void {
    const params = new URLSearchParams({ provider });
    if (state) {
      params.append('state', state);
    }
    
    window.location.href = `${this.API_URL}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Gestisce le challenge di autenticazione e naviga alla pagina appropriata
   */
  handleChallenge(challenge: AuthResponseChallenge['challenge']): void {
    const challengeName = challenge.name;
    const session = challenge.session;

    switch (challengeName) {
      // TODO
      default:
        // Challenge non supportata
        console.error('Unsupported challenge type:', challengeName);
        this.snackBar.open(
          `Authentication challenge not supported: ${challengeName}`,
          'Close',
          {
            duration: 5000,
            panelClass: ['error-snackbar']
          }
        );
        this.router.navigate(['/auth/login']);
        break;
    }
  }

  // ===== TOKEN MANAGEMENT =====

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
   * Verifica se l'utente è autenticato
   */
  isUserAuthenticated(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Ottieni utente corrente
   */
  getCurrentUser(): UserModel | null {
    return this.currentUser();
  }

  /**
   *  Verifica se l'utente ha ruolo agent
   */
  isAgent(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'agent';
  }

  /**
   *  Verifica se l'utente ha ruolo admin
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  /**
   *  Verifica se l'utente è owner
    */
  isOwner(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'owner';
  }

  // ===== PRIVATE METHODS =====
  private handleApiAuthResponse(response: ApiResponse<AuthResponse>): void {
    if (response.success && response.data) {
      if ('challenge' in response.data) {
        this.handleChallenge(response.data.challenge);
      }
      else {
        this.handleAuthSuccess(response.data);
      }
    }
    else {
      throw new Error(response.message || 'Authentication failed');
    }
  }

  /**
   * Carica utente dallo storage
   */
  private loadUserFromStorage(): void {
    const accessToken = this.getAccessToken();
    const userJson = localStorage.getItem(this.USER_KEY);

    if (accessToken && userJson) {
      try {
        const user: UserModel = JSON.parse(userJson);
        this.setAuthenticationState(user);
      } catch (error) {
        console.error('Error parsing user from storage:', error);
        this.clearAuthenticationState();
      }
    }
  }

  /**
   * Converte UserResponse a User
   */
  private convertToUser(userResponse: UserResponse): UserModel {

    return {
      id: userResponse.id,
      email: userResponse.email,
      firstName: userResponse.firstName,
      lastName: userResponse.lastName,
      role: userResponse.role,
      avatar: undefined, // TODO
      phone: userResponse.phone,
      isVerified: userResponse.isVerified,
      isActive: userResponse.isActive,
      linkedProviders: [], // TODO
      lastLoginAt: undefined, // TODO
      agency: undefined, // TODO
      createdAt: new Date(userResponse.createdAt),
      updatedAt: new Date(userResponse.updatedAt),
    };
  }

  /**
   * Gestisce il successo dell'autenticazione
   */
  private handleAuthSuccess(authResponse: AuthResponseUser): void {
    this.storeTokens(authResponse.accessToken, authResponse.idToken, authResponse.refreshToken);
    const user = this.convertToUser(authResponse.user);
    this.storeUser(user);
    this.setAuthenticationState(user);
  }

  /**
   * Gestisce il logout
   */
  private handleLogout(): void {
    this.clearTokens();
    this.clearUser();
    this.clearAuthenticationState();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Salva i token nel localStorage
   */
  private storeTokens(accessToken: string, idToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.ID_TOKEN_KEY, idToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Aggiorna i token nel localStorage
   */
  private updateTokens(accessToken: string, idToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.ID_TOKEN_KEY, idToken);
    // Il refresh token rimane lo stesso se non fornito
    if (refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  /**
   * Salva l'utente nel localStorage
   */
  private storeUser(user: UserModel): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Imposta lo stato di autenticazione
   */
  private setAuthenticationState(user: UserModel): void {
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
    this.currentUserSubject.next(user);
  }

  /**
   * Pulisce lo stato di autenticazione
   */
  private clearAuthenticationState(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.currentUserSubject.next(null);
  }

  /**
   * Rimuove i token dal localStorage
   */
  private clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.ID_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Rimuove l'utente dal localStorage
   */
  private clearUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Gestisce gli errori delle richieste HTTP
   */
  private handleError(error: any): Observable<never> {
    console.error('Auth service error:', error);
    
    // Se è un 401, probabilmente il token è scaduto
    if (error.status === 401) {
      this.handleLogout();
    }
    
    return throwError(() => error);
  }
}