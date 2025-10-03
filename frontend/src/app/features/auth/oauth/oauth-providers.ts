import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { OAuthProvider } from '@core/models/user.model';

@Component({
  selector: 'app-oauth-providers',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="oauth-providers">
      <div class="divider">
        <span>oppure</span>
      </div>

      <div class="provider-buttons">
        <button
          mat-stroked-button
          class="provider-button google"
          [disabled]="loading()"
          (click)="loginWithProvider('google')">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <mat-icon>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-2.7.75c-2.08 0-3.84-1.4-4.48-3.29H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.48A4.8 4.8 0 0 1 4.24 8.98c0-.53.09-1.03.26-1.5V5.41H1.83a8 8 0 0 0 0 7.14l2.67-2.07z"/>
                <path fill="#EB4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.41L4.5 7.48C5.14 5.59 6.9 4.18 8.98 4.18z"/>
              </svg>
            </mat-icon>
          }
          <span>Continua con Google</span>
        </button>

        <button
          mat-stroked-button
          class="provider-button github"
          [disabled]="loading()"
          (click)="loginWithProvider('github')">
          @if (loading()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <mat-icon>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#333">
                <path d="M12 0C5.374 0 0 5.373 0 12 0 17.302 3.438 21.8 8.207 23.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
            </mat-icon>
          }
          <span>Continua con GitHub</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .oauth-providers {
      margin: 1.5rem 0;
    }

    .divider {
      text-align: center;
      position: relative;
      margin: 1rem 0;

      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 1px;
        background: #e0e0e0;
      }

      span {
        background: white;
        padding: 0 1rem;
        color: #666;
        font-size: 0.875rem;
      }
    }

    .provider-buttons {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .provider-button {
      width: 100%;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      background: white;
      color: #333;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        border-color: #d0d0d0;
        background: #f9f9f9;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      mat-icon {
        width: 18px;
        height: 18px;
      }

      mat-spinner {
        margin: 0;
      }
    }

    .google:hover:not(:disabled) {
      border-color: #4285F4;
      color: #4285F4;
    }

    .github:hover:not(:disabled) {
      border-color: #333;
      color: #333;
    }
  `]
})
export class OAuthProviders {
  private authService = inject(AuthService);

  loading = signal(false);
  mode = input<'login' | 'register'>('login');

  loginWithProvider(provider: OAuthProvider): void {
    if (this.loading()) return;

    this.loading.set(true);

    try {
      // Don't pass redirectUri - let the backend handle the OAuth flow
      // The backend will redirect to the correct frontend callback URL
      this.authService.startOAuthFlow(provider);
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      this.loading.set(false);
    }
  }
}
