import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth/auth.service';
import { OAuthProviders } from '../oauth-providers/oauth-providers';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    RouterLink,
    OAuthProviders
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  isLoading = signal(false);

  // Single registration form for clients only
  registrationForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^[0-9+\-\s()]+$/)]],
    password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]],
    confirmPassword: ['', Validators.required],
    acceptTerms: [false, Validators.requiredTrue],
    acceptPrivacy: [false, Validators.requiredTrue]
  }, { validators: this.passwordMatchValidator });

  onSubmit(): void {
    if (this.registrationForm.valid) {
      this.isLoading.set(true);

      const formValue = this.registrationForm.value;
      const userData = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        phone: formValue.phone || undefined,
        password: formValue.password,
        acceptTerms: formValue.acceptTerms,
        acceptPrivacy: formValue.acceptPrivacy
      };

      this.authService.register(userData).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          if (response.success) {
            this.snackBar.open('Registrazione completata!', 'Chiudi', {
              duration: 5000,
              panelClass: ['success-snackbar']
            });
            // Naviga alla pagina di login
            this.router.navigate(['/auth/login']);
          }
          else {
            this.snackBar.open(
              response.message || 'Errore durante la registrazione',
              'Chiudi',
              {
                duration: 5000,
                panelClass: ['error-snackbar']
              }
            );
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.snackBar.open(
            error.error?.message || 'Errore durante la registrazione',
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
    const control = this.registrationForm.get(field);
    if (control?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (control?.hasError('email')) {
      return 'Email non valida';
    }
    if (control?.hasError('minlength')) {
      return `Minimo ${control.getError('minlength').requiredLength} caratteri`;
    }
    if (control?.hasError('pattern')) {
      return 'Formato non valido';
    }
    if (field === 'confirmPassword' && this.registrationForm.hasError('passwordMismatch')) {
      return 'Le password non corrispondono';
    }
    if (control?.hasError('passwordStrength')) {
      return 'La password non soddisfa i requisiti di sicurezza';
    }
    return '';
  }
}
