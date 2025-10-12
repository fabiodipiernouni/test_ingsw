import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink
  ],
  template: `
    <div class="verify-email-container">
      <div class="verify-email-card">
        <mat-card>
          <mat-card-header>
            <div class="header">
              <div class="logo">
                <mat-icon>home</mat-icon>
                <span>DietiEstates25</span>
              </div>
            </div>
          </mat-card-header>

          <mat-card-content>
            @if (isVerifying()) {
              <div class="verifying-state">
                <mat-spinner></mat-spinner>
                <h1>Verifica in corso...</h1>
                <p>Stiamo verificando il tuo indirizzo email</p>
              </div>
            } @else if (verificationSuccess()) {
              <div class="success-state">
                <mat-icon class="success-icon">check_circle</mat-icon>
                <h1>Email verificata!</h1>
                <p>Il tuo indirizzo email è stato verificato con successo.</p>
                <p class="info">Ora puoi accedere al tuo account e utilizzare tutti i servizi.</p>
                
                <button mat-raised-button 
                        color="primary" 
                        class="action-button"
                        (click)="goToLogin()">
                  <mat-icon>login</mat-icon>
                  Vai al login
                </button>
              </div>
            } @else {
              <div class="error-state">
                <mat-icon class="error-icon">error</mat-icon>
                <h1>Verifica fallita</h1>
                <p>{{ errorMessage() }}</p>
                <p class="info">Il token di verifica potrebbe essere scaduto o non valido.</p>
                
                <div class="actions">
                  <button mat-raised-button 
                          color="primary" 
                          class="action-button"
                          (click)="goToLogin()">
                    <mat-icon>login</mat-icon>
                    Vai al login
                  </button>
                  
                  <button mat-stroked-button 
                          class="action-button"
                          (click)="requestNewVerification()">
                    <mat-icon>email</mat-icon>
                    Richiedi nuova verifica
                  </button>
                </div>
              </div>
            }
          </mat-card-content>

          <mat-card-footer>
            <div class="footer">
              <a routerLink="/login" class="back-link">
                <mat-icon>arrow_back</mat-icon>
                Torna al login
              </a>
            </div>
          </mat-card-footer>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .verify-email-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem 1rem;
    }

    .verify-email-card {
      width: 100%;
      max-width: 450px;
    }

    mat-card {
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .header {
      text-align: center;
      padding: 1rem 0;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #667eea;
      font-size: 1.5rem;
      font-weight: 600;

      mat-icon {
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
      }
    }

    .verifying-state,
    .success-state,
    .error-state {
      text-align: center;
      padding: 2rem 1rem;
    }

    mat-spinner {
      margin: 0 auto 2rem auto;
    }

    .success-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: #4caf50;
      margin-bottom: 1.5rem;
    }

    .error-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: #f44336;
      margin-bottom: 1.5rem;
    }

    h1 {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 1.75rem;
      font-weight: 600;
    }

    p {
      margin: 0 0 0.75rem 0;
      color: #666;
      line-height: 1.5;
    }

    .info {
      font-size: 0.875rem !important;
      color: #777 !important;
      margin-bottom: 2rem !important;
    }

    .action-button {
      width: 100%;
      height: 48px;
      font-size: 1rem;
      font-weight: 500;
      margin: 0.5rem 0;

      mat-icon {
        margin-right: 0.5rem;
      }
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .footer {
      text-align: center;
      padding: 1rem 0 0.5rem 0;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #667eea;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: color 0.2s;

      &:hover {
        color: #5a67d8;
      }

      mat-icon {
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
      }
    }
  `]
})
export class VerifyEmail implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  isVerifying = signal(true);
  verificationSuccess = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    // Ottieni l'email dai query parameters per pre-compilare il form
    const email = this.route.snapshot.queryParams['email'];
    const code = this.route.snapshot.queryParams['code'];
    
    if (email && code) {
      // Se abbiamo email e codice, verifica automaticamente
      this.authService.confirmEmail({ email, code }).subscribe({
        next: (response) => {
          this.isVerifying.set(false);
          if (response.success) {
            this.verificationSuccess.set(true);
          } else {
            this.handleVerificationError('Verifica fallita');
          }
        },
        error: (error: any) => {
          this.handleVerificationError(
            error.error?.message || 'Errore durante la verifica dell\'email'
          );
        }
      });
    } else {
      // Se non abbiamo il codice, mostriamo il form per inserirlo
      this.isVerifying.set(false);
      this.verificationSuccess.set(false);
      this.errorMessage.set('Inserisci il codice di verifica ricevuto via email');
    }
  }

  private handleVerificationError(message: string): void {
    this.isVerifying.set(false);
    this.verificationSuccess.set(false);
    this.errorMessage.set(message);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  requestNewVerification(): void {
    const email = this.route.snapshot.queryParams['email'];
    
    if (email) {
      this.authService.resendVerificationCode({ email }).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open(
              'Nuovo codice di verifica inviato alla tua email',
              'Chiudi',
              {
                duration: 5000,
                panelClass: ['success-snackbar']
              }
            );
          }
        },
        error: (error: any) => {
          this.snackBar.open(
            error.error?.message || 'Errore nell\'invio del nuovo codice',
            'Chiudi',
            {
              duration: 5000,
              panelClass: ['error-snackbar']
            }
          );
        }
      });
    } else {
      this.snackBar.open(
        'Email non disponibile. Torna al login per richiedere una nuova verifica.',
        'Chiudi',
        {
          duration: 5000,
          panelClass: ['info-snackbar']
        }
      );
      this.goToLogin();
    }
  }
}