import { Component, Input, OnInit, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';

import { UserService } from '../../../../core/services/user.service';
import { User } from '@core/models/user.model';

@Component({
  selector: 'app-contact-info',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './contact-info.html',
  styleUrl: './contact-info.scss'
})
export class ContactInfo implements OnInit, OnChanges {
  @Input() user!: User;

  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);

  contactForm!: FormGroup;
  emailVerificationForm!: FormGroup;

  isLoading = signal(false);
  isEmailVerificationLoading = signal(false);
  showEmailVerification = signal(false);
  otpSent = signal(false);

  constructor() {
    // Initialize forms early to prevent undefined errors
    this.contactForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[0-9+\-\s()]*$/)]]
    });

    this.emailVerificationForm = this.fb.group({
      otpCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  ngOnInit() {
    this.initializeForms();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && changes['user'].currentValue) {
      this.initializeForms();
    }
  }

  private initializeForms() {
    this.contactForm = this.fb.group({
      phone: [this.user.phone || '', [
        Validators.pattern(/^[\+]?[0-9\s\-\(\)]{8,15}$/)
      ]],
      email: [this.user.email || '', [
        Validators.required,
        Validators.email
      ]]
    });

    this.emailVerificationForm = this.fb.group({
      otpCode: ['', [
        Validators.required,
        Validators.pattern(/^\d{6}$/)
      ]]
    });
  }

  onSubmit() {
    if (this.contactForm.valid) {
      this.isLoading.set(true);

      const formData = this.contactForm.value;
      const updateData = {
        phone: formData.phone,
        email: formData.email
      };

      this.userService.updateProfile(updateData)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: (updatedUser) => {
            // Update the user object
            Object.assign(this.user, updatedUser);

            this.snackBar.open('Informazioni di contatto aggiornate con successo', 'Chiudi', {
              duration: 3000,
              panelClass: 'success-snackbar'
            });

            // If email was changed and not verified, show verification
            if (formData.email !== this.user.email && !updatedUser.isVerified) {
              this.showEmailVerification.set(true);
            }
          },
          error: (error: any) => {
            console.error('Error updating contact info:', error);
            this.snackBar.open('Errore nell\'aggiornamento delle informazioni di contatto', 'Chiudi', {
              duration: 3000,
              panelClass: 'error-snackbar'
            });
          }
        });
    } else {
      this.markFormGroupTouched(this.contactForm);
    }
  }

  sendEmailVerification() {
    if (!this.user.email) {
      this.snackBar.open('Nessun indirizzo email configurato', 'Chiudi', {
        duration: 3000,
        panelClass: 'error-snackbar'
      });
      return;
    }

    this.isEmailVerificationLoading.set(true);

    this.userService.sendEmailVerificationOtp(this.user.email)
      .pipe(finalize(() => this.isEmailVerificationLoading.set(false)))
      .subscribe({
        next: () => {
          this.otpSent.set(true);
          this.showEmailVerification.set(true);
          this.snackBar.open('Codice di verifica inviato alla tua email', 'Chiudi', {
            duration: 3000,
            panelClass: 'success-snackbar'
          });
        },
        error: (error: any) => {
          console.error('Error sending email verification:', error);
          this.snackBar.open('Errore nell\'invio del codice di verifica', 'Chiudi', {
            duration: 3000,
            panelClass: 'error-snackbar'
          });
        }
      });
  }

  verifyEmail() {
    if (this.emailVerificationForm.valid) {
      this.isEmailVerificationLoading.set(true);

      const otpCode = this.emailVerificationForm.value.otpCode;

      this.userService.verifyEmailOtp(this.user.email, otpCode)
        .pipe(finalize(() => this.isEmailVerificationLoading.set(false)))
        .subscribe({
          next: () => {
            this.user.isVerified = true;
            this.showEmailVerification.set(false);
            this.otpSent.set(false);
            this.emailVerificationForm.reset();

            this.snackBar.open('Email verificata con successo!', 'Chiudi', {
              duration: 3000,
              panelClass: 'success-snackbar'
            });
          },
          error: (error: any) => {
            console.error('Error verifying email:', error);
            this.snackBar.open('Codice di verifica non valido', 'Chiudi', {
              duration: 3000,
              panelClass: 'error-snackbar'
            });
          }
        });
    } else {
      this.markFormGroupTouched(this.emailVerificationForm);
    }
  }

  cancelEmailVerification() {
    this.showEmailVerification.set(false);
    this.otpSent.set(false);
    this.emailVerificationForm.reset();
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getFieldErrorMessage(fieldName: string, formGroup: FormGroup = this.contactForm): string {
    const control = formGroup.get(fieldName);
    if (control?.hasError('required')) {
      switch (fieldName) {
        case 'email':
          return 'L\'email è obbligatoria';
        case 'otpCode':
          return 'Il codice di verifica è obbligatorio';
        default:
          return 'Questo campo è obbligatorio';
      }
    }
    if (control?.hasError('email')) {
      return 'Inserisci un indirizzo email valido';
    }
    if (control?.hasError('pattern')) {
      switch (fieldName) {
        case 'phone':
          return 'Inserisci un numero di telefono valido';
        case 'otpCode':
          return 'Il codice deve essere di 6 cifre';
        default:
          return 'Formato non valido';
      }
    }
    return '';
  }
}
