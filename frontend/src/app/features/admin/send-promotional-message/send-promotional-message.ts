import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationService } from '@core/services/notification/notification.service';
import { SendPromotionalMessageDto } from '@core-services/notification/dto/SendPromotionalMessageDto';

@Component({
  selector: 'app-send-promotional-message',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatSnackBarModule
  ],
  templateUrl: './send-promotional-message.html',
  styleUrl: './send-promotional-message.scss'
})
export class SendPromotionalMessage {
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  messageForm: FormGroup;
  isSubmitting = signal(false);
  imageLoadError = signal(false);
  imageLoading = signal(false);

  constructor() {
    this.messageForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(200)]],
      message: ['', [Validators.required, Validators.maxLength(4000)]],
      actionUrl: ['', [Validators.maxLength(2000)]],
      imageUrl: ['', [Validators.maxLength(2000)]]
    });

    // Monitora i cambiamenti nell'URL dell'immagine
    this.messageForm.get('imageUrl')?.valueChanges.subscribe(url => {
      if (url && url.trim()) {
        this.validateImageUrl(url.trim());
      } else {
        this.imageLoadError.set(false);
        this.imageLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.messageForm.invalid || this.isSubmitting() || this.imageLoadError()) {
      this.messageForm.markAllAsTouched();
      
      if (this.imageLoadError()) {
        this.snackBar.open(
          'L\'URL dell\'immagine non è valido. Verifica l\'anteprima.',
          'Chiudi',
          { duration: 3000, panelClass: 'error-snackbar' }
        );
      }
      
      return;
    }

    this.isSubmitting.set(true);

    const dto: SendPromotionalMessageDto = {
      title: this.messageForm.value.title.trim(),
      message: this.messageForm.value.message.trim(),
      actionUrl: this.messageForm.value.actionUrl?.trim() || undefined,
      imageUrl: this.messageForm.value.imageUrl?.trim() || undefined
    };

    this.notificationService.sendPromotionalMessage(dto).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        
        if (response.success) {
          const sentCount = response.data?.sentCount || 0;
          this.snackBar.open(
            `Messaggio promozionale inviato con successo a ${sentCount} utenti!`,
            'Chiudi',
            { duration: 5000, panelClass: 'success-snackbar' }
          );
          
          // Reset del form
          this.messageForm.reset();

        } else {
          this.snackBar.open(
            'Errore nell\'invio del messaggio promozionale',
            'Chiudi',
            { duration: 3000, panelClass: 'error-snackbar' }
          );
        }
      },
      error: (error) => {
        this.isSubmitting.set(false);
        console.error('Error sending promotional message:', error);
        
        let errorMessage = 'Errore nell\'invio del messaggio promozionale';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 403) {
          errorMessage = 'Non hai i permessi per eseguire questa operazione';
        } else if (error.status === 401) {
          errorMessage = 'Devi effettuare il login';
        }
        
        this.snackBar.open(errorMessage, 'Chiudi', {
          duration: 5000,
          panelClass: 'error-snackbar'
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.messageForm.get(fieldName);
    
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return 'Questo campo è obbligatorio';
    }

    if (control.errors['maxlength']) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Massimo ${maxLength} caratteri`;
    }

    return 'Valore non valido';
  }

  getRemainingChars(fieldName: string, maxLength: number): string {
    const control = this.messageForm.get(fieldName);
    const currentLength = control?.value?.length || 0;
    const remaining = maxLength - currentLength;
    return `${remaining} caratteri rimanenti`;
  }

  validateImageUrl(url: string): void {
    this.imageLoading.set(true);
    this.imageLoadError.set(false);

    const img = new Image();
    
    img.onload = () => {
      this.imageLoading.set(false);
      this.imageLoadError.set(false);
    };
    
    img.onerror = () => {
      this.imageLoading.set(false);
      this.imageLoadError.set(true);
    };
    
    img.src = url;
  }

  onImageError(): void {
    this.imageLoadError.set(true);
  }

  onImageLoad(): void {
    this.imageLoadError.set(false);
    this.imageLoading.set(false);
  }
}
