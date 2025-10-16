import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { finalize } from 'rxjs/operators';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatDividerModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './verify-email.html',
  styleUrls: ['./verify-email.scss']
})
export class VerifyEmail {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  isLoading = signal<boolean>(false);
  isSendingCode = signal<boolean>(false);
  codeSent = signal<boolean>(false);

  verifyEmailForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get isEmailVerified() {
    return this.currentUser?.isVerified || false;
  }

  sendVerificationCode(): void {
    this.isSendingCode.set(true);

    this.authService.resendVerificationCode()
      .pipe(finalize(() => this.isSendingCode.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.codeSent.set(true);
            this.snackBar.open(
              'Codice di verifica inviato alla tua email',
              'Chiudi',
              { duration: 5000, panelClass: ['success-snackbar'] }
            );
          }
        },
        error: (error) => {
          this.snackBar.open(
            error.error?.message || 'Errore nell\'invio del codice',
            'Chiudi',
            { duration: 3000, panelClass: ['error-snackbar'] }
          );
        }
      });
  }

  onSubmit(): void {
    if (this.verifyEmailForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    const code = this.verifyEmailForm.value.code;

    this.authService.confirmEmail({ code })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open(
              'Email verificata con successo!',
              'Chiudi',
              { duration: 5000, panelClass: ['success-snackbar'] }
            );
            this.verifyEmailForm.reset();
            // Refresh user data
            window.location.reload();
          }
        },
        error: (error) => {
          this.snackBar.open(
            error.error?.message || 'Codice di verifica non valido',
            'Chiudi',
            { duration: 3000, panelClass: ['error-snackbar'] }
          );
        }
      });
  }

  getErrorMessage(fieldName: string): string {
    const field = this.verifyEmailForm.get(fieldName);
    
    if (field?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    
    if (field?.hasError('minlength') || field?.hasError('maxlength')) {
      return 'Il codice deve essere di 6 cifre';
    }
    
    return '';
  }
}
