import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core-services/auth/auth.service';
import { CreateAdminRequest } from '@core-services/auth/dto/CreateAdminRequest';
import { AuthLayoutComponent, AuthLayoutConfig } from '../../../shared/components/auth-layout/auth-layout';

@Component({
  selector: 'app-create-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    AuthLayoutComponent
  ],
  templateUrl: './create-admin.html',
  styleUrls: ['./create-admin.scss']
})
export class CreateAdmin {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  isLoading = signal(false);

  authConfig: AuthLayoutConfig = {
    title: 'Crea Nuovo Amministratore',
    subtitle: 'Inserisci i dati del nuovo amministratore',
    footerText: 'Torna alla',
    footerLinkText: 'Dashboard',
    footerLinkRoute: '/dashboard'
  };

  adminForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    phone: ['', [Validators.pattern(/^\+\d{1,15}$/)]]
  });

  onSubmit(): void {
    if (this.adminForm.valid) {
      this.isLoading.set(true);

      const adminData: CreateAdminRequest = {
        email: this.adminForm.value.email.trim(),
        firstName: this.adminForm.value.firstName.trim(),
        lastName: this.adminForm.value.lastName.trim(),
        phone: this.adminForm.value.phone?.trim() || undefined
      }

      this.authService.createAdmin(adminData).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          if (response.success) {
            this.snackBar.open('Amministratore creato con successo!', 'Chiudi', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          } else {
            this.snackBar.open(response.message || 'Errore durante la creazione dell\'amministratore', 'Chiudi', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          const errorMessage = error.error?.message || error.message || 'Errore durante la creazione dell\'amministratore';
          this.snackBar.open(errorMessage, 'Chiudi', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      this.markFormGroupTouched(this.adminForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.adminForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) return 'Campo obbligatorio';
    if (control.errors['email']) return 'Email non valida';
    if (control.errors['minlength']) {
      const minLength = control.errors['minlength'].requiredLength;
      return `Minimo ${minLength} caratteri`;
    }
    if (control.errors['maxlength']) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Massimo ${maxLength} caratteri`;
    }
    if (control.errors['pattern']) {
      if (fieldName === 'phone') {
        return 'Il numero deve essere in formato E.164 (es. +391234567890)';
      }
      return 'Formato non valido';
    }

    return 'Campo non valido';
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
