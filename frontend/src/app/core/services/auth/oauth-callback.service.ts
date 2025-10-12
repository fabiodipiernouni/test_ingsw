import { Injectable, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from './auth.service';
import { UserResponse } from './dto/UserResponse';

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
    /*
    // TODO
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

    // Estrai i token dai query parameters
    const accessToken = queryParams['access_token'];
    const idToken = queryParams['id_token'];
    const refreshToken = queryParams['refresh_token'];
    const tokenType = queryParams['token_type'];
    const email = queryParams['email'];
    const isNewUser = queryParams['is_new_user'] === 'true';

    if (accessToken && idToken && refreshToken && email) {
      // Crea un oggetto utente temporaneo con i dati disponibili
      const user: UserResponse = {
        id: '', // Sarà popolato quando faremo una richiesta per ottenere i dati completi
        email: email,
        firstName: '', // Da popolare
        lastName: '', // Da popolare
        phone: undefined,
        role: 'client', // Default role
        isActive: true,
        isVerified: !isNewUser,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Salva i token
      this.storeTokens(accessToken, idToken, refreshToken);
      this.storeUser(user);
      this.authService['setAuthenticationState'](user);

      // Pulisci l'URL dai query parameters
      this.router.navigate(['/dashboard'], { replaceUrl: true });

      // TODO: Opzionalmente, fai una richiesta per ottenere i dati completi dell'utente
      // this.fetchCompleteUserData();

    } else {
      console.error('Missing required OAuth tokens or user data');
      this.router.navigate(['/auth/error'], {
        queryParams: { 
          message: 'Invalid authentication response' 
        }
      });
    }
    */
  }

  /**
   * Salva i token nel localStorage
   */
  private storeTokens(accessToken: string, idToken: string, refreshToken: string): void {
    localStorage.setItem('auth_access_token', accessToken);
    localStorage.setItem('auth_id_token', idToken);
    localStorage.setItem('auth_refresh_token', refreshToken);
  }

  /**
   * Salva l'utente nel localStorage
   */
  private storeUser(user: UserResponse): void {
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  /**
   * Ottiene i dati completi dell'utente (da implementare se necessario)
   */
  private fetchCompleteUserData(): void {
    // Implementa se hai un endpoint per ottenere i dati completi dell'utente
    // this.userService.getCurrentUser().subscribe(user => {
    //   this.storeUser(user);
    //   this.authService['setAuthenticationState'](user);
    // });
  }
}