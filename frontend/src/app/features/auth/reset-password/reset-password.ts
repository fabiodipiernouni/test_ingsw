import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
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
    <div class="reset-password-container">
      <div class="reset-password-card">
        <mat-card>
          <mat-card-header>
            <div class="header">
              <div class="logo">
                <mat-icon>home</mat-icon>
                <span>DietiEstates25</span>
              </div>
              <h1>Reimposta password</h1>
              <p>Inserisci la tua nuova password</p>
            </div>
          </mat-card-header>

          <mat-card-content>
            @if (!passwordReset()) {
              <form [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()">
                <div class="form-fields">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Nuova password</mat-label>
                    <input matInput
                           [type]="hidePassword() ? 'password' : 'text'"
                           formControlName="password"
                           placeholder="La tua nuova password">
                    <button mat-icon-button
                            matSuffix
                            type="button"
                            (click)="hidePassword.set(!hidePassword())"
                            [attr.aria-label]="'Hide password'"
                            [attr.aria-pressed]="hidePassword()">
                      <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                    <mat-error>{{ getErrorMessage('password') }}</mat-error>
                  </mat-form-field>

                  @if (passwordRequirements()) {
                    <div class="password-requirements">
                      <p>La password deve contenere:</p>
                      <ul>
                        <li [class.valid]="passwordChecks().hasLower">Almeno una lettera minuscola</li>
                        <li [class.valid]="passwordChecks().hasUpper">Almeno una lettera maiuscola</li>
                        <li [class.valid]="passwordChecks().hasNumber">Almeno un numero</li>
                        <li [class.valid]="passwordChecks().hasSpecial">Almeno un carattere speciale</li>
                        <li [class.valid]="passwordChecks().hasLength">Almeno 8 caratteri</li>
                      </ul>
                    </div>
                  }

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Conferma password</mat-label>
                    <input matInput
                           [type]="hideConfirmPassword() ? 'password' : 'text'"
                           formControlName="confirmPassword"
                           placeholder="Conferma la tua password">
                    <button mat-icon-button
                            matSuffix
                            type="button"
                            (click)="hideConfirmPassword.set(!hideConfirmPassword())"
                            [attr.aria-label]="'Hide confirm password'"
                            [attr.aria-pressed]="hideConfirmPassword()">
                      <mat-icon>{{ hideConfirmPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                    <mat-error>{{ getErrorMessage('confirmPassword') }}</mat-error>
                  </mat-form-field>
                </div>

                <button mat-raised-button
                        color="primary"
                        type="submit"
                        class="submit-button"
                        [disabled]="!resetPasswordForm.valid || isLoading()">
                  @if (isLoading()) {
                    <ng-container>
                      <mat-icon class="spin">refresh</mat-icon>
                      Reset in corso...
                    </ng-container>
                  } @else {
                    <ng-container>
                      <mat-icon>check</mat-icon>
                      Reimposta password
                    </ng-container>
                  }
                </button>
              </form>
            } @else {
              <div class="success-message">
                <mat-icon class="success-icon">check_circle</mat-icon>
                <h2>Password reimpostata!</h2>
                <p>La tua password è stata reimpostata con successo.</p>
                <p class="info">Ora puoi accedere con la tua nuova password.</p>
                
                <button mat-raised-button 
                        color="primary" 
                        class="login-button"
                        (click)="goToLogin()">
                  <mat-icon>login</mat-icon>
                  Vai al login
                </button>
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
    .reset-password-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem 1rem;
    }

    .reset-password-card {
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
    }

    .form-fields {
      margin: 1.5rem 0;
    }

    .full-width {
      width: 100%;
    }

    .password-requirements {
      margin: 1rem 0;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 3px solid #667eea;

      p {
        margin: 0 0 0.5rem 0;
        font-size: 0.875rem;
        color: #333;
        font-weight: 500;
      }

      ul {
        margin: 0;
        padding: 0;
        list-style: none;

        li {
          font-size: 0.8125rem;
          color: #dc3545;
          margin: 0.25rem 0;
          position: relative;
          padding-left: 1.5rem;

          &::before {
            content: '✗';
            position: absolute;
            left: 0;
            color: #dc3545;
          }

          &.valid {
            color: #28a745;

            &::before {
              content: '✓';
              color: #28a745;
            }
          }
        }
      }
    }

    .submit-button, .login-button {
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
      margin-bottom: 1.5rem !important;
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
export class ResetPassword implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  isLoading = signal(false);
  passwordReset = signal(false);
  passwordRequirements = signal(false);
  passwordChecks = signal({
    hasLower: false,
    hasUpper: false,
    hasNumber: false,
    hasSpecial: false,
    hasLength: false
  });

  private resetToken = '';

  resetPasswordForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator.bind(this)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  ngOnInit(): void {
    // Get reset token from URL parameters
    this.resetToken = this.route.snapshot.queryParams['token'];
    
    if (!this.resetToken) {
      this.snackBar.open('Token di reset non valido', 'Chiudi', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      this.router.navigate(['/login']);
      return;
    }

    // Monitor password changes for requirements display
    this.resetPasswordForm.get('password')?.valueChanges.subscribe(value => {
      if (value) {
        this.passwordRequirements.set(true);
        this.updatePasswordChecks(value);
      } else {
        this.passwordRequirements.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid) {
      this.isLoading.set(true);

      const resetData = {
        token: this.resetToken,
        password: this.resetPasswordForm.value.password
      };

      this.authService.resetPassword(resetData).subscribe({
        next: () => {
          this.passwordReset.set(true);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.snackBar.open(
            error.error?.message || 'Errore durante il reset della password',
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

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  private updatePasswordChecks(password: string): void {
    this.passwordChecks.set({
      hasLower: /[a-z]/.test(password),
      hasUpper: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[#?!@$%^&*-]/.test(password),
      hasLength: password.length >= 8
    });
  }

  private passwordValidator(control: AbstractControl): { [key: string]: any } | null {
    const value = control.value;
    if (!value) return null;

    const hasNumber = /[0-9]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasSpecial = /[#?!@$%^&*-]/.test(value);

    const valid = hasNumber && hasUpper && hasLower && hasSpecial;

    if (!valid) {
      return {
        passwordStrength: {
          hasNumber,
          hasUpper,
          hasLower,
          hasSpecial
        }
      };
    }

    return null;
  }

  private passwordMatchValidator(group: AbstractControl): { [key: string]: any } | null {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');

    if (!password || !confirmPassword) return null;

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  getErrorMessage(field: string): string {
    const control = this.resetPasswordForm.get(field);
    if (control?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (control?.hasError('minlength')) {
      return `Minimo ${control.getError('minlength').requiredLength} caratteri`;
    }
    if (field === 'confirmPassword' && this.resetPasswordForm.hasError('passwordMismatch')) {
      return 'Le password non corrispondono';
    }
    if (control?.hasError('passwordStrength')) {
      return 'La password non soddisfa i requisiti di sicurezza';
    }
    return '';
  }
}