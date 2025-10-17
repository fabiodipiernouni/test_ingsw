import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth/auth.service';
import { OAuthProviders } from '../oauth-providers/oauth-providers';
import { AuthLayoutComponent, AuthLayoutConfig } from '../../../shared/components/auth-layout/auth-layout';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    OAuthProviders,
    AuthLayoutComponent
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  hidePassword = signal(true);
  isLoading = signal(false);
  returnUrl = signal<string>('/dashboard');

  authConfig: AuthLayoutConfig = {
    title: 'Accedi al tuo account',
    subtitle: 'Benvenuto! Inserisci le tue credenziali per accedere',
    footerText: 'Non hai ancora un account?',
    footerLinkText: 'Registrati gratis',
    footerLinkRoute: '/register'
  };

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });

  ngOnInit(): void {
    // Get return url from route parameters or default to dashboard
    this.returnUrl.set(this.route.snapshot.queryParams['returnUrl'] || '/dashboard');

  const emailFromUrl = this.route.snapshot.queryParams['email'];
    if (emailFromUrl) {
      this.loginForm.get('email')?.setValue(emailFromUrl);
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading.set(true);

      const credentials = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };

      this.authService.login(credentials).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          if(response.success) {
            this.router.navigateByUrl(this.returnUrl());
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error('Login error:', error);
          if (error.error?.error === 'USER_NOT_CONFIRMED') {
            this.snackBar.open('Il tuo account non è stato ancora verificato. Controlla la tua email per il link di verifica.', 'Chiudi', {
              duration: 7000,
              panelClass: ['error-snackbar']
            });
            this.router.navigate(['/verify-email'], { queryParams: { email: credentials.email, codeSent: false } });
          } else {
            this.snackBar.open(
              error.error?.message || 'Errore durante l\'accesso',
              'Chiudi',
              {
                duration: 5000,
                panelClass: ['error-snackbar']
              }
            );
          }
        }
      });
    }
  }



  getErrorMessage(field: string): string {
    const control = this.loginForm.get(field);
    if (control?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (control?.hasError('email')) {
      return 'Email non valida';
    }
    if (control?.hasError('minlength')) {
      return `Minimo ${control.getError('minlength').requiredLength} caratteri`;
    }
    return '';
  }

  goToForgotPassword(): void {
    const email = this.loginForm.get('email')?.value;
    if (email) {
      this.router.navigate(['/forgot-password'], { queryParams: { email } });
    } else {
      this.router.navigate(['/forgot-password']);
    }
  }
}
