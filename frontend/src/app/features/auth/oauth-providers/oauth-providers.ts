import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '@core/services/auth/auth.service';
import { OAuthProvider } from '@core/services/auth/models/OAuthProvider';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-oauth-providers',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './oauth-providers.html',
  styleUrls: ['./oauth-providers.scss']
})
export class OAuthProviders {
  private authService = inject(AuthService);
  private matIconRegistry = inject(MatIconRegistry);
  private domSanitizer = inject(DomSanitizer);

  loading = signal(false);
  mode = input<'login' | 'register'>('login');

  constructor() {
    // Registriamo l'icona Google
    this.matIconRegistry.addSvgIconLiteral(
      'google',
      this.domSanitizer.bypassSecurityTrustHtml(`
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
          <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-2.7.75c-2.08 0-3.84-1.4-4.48-3.29H1.83v2.07A8 8 0 0 0 8.98 17z"/>
          <path fill="#FBBC05" d="M4.5 10.48A4.8 4.8 0 0 1 4.24 8.98c0-.53.09-1.03.26-1.5V5.41H1.83a8 8 0 0 0 0 7.14l2.67-2.07z"/>
          <path fill="#EB4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.41L4.5 7.48C5.14 5.59 6.9 4.18 8.98 4.18z"/>
        </svg>
      `)
    );
  }

  loginWithProvider(provider: OAuthProvider): void {
    if (this.loading()) return;

    this.loading.set(true);

    try {
      this.authService.startOAuthAuthentication(provider);
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      this.loading.set(false);
    }
  }
}
