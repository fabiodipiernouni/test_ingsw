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
import { AuthService } from '../../../core/services/auth/auth.service';

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
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss']
})
export class ForgotPassword implements OnInit {
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

  resetPasswordForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', [Validators.required, Validators.minLength(6)]],
    password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator.bind(this)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  ngOnInit(): void {
    // Pre-populate email from URL if available
    const emailFromUrl = this.route.snapshot.queryParams['email'];
    if (emailFromUrl) {
      this.resetPasswordForm.patchValue({ email: emailFromUrl });
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
        email: this.resetPasswordForm.value.email,
        code: this.resetPasswordForm.value.code,
        newPassword: this.resetPasswordForm.value.password
      };

      this.authService.confirmForgotPassword(resetData).subscribe({
        next: () => {
          this.passwordReset.set(true);
          this.isLoading.set(false);
        },
        error: (error: any) => {
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
    if (control?.hasError('email')) {
      return 'Email non valida';
    }
    if (control?.hasError('minlength')) {
      const requiredLength = control.getError('minlength').requiredLength;
      if (field === 'code') {
        return `Il codice deve essere di almeno ${requiredLength} caratteri`;
      }
      return `Minimo ${requiredLength} caratteri`;
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