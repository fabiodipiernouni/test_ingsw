import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, switchMap, catchError } from 'rxjs';
import { AuthService } from '@core-services//auth/auth.service';
import { environment } from '@src/environments/environment';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<any> => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  // Aggiungi il token alle richieste che non sono di autenticazione
  if (token && !isAuthEndpoint(req.url)) {
    req = req.clone({
      setHeaders: {
        Authorization: 'Bearer ' + token
      }
    });
  }

  return next(req).pipe(
    catchError(error => {
      // Handle token expiration or user not found
      if (error.error?.error === 'TOKEN_EXPIRED' && !isAuthEndpoint(req.url)) {

        // Handle token expiration
        console.warn('Received 401 Unauthorized response');

        const refreshToken = authService.getRefreshToken();

        if (refreshToken && !req.url.includes('/refresh-token')) {
          // Attempt token refresh
          return authService.refreshToken().pipe(
            switchMap(() => {
              // Retry the original request with new token
              const newToken = authService.getAccessToken();
              const retryReq = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${newToken}`)
              });
              return next(retryReq);
            }),
            catchError(refreshError => {
              if (refreshError.error?.error === 'TOKEN_EXPIRED') {
                console.warn('Refresh token also expired, logging out user');
                authService.logout(true); // true = mostra notifica sessione scaduta
              }
              return throwError(() => refreshError);
            })
          );
        } else {
          // No refresh token or already trying to refresh, logout user
          authService.logout(true); // true = mostra notifica sessione scaduta
        }
      }

      if (error.error?.error === 'USER_NOT_REGISTERED') {
        authService.logout(); // Logout normale senza notifica di scadenza
      }

      // For other errors, just pass through
      return throwError(() => error);
    })
  );
};

/**
 * Verifica se l'URL è un endpoint di autenticazione che non richiede token
 */
function isAuthEndpoint(url: string): boolean {
  // Controlla se l'URL appartiene al servizio di autenticazione
  if (!url.startsWith(environment.apiUrlAuth)) {
    return false;
  }

  // Lista degli endpoint che non richiedono autenticazione
  const publicAuthEndpoints = [
    '/login',
    '/register',
    '/refresh-token',
    '/forgot-password',
    '/confirm-forgot-password',
    '/confirm-email',
    '/resend-verification-code',
    '/oauth/',
    '/health'
  ];

  // Estrai il path dall'URL completo
  const authBaseUrl = environment.apiUrlAuth;
  const path = url.replace(authBaseUrl, '');

  return publicAuthEndpoints.some(endpoint => path.startsWith(endpoint));
}
