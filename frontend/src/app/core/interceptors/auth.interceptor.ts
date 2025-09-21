import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError, switchMap, catchError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<any> => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    // Clone the request and add the Authorization header with the token
    req = req.clone({
      setHeaders: {
        Authorization: 'Bearer ' + token
      }
    });
  }

  return next(req).pipe(
    catchError(error => {
      // Handle 401 Unauthorized errors (but not for logout endpoint)
      if (error.status === 401) {
        console.warn('Received 401 Unauthorized response');
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (refreshToken && !req.url.includes('/refresh')) {
          // Attempt token refresh
          return authService.refreshToken().pipe(
            switchMap(() => {
              // Retry the original request with new token
              const newToken = authService.getToken();
              const retryReq = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${newToken}`)
              });
              return next(retryReq);
            }),
            catchError(refreshError => {
              // Refresh failed, logout user
              authService.logout().subscribe();
              return throwError(() => refreshError);
            })
          );
        } else {
          // No refresh token or already trying to refresh, logout user
          authService.logout().subscribe();
          return throwError(() => error);
        }
      }

      // For other errors, just pass through
      return throwError(() => error);
    })
  );
};
