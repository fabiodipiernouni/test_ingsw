import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, catchError, tap, map } from 'rxjs';
import { environment } from '@src/environments/environment';


import { AuthResponse } from '@core-services/auth/dto/AuthResponse';
import { ChangePasswordRequest } from '@core-services/auth/dto/ChangePasswordRequest';
import { ConfirmEmailRequest } from '@core-services/auth/dto/ConfirmEmailRequest';
import { ConfirmForgotPasswordRequest } from '@core-services/auth/dto/ConfirmForgotPasswordRequest';
import { CreateAdminRequest } from '@core-services/auth/dto/CreateAdminRequest';
import { CreateAgentRequest } from '@core-services/auth/dto/CreateAgentRequest';
import { ForgotPasswordRequest } from '@core-services/auth/dto/ForgotPasswordRequest';
import { LoginRequest } from '@core-services/auth/dto/LoginRequest';
import { RefreshTokenRequest } from '@core-services/auth/dto/RefreshTokenRequest';
import { RegisterRequest } from '@core-services/auth/dto/RegisterRequest';
import { ResendVerificationCodeRequest } from '@core-services/auth/dto/ResendVerificationCodeRequest';
import { UserResponse } from '@core-services/auth/dto/UserResponse';
import { OAuthProvider } from '@core-services/shared/types/auth.types';

import { ApiResponse } from '@service-shared/dto/ApiResponse';
import { RefreshTokenResponse } from '@core-services/auth/dto/RefreshTokenResponse';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserModel } from '@core-services/auth/models/UserModel';
import { AgencyResponse } from '@core-services/auth/dto/AgencyResponse';
import {AgencyModel} from '@service-shared/models/AgencyModel';

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

  constructor() {
    this.loadUserFromStorage();
  }

  // ===== PUBLIC METHODS =====

  /**
   * Registrazione nuovo utente
   */
  register(request: RegisterRequest): Observable<ApiResponse<null>> {

    return this.http.post<ApiResponse<null>>(`${this.API_URL}/register`, request)
      .pipe(
        tap(response => {
          if (response.success) {
            this.router.navigate(['/verify-email'], { queryParams: { email: request.email, codeSent: true } });
          }
          else {
            throw new Error(response.message || 'Registrazione fallita');
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Login utente
   */
  login(request: LoginRequest): Observable<ApiResponse<AuthResponse>> {

    return this.http.post<ApiResponse<AuthResponse>>(`${this.API_URL}/login`, request)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.handleAuthSuccess(response.data);
          } else {
            throw new Error(response.message || 'Login failed');
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Logout utente
   */
  logout() {
    // La chiamata al backend non è necessaria per il logout, i token scadranno da soli
    this.handleLogout();
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
  forgotPassword(request: ForgotPasswordRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.API_URL}/forgot-password`, request)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Conferma il reset della password
   */
  confirmForgotPassword(request: ConfirmForgotPasswordRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.API_URL}/confirm-forgot-password`, request)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Conferma email con codice di verifica
   */
  confirmEmail(request: ConfirmEmailRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.API_URL}/confirm-email`, request)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Reinvia codice di verifica email
   */
  resendVerificationCode(request: ResendVerificationCodeRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.API_URL}/resend-verification-code`, request)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Cambia password utente autenticato
   */
  changePassword(request: ChangePasswordRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.API_URL}/change-password`, request)
      .pipe(
        tap(response => {
          if (response.success) {
            // Aggiorna il flag passwordChangeRequired nel local storage
            const currentUser = this.getCurrentUser();
            if (currentUser) {
              currentUser.passwordChangeRequired = false;
              this.storeUser(currentUser);
              this.setAuthenticationState(currentUser);
            }
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Crea un nuovo amministratore (solo per owner)
   */
  createAdmin(request: CreateAdminRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.API_URL}/create-admin`, request)
      .pipe(catchError(this.handleError.bind(this)));
  }

  /**
   * Crea un nuovo agente (per owner e admin)
   */
  createAgent(request: CreateAgentRequest): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.API_URL}/create-agent`, request)
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
   *  Verifica se l'utente ha ruolo client
   */
  isClient(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'client';
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

  /**
   * Verifica se è il primo login dell'utente (richiesta cambio password)
   */
  isFirstLogin(): boolean {
    const user = this.getCurrentUser();
    return user?.lastLoginAt === undefined || user?.lastLoginAt === null;
  }

  // ===== PRIVATE METHODS =====

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
   * Gestisce il successo dell'autenticazione
   */
  handleAuthSuccess(authResponse: AuthResponse): void {
    this.storeTokens(authResponse.accessToken, authResponse.idToken, authResponse.refreshToken);
    const user = this.convertUserResponseToUserModel(authResponse.user);
    this.storeUser(user);
    this.setAuthenticationState(user);
  }

  /**
   * Converte AgencyResponse a AgencyModel
  */
  private convertAgencyResponseToAgencyModel(agencyResponse: AgencyResponse): AgencyModel {
    return {
      id: agencyResponse.id,
      name: agencyResponse.name,
      description: agencyResponse.description,
      address: agencyResponse.address,
      contacts: agencyResponse.contacts,
      logo: agencyResponse.logo,
      licenseNumber: agencyResponse.licenseNumber,
      isActive: agencyResponse.isActive,
      createdAt: new Date(agencyResponse.createdAt),
      updatedAt: new Date(agencyResponse.updatedAt),
    }
  }


  /**
   * Converte UserResponse a UserModel
   */
  private convertUserResponseToUserModel(userResponse: UserResponse): UserModel {
    const userModel: UserModel = {
      id: userResponse.id,
      email: userResponse.email,
      firstName: userResponse.firstName,
      lastName: userResponse.lastName,
      role: userResponse.role,
      avatar: userResponse.avatar, 
      phone: userResponse.phone,
      isVerified: userResponse.isVerified,
      passwordChangeRequired: userResponse.passwordChangeRequired,
      isActive: userResponse.isActive,
      lastLoginAt: userResponse.lastLoginAt ? new Date(userResponse.lastLoginAt) : undefined,
      linkedProviders: userResponse.linkedProviders,
      agency: userResponse.agency ? this.convertAgencyResponseToAgencyModel(userResponse.agency) : undefined,
      createdAt: new Date(userResponse.createdAt),
      updatedAt: new Date(userResponse.updatedAt),
      licenseNumber: userResponse.licenseNumber,
      biography: userResponse.biography,
      specializations: userResponse.specializations
    };
    return userModel;
  }

  /**
   * Gestisce il logout
   */
  private handleLogout(): void {
    this.clearTokens();
    this.clearUser();
    this.clearAuthenticationState();
    this.router.navigate(['/login']);
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

    return throwError(() => error);
  }
}
