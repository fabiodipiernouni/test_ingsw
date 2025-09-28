import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  User,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  RefreshTokenRequest,
  LinkOAuthRequest,
  OAuthLinkResponse,
  OAuthProvider,
  ErrorResponse,
  ChangePasswordRequest,
  ChangePasswordResponse
} from '@core/entities/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly API_URL = 'http://localhost:3001';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // Signal for reactive UI
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userJson = localStorage.getItem(this.USER_KEY);

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        this.setCurrentUser(user);
        this.validateToken().subscribe({
          next: (isValid) => {
            if (!isValid) {
              this.logout();
            }
          },
          error: () => this.logout()
        });
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        this.logout();
      }
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoading.set(true);

    return this.http.post<any>(`${this.API_URL}/login`, credentials).pipe(
      map(backendResponse => {
        // Map backend wrapped response to frontend AuthResponse format
        return {
          user: backendResponse.data.user,
          token: backendResponse.data.token,
          refreshToken: backendResponse.data.refreshToken,
          expiresIn: backendResponse.data.expiresIn,
          tokenType: backendResponse.data.tokenType,
          isNewUser: backendResponse.data.isNewUser,
          rememberMe: backendResponse.data.rememberMe
        } as AuthResponse;
      }),
      tap(response => {
        this.handleAuthSuccess(response);
      }),
      catchError(error => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    this.isLoading.set(true);

    return this.http.post<any>(`${this.API_URL}/register`, userData).pipe(
      map(backendResponse => {
        // Map backend wrapped response to frontend AuthResponse format
        return {
          user: backendResponse.data.user,
          token: backendResponse.data.token,
          refreshToken: backendResponse.data.refreshToken,
          expiresIn: backendResponse.data.expiresIn,
          tokenType: backendResponse.data.tokenType,
          isNewUser: backendResponse.data.isNewUser,
          rememberMe: backendResponse.data.rememberMe
        } as AuthResponse;
      }),
      tap(response => {
        this.handleAuthSuccess(response);
      }),
      catchError(error => {
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  logout(): Observable<void> {
    const token = this.getToken();
    if (token) {
      return this.http.post(`${this.API_URL}/logout`, {}, {
        observe: 'response',
        responseType: 'text'
      }).pipe(
        map(() => void 0), // Convert response to void
        tap(() => {
          this.clearAuthData();
        }),
        catchError(() => {
          // Even if API call fails, clear local data
          this.clearAuthData();
          return of(void 0);
        })
      );
    } else {
      this.clearAuthData();
      return of(void 0);
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expiry');
    this.setCurrentUser(null);
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const refreshRequest: RefreshTokenRequest = { refreshToken };

    return this.http.post<AuthResponse>(`${this.API_URL}/refresh`, refreshRequest).pipe(
      tap(response => {
        this.handleAuthSuccess(response);
      }),
      catchError(error => {
        // If refresh fails, logout user
        this.clearAuthData();
        return throwError(() => error);
      })
    );
  }

  validateToken(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      return of(false);
    }

    try {
      // Simple JWT validation (check expiry)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        // Try to refresh token
        return this.refreshToken().pipe(
          map(() => true),
          catchError(() => of(false))
        );
      }

      return of(true);
    } catch (error) {
      return of(false);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUser();
  }

  isAgent(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'agent';
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  private handleAuthSuccess(response: AuthResponse): void {
    console.log('Auth success - response:', response);
    console.log('Auth success - user data:', response.user);

    if (!response.user || !response.token) {
      console.error('Invalid auth response - missing user or token');
      return;
    }

    const user = response.user;
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));

    if (response.refreshToken) {
      localStorage.setItem('refresh_token', response.refreshToken);
    }

    // Store additional auth metadata
    if (response.expiresIn) {
      const expiryTime = new Date(Date.now() + response.expiresIn * 1000);
      localStorage.setItem('token_expiry', expiryTime.toISOString());
    }

    console.log('Data saved to localStorage:');
    console.log('- Token:', localStorage.getItem(this.TOKEN_KEY)?.substring(0, 20) + '...');
    console.log('- User:', localStorage.getItem(this.USER_KEY));

    this.setCurrentUser(user);
    this.isLoading.set(false);

    // Navigate based on user type and if it's a new user
    if (response.isNewUser) {
      this.router.navigate(['/onboarding']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  private setCurrentUser(user: User | null): void {
    console.log('Setting current user:', user);
    this.currentUser.set(user);
    this.isAuthenticated.set(!!user);
    this.currentUserSubject.next(user);
  }

  // Email verification
  verifyEmail(request: VerifyEmailRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/verify-email`, request);
  }

  // Password reset
  forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/forgot-password`, request);
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/reset-password`, request);
  }

  changePassword(request: ChangePasswordRequest): Observable<ChangePasswordResponse> {
    return this.http.post<ChangePasswordResponse>(`${this.API_URL}/change-password`, request);
  }

  // OAuth methods
  startOAuthFlow(provider: OAuthProvider, redirectUri?: string): void {
    let url = `${this.API_URL}/oauth/${provider}`;
    if (redirectUri) {
      url += `?redirect_uri=${encodeURIComponent(redirectUri)}`;
    }
    window.location.href = url;
  }

  handleOAuthSuccess(token: string, refreshToken?: string, user?: any, isNewUser?: boolean): void {
    const authResponse: AuthResponse = {
      user: user,
      token: token,
      refreshToken: refreshToken,
      expiresIn: 3600, // Default 1 hour
      tokenType: 'Bearer',
      isNewUser: isNewUser || false,
      rememberMe: false
    };

    this.handleAuthSuccess(authResponse);
  }

  linkOAuthAccount(provider: OAuthProvider, request: LinkOAuthRequest): Observable<OAuthLinkResponse> {
    return this.http.post<OAuthLinkResponse>(`${this.API_URL}/oauth/${provider}/link`, request);
  }

  unlinkOAuthAccount(provider: OAuthProvider): Observable<{success: boolean, message: string}> {
    return this.http.delete<{success: boolean, message: string}>(`${this.API_URL}/oauth/${provider}/unlink`);
  }

  // Utility method to check if user has specific OAuth provider linked
  hasLinkedProvider(provider: OAuthProvider): boolean {
    const user = this.getCurrentUser();
    return user?.linkedProviders?.includes(provider) ?? false;
  }
}
