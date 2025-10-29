import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core/services/auth/auth.service';
import { NotificationType } from '@core-services/shared/types/notification.types';
import { UpdateNotificationPreferencesDto } from '@core-services/auth/dto/UpdateNotificationPreferencesDto';

interface NotificationTypeInfo {
  type: NotificationType;
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-notification-preferences',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './notification-preferences.html',
  styleUrl: './notification-preferences.scss'
})
export class NotificationPreferences implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  notificationForm!: FormGroup;
  isLoading = signal(false);
  isSaving = signal(false);

  // Notification types with their display information
  notificationTypes: NotificationTypeInfo[] = [
    {
      type: 'new_property_match_saved_search',
      title: 'Nuove Proprietà - Ricerche Salvate',
      description: 'Ricevi notifiche quando nuove proprietà corrispondono alle tue ricerche salvate',
      icon: 'home_work'
    },
    {
      type: 'promotional_message',
      title: 'Messaggi Promozionali',
      description: 'Ricevi offerte speciali, promozioni e aggiornamenti dal nostro team',
      icon: 'local_offer'
    },
    {
      type: 'visit_status_update',
      title: 'Aggiornamenti Visite',
      description: 'Ricevi notifiche sullo stato delle tue visite programmate',
      icon: 'event'
    }
  ];

  ngOnInit() {
    this.initializeForm();
    this.loadPreferences();
  }

  private initializeForm() {
    const formControls: { [key: string]: FormControl } = {};

    // Create a form control for each notification type
    this.notificationTypes.forEach(notifType => {
      formControls[notifType.type] = new FormControl(false);
    });

    this.notificationForm = this.fb.group(formControls);
  }

  private loadPreferences() {
    this.isLoading.set(true);

    this.authService.getNotificationPreferences().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const enabledTypes = response.data.enabledNotificationTypes;

          // Set form values based on enabled types
          this.notificationTypes.forEach(notifType => {
            const control = this.notificationForm.get(notifType.type);
            if (control) {
              control.setValue(enabledTypes.includes(notifType.type));
            }
          });

          this.notificationForm.markAsPristine();
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading notification preferences:', error);
        this.snackBar.open('Errore nel caricamento delle preferenze', 'Chiudi', {
          duration: 3000,
          panelClass: 'error-snackbar'
        });
        this.isLoading.set(false);
      }
    });
  }

  onSubmit() {
    if (this.notificationForm.valid && !this.isSaving()) {
      this.isSaving.set(true);

      const formValue = this.notificationForm.value;
      
      // Build array of enabled notification types
      const enabledNotificationTypes: NotificationType[] = [];
      this.notificationTypes.forEach(notifType => {
        if (formValue[notifType.type] === true) {
          enabledNotificationTypes.push(notifType.type);
        }
      });

      const updateDto: UpdateNotificationPreferencesDto = {
        enabledNotificationTypes
      };

      this.authService.updateNotificationPreferences(updateDto).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Preferenze di notifica aggiornate con successo', 'Chiudi', {
              duration: 3000,
              panelClass: 'success-snackbar'
            });
            this.notificationForm.markAsPristine();
          }
          this.isSaving.set(false);
        },
        error: (error) => {
          console.error('Error updating notification preferences:', error);
          this.snackBar.open('Errore nell\'aggiornamento delle preferenze', 'Chiudi', {
            duration: 3000,
            panelClass: 'error-snackbar'
          });
          this.isSaving.set(false);
        }
      });
    }
  }

  isEnabled(type: NotificationType): boolean {
    const control = this.notificationForm.get(type);
    return control ? control.value : false;
  }
}
