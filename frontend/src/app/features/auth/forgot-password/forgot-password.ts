import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterLink
  ],
  template: `
    <div class="forgot-password-container">
      <div class="forgot-password-card">
        <mat-card>
          <mat-card-header>
            <div class="header">
              <div class="logo">
                <mat-icon>home</mat-icon>
                <span>DietiEstates25</span>
              </div>
              <h1>Password dimenticata?</h1>
              <p>Inserisci la tua email e ti invieremo un link per reimpostare la password</p>
            </div>
          </mat-card-header>

          <mat-card-content>
            @if (!emailSent()) {
              <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()">
                <div class="form-fields">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Email</mat-label>
                    <input matInput
                           type="email"
                           formControlName="email"
                           placeholder="mario.rossi@email.com"
                           autocomplete="email">
                    <mat-icon matSuffix>email</mat-icon>
                    <mat-error>{{ getErrorMessage('email') }}</mat-error>
                  </mat-form-field>
                </div>

                <button mat-raised-button
                        color="primary"
                        type="submit"
                        class="submit-button"
                        [disabled]="!forgotPasswordForm.valid || isLoading()">
                  @if (isLoading()) {
                    <ng-container>
                      <mat-icon class="spin">refresh</mat-icon>
                      Invio in corso...
                    </ng-container>
                  } @else {
                    <ng-container>
                      <mat-icon>send</mat-icon>
                      Invia link di reset
                    </ng-container>
                  }
                </button>
              </form>
            } @else {
              <div class="success-message">
                <mat-icon class="success-icon">check_circle</mat-icon>
                <h2>Email inviata!</h2>
                <p>Abbiamo inviato un link per il reset della password all'indirizzo <strong>{{ emailAddress() }}</strong></p>
                <p class="info">Controlla la tua casella di posta elettronica e segui le istruzioni per reimpostare la password.</p>
                
                <div class="resend-section">
                  <p>Non hai ricevuto l'email?</p>
                  <button mat-stroked-button (click)="resendEmail()" [disabled]="isLoading()">
                    Invia di nuovo
                  </button>
                </div>
              </div>
            }
          </mat-card-content>

          <mat-card-footer>
            <div class="back-to-login">
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
    .forgot-password-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem 1rem;
    }

    .forgot-password-card {
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
      margin-bottom: 1.5rem;
      color: #667eea;
      font-size: 1.5rem;
      font-weight: 600;

      mat-icon {
        font-size: 2rem;
        width: 2rem;
        height: 2rem;
      }
    }

    h1 {
      margin: 0 0 0.5rem 0;
      color: #333;
      font-size: 1.75rem;
      font-weight: 600;
    }

    .header p {
      margin: 0;
      color: #666;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .form-fields {
      margin: 1.5rem 0;
    }

    .full-width {
      width: 100%;
    }

    .submit-button {
      width: 100%;
      height: 48px;
      font-size: 1rem;
      font-weight: 500;
      margin-top: 1rem;
    }

    .success-message {
      text-align: center;
      padding: 1rem 0;
    }

    .success-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      color: #4caf50;
      margin-bottom: 1rem;
    }

    .success-message h2 {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 1.5rem;
    }

    .success-message p {
      margin: 0 0 0.75rem 0;
      color: #666;
      line-height: 1.5;
    }

    .info {
      font-size: 0.875rem !important;
      color: #777 !important;
    }

    .resend-section {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e0e0e0;
    }

    .resend-section p {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      color: #666;
    }

    .back-to-login {
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

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class ForgotPassword {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  emailSent = signal(false);
  emailAddress = signal('');

  forgotPasswordForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.isLoading.set(true);
      const email = this.forgotPasswordForm.value.email;

      this.authService.forgotPassword({ email }).subscribe({
        next: () => {
          this.emailAddress.set(email);
          this.emailSent.set(true);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.snackBar.open(
            error.error?.message || 'Errore durante l\'invio dell\'email',
            'Chiudi',
            {
              duration: 5000,
              panelClass: ['error-snackbar']
            }
          );
        }
      });
    }
  }

  resendEmail(): void {
    const email = this.emailAddress();
    if (email) {
      this.isLoading.set(true);
      
      this.authService.forgotPassword({ email }).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.snackBar.open('Email inviata nuovamente!', 'Chiudi', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          this.isLoading.set(false);
          this.snackBar.open(
            error.error?.message || 'Errore durante l\'invio dell\'email',
            'Chiudi',
            {
              duration: 5000,
              panelClass: ['error-snackbar']
            }
          );
        }
      });
    }
  }

  getErrorMessage(field: string): string {
    const control = this.forgotPasswordForm.get(field);
    if (control?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (control?.hasError('email')) {
      return 'Email non valida';
    }
    return '';
  }
}