import { Component, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core/services/auth/auth.service';
import { finalize } from 'rxjs/operators';


@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './change-password.html',
  styleUrls: ['./change-password.scss']
})
export class ChangePassword implements OnInit {
  @Output() passwordChanged = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  
  isLoading = signal<boolean>(false);
  hideCurrentPassword = signal<boolean>(true);
  hideNewPassword = signal<boolean>(true);
  hideConfirmPassword = signal<boolean>(true);

  passwordRequirements = signal<boolean>(false);
  passwordChecks = signal({
    hasLower: false,
    hasUpper: false,
    hasNumber: false,
    hasSpecial: false,
    hasLength: false
  });

  changePasswordForm!: FormGroup;

  ngOnInit(): void {
    this.initializeForm();
    this.setupPasswordValidation();
  }

  private initializeForm(): void {
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8), this.passwordValidator.bind(this)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  private setupPasswordValidation(): void {
    // Monitor new password changes for requirements display
    this.changePasswordForm.get('newPassword')?.valueChanges.subscribe(value => {
      if (value) {
        this.passwordRequirements.set(true);
        this.updatePasswordChecks(value);
      } else {
        this.passwordRequirements.set(false);
      }
    });
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

    // Verifica che non ci siano spazi
    if (/\s/.test(value)) {
      return { passwordContainsSpaces: true };
    }

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
    const password = group.get('newPassword');
    const confirmPassword = group.get('confirmPassword');

    if (!password || !confirmPassword) return null;

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      // Rimuovi l'errore passwordMismatch se presente, ma mantieni altri errori
      const errors = confirmPassword.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        confirmPassword.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    }

    return null;
  }

  hasLinkedProviders(): boolean {
    const currentUser = this.authService.currentUser();
    return !!(currentUser?.linkedProviders && currentUser.linkedProviders?.length > 0);
  }

  onSubmit(): void {
    if (this.changePasswordForm.valid) {
      this.isLoading.set(true);

      const changePasswordData = {
        currentPassword: this.changePasswordForm.value.currentPassword,
        newPassword: this.changePasswordForm.value.newPassword
      };

      this.authService.changePassword(changePasswordData)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: (response) => {
            this.passwordChanged.emit();
            this.changePasswordForm.reset();
            this.passwordRequirements.set(false);

            this.snackBar.open(
              'Password cambiata con successo',
              'Chiudi',
              {
                duration: 5000,
                panelClass: ['success-snackbar']
              }
            );
          },
          error: (error) => {
            this.snackBar.open(
              error.error?.message || 'Errore durante il cambio password',
              'Chiudi',
              {
                duration: 5000,
                panelClass: ['error-snackbar']
              }
            );
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  onReset(): void {
    this.changePasswordForm.reset();
    this.passwordRequirements.set(false);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.changePasswordForm.controls).forEach(key => {
      const control = this.changePasswordForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.changePasswordForm.get(fieldName);

    if (control?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (control?.hasError('minlength')) {
      const minLength = control.getError('minlength').requiredLength;
      return `Minimo ${minLength} caratteri`;
    }
    if (fieldName === 'confirmPassword' && (control?.hasError('passwordMismatch') || this.changePasswordForm.hasError('passwordMismatch'))) {
      return 'Le password non corrispondono';
    }
    if (control?.hasError('passwordContainsSpaces')) {
      return 'La password non può contenere spazi';
    }
    if (control?.hasError('passwordStrength')) {
      return 'La password non soddisfa i requisiti di sicurezza';
    }

    return '';
  }
}
