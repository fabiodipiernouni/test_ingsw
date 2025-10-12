import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth/auth.service';
import { OAuthProviders } from '../oauth/oauth-providers';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    RouterLink,
    OAuthProviders
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

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });

  ngOnInit(): void {
    // Get return url from route parameters or default to dashboard
    this.returnUrl.set(this.route.snapshot.queryParams['returnUrl'] || '/dashboard');
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
          if (response.success) {
            // Controlla se c'è una challenge (es. NEW_PASSWORD_REQUIRED)
            if ('challengeName' in response.data!) {
              // Naviga alla pagina per gestire la challenge
              this.router.navigate(['/auth/new-password'], {
                queryParams: {
                  session: (response.data as any).session,
                  email: credentials.email
                }
              });
            } else {
              // Login completato, naviga alla destinazione
              this.router.navigate([this.returnUrl()]);
            }
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.snackBar.open(
            error.error?.message || 'Errore durante l\'accesso',
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
}
