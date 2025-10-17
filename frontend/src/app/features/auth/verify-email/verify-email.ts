import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth/auth.service';
import { AuthLayoutComponent, AuthLayoutConfig } from '../../../shared/components/auth-layout/auth-layout';
import { ResendVerificationCodeRequest } from '@app/core/services/auth/dto/ResendVerificationCodeRequest';

@Component({
  selector: 'app-verify-email',
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
  templateUrl: './verify-email.html',
  styleUrls: ['./verify-email.scss']
})
export class VerifyEmail implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  isLoading = signal(false);
  emailVerified = signal(false);
  email = signal<string>('');

  returnUrl = signal<string>('/dashboard');

  authConfig: AuthLayoutConfig = {
    title: 'Verifica Email',
    subtitle: 'Inserisci il codice ricevuto via email',
    footerText: 'Hai già verificato?',
    footerLinkText: 'Accedi',
    footerLinkRoute: '/login'
  };

  verificationForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    
    this.returnUrl.set(this.route.snapshot.queryParams['returnUrl'] || '/dashboard');

    const emailFromUrl = this.route.snapshot.queryParams['email'];
    if (!emailFromUrl) {
      // Se non c'è email nell'URL, reindirizza al login
      this.snackBar.open('Email non fornita. Riprova.', 'Chiudi', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      this.router.navigate(['/login']);
      return;
    }
    this.email.set(emailFromUrl);

    const codeSent: boolean = this.route.snapshot.queryParams['codeSent'];
    if (!codeSent) {
      this.resendCode();
    }
    
  }

  resendCode(): void {
    this.isLoading.set(true);
    const request: ResendVerificationCodeRequest = { email: this.email() };
    this.authService.resendVerificationCode(request).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.snackBar.open('Codice di verifica inviato alla tua email', 'Chiudi', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error: any) => {
        this.isLoading.set(false);
        this.snackBar.open(error.error?.message || 'Errore durante l\'invio del codice', 'Chiudi', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  onSubmit(): void {
    if (this.verificationForm.valid) {
      this.isLoading.set(true);
      const verificationData = {
        email: this.email(),
        code: this.verificationForm.value.code
      };
      this.authService.confirmEmail(verificationData).subscribe({
        next: () => {
          this.emailVerified.set(true);
          this.isLoading.set(false);
        },
        error: (error: any) => {
          this.isLoading.set(false);
          this.snackBar.open(error.error?.message || 'Errore durante la verifica dell\'email', 'Chiudi', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login'], { queryParams: { email: this.email(), returnUrl: this.returnUrl() } });
  }

  getErrorMessage(field: string): string {
    const control = this.verificationForm.get(field);
    if (control?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (control?.hasError('minlength')) {
      const requiredLength = control.getError('minlength').requiredLength;
      return `Il codice deve essere di almeno ${requiredLength} caratteri`;
    }
    return '';
  }
}
