import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import {MatRadioButton} from '@angular/material/radio';

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
    MatStepperModule,
    MatRadioButton
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

  // Step 1: Account Type
  accountTypeForm: FormGroup = this.fb.group({
    role: ['client', Validators.required]
  });

  // Step 2: Personal Information
  personalInfoForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^[0-9+\-\s()]+$/)]]
  });

  // Step 3: Password
  passwordForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator]],
    confirmPassword: ['', Validators.required],
    acceptTerms: [false, Validators.requiredTrue]
  }, { validators: this.passwordMatchValidator });

  // Step 4: Agent Details (conditional)
  agentInfoForm: FormGroup = this.fb.group({
    agencyName: [''],
    licenseNumber: [''],
    biography: ['']
  });

  accountTypes = [
    { value: 'client', label: 'Cliente', description: 'Cerca e acquista immobili' },
    { value: 'agent', label: 'Agente Immobiliare', description: 'Gestisci e vendi immobili' }
  ];

  get isAgent(): boolean {
    return this.accountTypeForm.get('role')?.value === 'agent';
  }

  onSubmit(): void {
    if (this.isFormValid()) {
      this.isLoading.set(true);

      const userData = {
        ...this.personalInfoForm.value,
        ...this.passwordForm.value,
        role: this.accountTypeForm.value.role,
        ...(this.isAgent ? this.agentInfoForm.value : {})
      };

      // Remove confirmPassword and acceptTerms
      delete userData.confirmPassword;
      delete userData.acceptTerms;

      this.authService.register(userData).subscribe({
        next: (response) => {
          this.snackBar.open('Registrazione completata con successo!', 'Chiudi', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.router.navigate(['/dashboard']);
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

  private isFormValid(): boolean {
    const basicValid = this.accountTypeForm.valid &&
      this.personalInfoForm.valid &&
      this.passwordForm.valid;

    if (this.isAgent) {
      // Validate agent-specific fields
      this.agentInfoForm.get('agencyName')?.setValidators([Validators.required]);
      this.agentInfoForm.get('licenseNumber')?.setValidators([Validators.required]);
      this.agentInfoForm.updateValueAndValidity();
      return basicValid && this.agentInfoForm.valid;
    }

    return basicValid;
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

  getErrorMessage(form: FormGroup, field: string): string {
    const control = form.get(field);
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
    if (field === 'confirmPassword' && this.passwordForm.hasError('passwordMismatch')) {
      return 'Le password non corrispondono';
    }
    return '';
  }
}
