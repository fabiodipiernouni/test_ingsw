import { Injectable, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthResponse } from './dto/AuthResponse';

@Injectable({
  providedIn: 'root'
})
export class OAuthCallbackService {
  private router = inject(Router);
  private authService = inject(AuthService);

  /**
   * Gestisce il callback OAuth da Cognito
   * Estrae i token dai query parameters e li salva
   */
  handleCallback(route: ActivatedRoute): void {

    const queryParams = route.snapshot.queryParams;
    
    // Verifica se ci sono errori
    if (queryParams['error']) {
      console.error('OAuth error:', queryParams['error_description'] || queryParams['error']);
      this.router.navigate(['/auth/error'], {
        queryParams: { 
          message: queryParams['error_description'] || 'Authentication failed' 
        }
      });
      return;
    }

    const authResponse : AuthResponse = queryParams['response'] ? JSON.parse(queryParams['response']) : null;

    if (authResponse) {
      
      this.authService.handleAuthSuccess(authResponse);

      // Pulisci l'URL dai query parameters
      this.router.navigate(['/dashboard'], { replaceUrl: true });

    } else {
      console.error('Missing required OAuth tokens or user data');
      this.router.navigate(['/auth/error'], {
        queryParams: { 
          message: 'Invalid authentication response' 
        }
      });
    }
  }

}