import { Component, Input, OnInit, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';

import { UserService } from '../../../../core/services/user.service';
import { User } from '@core/entities/user.model';

interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  preferences: NotificationPreference[];
}

interface NotificationPreference {
  id: string;
  title: string;
  description: string;
  email: boolean;
  push: boolean;
}

@Component({
  selector: 'app-notification-preferences',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatCardModule,
    MatDividerModule
  ],
  templateUrl: './notification-preferences.html',
  styleUrl: './notification-preferences.scss'
})
export class NotificationPreferences implements OnInit, OnChanges {
  @Input() user!: User;

  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);

  notificationForm!: FormGroup;
  isLoading = signal(false);
  hasChanges = signal(false);
  pushPermissionStatus = signal<NotificationPermission>('default');

  constructor() {
    // Initialize form early to prevent undefined errors
    this.notificationForm = this.fb.group({});

    // Check initial notification permission status
    this.checkNotificationPermission();
  }

  notificationCategories: NotificationCategory[] = [
    {
      id: 'property_alerts',
      title: 'Avvisi Proprietà',
      description: 'Notifiche su nuove proprietà e aggiornamenti di ricerche salvate',
      icon: 'home_work',
      preferences: [
        {
          id: 'new_properties',
          title: 'Nuove Proprietà',
          description: 'Notifica quando vengono pubblicate nuove proprietà che corrispondono alle tue ricerche',
          email: true,
          push: true
        },
        {
          id: 'price_changes',
          title: 'Cambi di Prezzo',
          description: 'Notifica quando il prezzo delle proprietà nei tuoi preferiti cambia',
          email: true,
          push: false
        },
        {
          id: 'property_updates',
          title: 'Aggiornamenti Proprietà',
          description: 'Notifica quando le proprietà nei tuoi preferiti vengono aggiornate',
          email: false,
          push: true
        }
      ]
    },
    {
      id: 'account_security',
      title: 'Sicurezza Account',
      description: 'Notifiche importanti sulla sicurezza del tuo account',
      icon: 'security',
      preferences: [
        {
          id: 'login_alerts',
          title: 'Accessi Sospetti',
          description: 'Notifica per accessi da dispositivi o località non riconosciute',
          email: true,
          push: true
        },
        {
          id: 'password_changes',
          title: 'Cambi Password',
          description: 'Notifica quando la password viene cambiata',
          email: true,
          push: false
        },
        {
          id: 'profile_changes',
          title: 'Modifiche Profilo',
          description: 'Notifica per modifiche importanti al profilo',
          email: true,
          push: false
        }
      ]
    },
    {
      id: 'communications',
      title: 'Comunicazioni',
      description: 'Messaggi e comunicazioni da agenti e altre persone',
      icon: 'message',
      preferences: [
        {
          id: 'agent_messages',
          title: 'Messaggi da Agenti',
          description: 'Notifica per nuovi messaggi da agenti immobiliari',
          email: true,
          push: true
        },
        {
          id: 'appointment_reminders',
          title: 'Promemoria Appuntamenti',
          description: 'Promemoria per appuntamenti programmati per visite',
          email: true,
          push: true
        },
        {
          id: 'system_messages',
          title: 'Messaggi di Sistema',
          description: 'Comunicazioni importanti dal sistema',
          email: true,
          push: false
        }
      ]
    }
  ];

  // Additional categories for agents
  agentCategories: NotificationCategory[] = [
    {
      id: 'business_updates',
      title: 'Aggiornamenti Business',
      description: 'Notifiche relative alla tua attività immobiliare',
      icon: 'business_center',
      preferences: [
        {
          id: 'new_leads',
          title: 'Nuovi Contatti',
          description: 'Notifica quando ricevi nuovi contatti interessati',
          email: true,
          push: true
        },
        {
          id: 'appointment_requests',
          title: 'Richieste Appuntamento',
          description: 'Notifica per nuove richieste di appuntamento',
          email: true,
          push: true
        },
        {
          id: 'property_inquiries',
          title: 'Richieste Informazioni',
          description: 'Notifica per richieste di informazioni sulle tue proprietà',
          email: true,
          push: true
        }
      ]
    }
  ];

  ngOnInit() {
    this.initializeForm();
    this.setupPermissionListener();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && changes['user'].currentValue) {
      this.initializeForm();
    }
  }

  private initializeForm() {
    const formControls: any = {};

    // Check notification permission status first
    this.checkNotificationPermission();

    // Initialize form controls for all categories
    const allCategories = [...this.notificationCategories,
                          ...(this.user.role === 'agent' ? this.agentCategories : [])];

    allCategories.forEach(category => {
      category.preferences.forEach(preference => {
        // Email controls - sempre abilitati
        formControls[`${preference.id}_email`] = [preference.email];

        // Push controls - gestione dello stato disabled in base ai permessi
        const pushEnabled = preference.push && this.pushPermissionStatus() === 'granted';
        const canEnablePush = this.canEnablePushNotifications();

        formControls[`${preference.id}_push`] = [
          { value: pushEnabled, disabled: !canEnablePush }
        ];
      });
    });

    this.notificationForm = this.fb.group(formControls);

    // Track changes
    this.notificationForm.valueChanges.subscribe(() => {
      this.hasChanges.set(this.notificationForm.dirty);
    });
  }

  onSubmit() {
    if (this.notificationForm.valid) {
      this.isLoading.set(true);

      const preferences = this.buildPreferencesObject();

      this.userService.updateNotificationPreferences(preferences)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: () => {
            this.notificationForm.markAsPristine();
            this.hasChanges.set(false);

            this.snackBar.open('Preferenze di notifica aggiornate con successo', 'Chiudi', {
              duration: 3000,
              panelClass: 'success-snackbar'
            });
          },
          error: (error: any) => {
            console.error('Error updating notification preferences:', error);
            this.snackBar.open('Errore nell\'aggiornamento delle preferenze', 'Chiudi', {
              duration: 3000,
              panelClass: 'error-snackbar'
            });
          }
        });
    }
  }

  private buildPreferencesObject() {
    // Usa getRawValue() per includere anche i controlli disabilitati
    const formValue = this.notificationForm.getRawValue();
    const preferences: any = {};

    const allCategories = [...this.notificationCategories,
                          ...(this.user.role === 'agent' ? this.agentCategories : [])];

    allCategories.forEach(category => {
      preferences[category.id] = {};
      category.preferences.forEach(preference => {
        preferences[category.id][preference.id] = {
          email: formValue[`${preference.id}_email`] || false,
          push: formValue[`${preference.id}_push`] || false
        };
      });
    });

    return preferences;
  }

  resetToDefaults() {
    const allCategories = [...this.notificationCategories,
                          ...(this.user.role === 'agent' ? this.agentCategories : [])];

    allCategories.forEach(category => {
      category.preferences.forEach(preference => {
        // Reset email controls
        const emailControl = this.notificationForm.get(`${preference.id}_email`);
        if (emailControl) {
          emailControl.setValue(preference.email);
        }

        // Reset push controls solo se sono abilitati
        const pushControl = this.notificationForm.get(`${preference.id}_push`);
        if (pushControl && !pushControl.disabled) {
          pushControl.setValue(preference.push);
        }
      });
    });
  }

  toggleCategoryEmail(category: NotificationCategory, enabled: boolean) {
    category.preferences.forEach(preference => {
      const emailControl = this.notificationForm.get(`${preference.id}_email`);
      if (emailControl) {
        emailControl.setValue(enabled);
      }
    });
  }

  async toggleCategoryPush(category: NotificationCategory, enabled: boolean) {
    if (enabled) {
      // Controlla se le notifiche sono supportate
      if (!('Notification' in window)) {
        this.snackBar.open('Il tuo browser non supporta le notifiche push.', 'Chiudi', {
          duration: 3000,
          panelClass: 'error-snackbar'
        });
        return;
      }

      // Se il permesso è già stato negato, non fare nulla
      if (Notification.permission === 'denied') {
        this.snackBar.open('Permesso per le notifiche negato. Abilita dalle impostazioni del browser per continuare.', 'Chiudi', {
          duration: 5000,
          panelClass: 'error-snackbar'
        });
        return;
      }

      // Se il permesso non è ancora concesso, richiedilo
      if (Notification.permission === 'default') {
        try {
          const permission = await Notification.requestPermission();
          this.pushPermissionStatus.set(permission);

          if (permission === 'granted') {
            // Abilita tutti i controlli push ora che abbiamo il permesso
            this.updatePushControlsState();
            this.snackBar.open('Notifiche push abilitate con successo!', 'Chiudi', {
              duration: 3000,
              panelClass: 'success-snackbar'
            });
          } else {
            this.updatePushControlsState();
            this.snackBar.open('Permesso per le notifiche negato. Puoi abilitarlo dalle impostazioni del browser.', 'Chiudi', {
              duration: 5000,
              panelClass: 'error-snackbar'
            });
            return;
          }
        } catch (error) {
          console.error('Error requesting notification permission:', error);
          this.snackBar.open('Errore nella richiesta del permesso per le notifiche.', 'Chiudi', {
            duration: 3000,
            panelClass: 'error-snackbar'
          });
          return;
        }
      }

      // Se arriviamo qui, il permesso è concesso - attiva tutte le notifiche push
      category.preferences.forEach(preference => {
        const pushControl = this.notificationForm.get(`${preference.id}_push`);
        if (pushControl && !pushControl.disabled) {
          pushControl.setValue(true);
        }
      });

      this.snackBar.open(`Tutte le notifiche push per "${category.title}" sono state attivate!`, 'Chiudi', {
        duration: 2000,
        panelClass: 'success-snackbar'
      });
    } else {
      // Disattiva tutte le notifiche push della categoria
      category.preferences.forEach(preference => {
        const pushControl = this.notificationForm.get(`${preference.id}_push`);
        if (pushControl && !pushControl.disabled) {
          pushControl.setValue(false);
        }
      });

      this.snackBar.open(`Tutte le notifiche push per "${category.title}" sono state disattivate.`, 'Chiudi', {
        duration: 2000,
        panelClass: 'info-snackbar'
      });
    }
  }

  async onPushToggleChange(preferenceId: string, enabled: boolean) {
    if (enabled) {
      // Controlla se le notifiche sono supportate
      if (!('Notification' in window)) {
        this.notificationForm.patchValue({
          [`${preferenceId}_push`]: false
        });
        this.snackBar.open('Il tuo browser non supporta le notifiche push.', 'Chiudi', {
          duration: 3000,
          panelClass: 'error-snackbar'
        });
        return;
      }

      // Se il permesso è già stato negato, non fare nulla
      if (Notification.permission === 'denied') {
        this.notificationForm.patchValue({
          [`${preferenceId}_push`]: false
        });
        this.snackBar.open('Permesso per le notifiche negato. Abilita dalle impostazioni del browser per continuare.', 'Chiudi', {
          duration: 5000,
          panelClass: 'error-snackbar'
        });
        return;
      }

      // Se il permesso è già concesso, attiva semplicemente
      if (Notification.permission === 'granted') {
        this.pushPermissionStatus.set('granted');
        this.snackBar.open('Notifica push attivata!', 'Chiudi', {
          duration: 2000,
          panelClass: 'success-snackbar'
        });
        return;
      }

      // Richiedi il permesso se è la prima volta
      try {
        const permission = await Notification.requestPermission();
        this.pushPermissionStatus.set(permission);

        if (permission === 'granted') {
          // Abilita tutti i controlli push ora che abbiamo il permesso
          this.updatePushControlsState();
          this.snackBar.open('Notifiche push abilitate con successo!', 'Chiudi', {
            duration: 3000,
            panelClass: 'success-snackbar'
          });
        } else {
          // Revert the toggle se il permesso è negato
          const control = this.notificationForm.get(`${preferenceId}_push`);
          if (control) {
            control.setValue(false);
          }
          this.updatePushControlsState();
          this.snackBar.open('Permesso per le notifiche negato. Puoi abilitarlo dalle impostazioni del browser.', 'Chiudi', {
            duration: 5000,
            panelClass: 'error-snackbar'
          });
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        const control = this.notificationForm.get(`${preferenceId}_push`);
        if (control) {
          control.setValue(false);
        }
        this.snackBar.open('Errore nella richiesta del permesso per le notifiche.', 'Chiudi', {
          duration: 3000,
          panelClass: 'error-snackbar'
        });
      }
    } else {
      // L'utente sta disabilitando le notifiche push
      this.snackBar.open('Notifica push disabilitata.', 'Chiudi', {
        duration: 2000,
        panelClass: 'info-snackbar'
      });
    }
  }

  getDisplayCategories(): NotificationCategory[] {
    return this.user.role === 'agent'
      ? [...this.notificationCategories, ...this.agentCategories]
      : this.notificationCategories;
  }

  private checkNotificationPermission(): void {
    if ('Notification' in window) {
      this.pushPermissionStatus.set(Notification.permission);

      // Se il permesso è stato negato o revocato, disabilita tutte le notifiche push
      if (Notification.permission === 'denied') {
        this.disableAllPushNotifications();
      }
    } else {
      this.pushPermissionStatus.set('denied');
      this.disableAllPushNotifications();
    }
  }

  private disableAllPushNotifications(): void {
    if (this.notificationForm) {
      const allCategories = [...this.notificationCategories,
                            ...(this.user?.role === 'agent' ? this.agentCategories : [])];

      allCategories.forEach(category => {
        category.preferences.forEach(preference => {
          const control = this.notificationForm.get(`${preference.id}_push`);
          if (control) {
            control.setValue(false);
            control.disable();
          }
        });
      });

      this.snackBar.open('Le notifiche push sono state disabilitate perché il consenso è stato revocato.', 'Chiudi', {
        duration: 5000,
        panelClass: 'warning-snackbar'
      });
    }
  }

  private updatePushControlsState(): void {
    if (this.notificationForm) {
      const allCategories = [...this.notificationCategories,
                            ...(this.user?.role === 'agent' ? this.agentCategories : [])];

      const canEnablePush = this.canEnablePushNotifications();

      allCategories.forEach(category => {
        category.preferences.forEach(preference => {
          const control = this.notificationForm.get(`${preference.id}_push`);
          if (control) {
            if (canEnablePush) {
              control.enable();
            } else {
              control.setValue(false);
              control.disable();
            }
          }
        });
      });
    }
  }

  isPushNotificationAvailable(): boolean {
    return 'Notification' in window && this.pushPermissionStatus() === 'granted';
  }

  canEnablePushNotifications(): boolean {
    return 'Notification' in window && this.pushPermissionStatus() !== 'denied';
  }

  private setupPermissionListener(): void {
    // Controlla periodicamente i permessi delle notifiche per rilevare cambiamenti
    // (ad esempio se l'utente revoca il permesso dalle impostazioni del browser)
    if ('Notification' in window) {
      setInterval(() => {
        const currentPermission = Notification.permission;
        if (currentPermission !== this.pushPermissionStatus()) {
          this.pushPermissionStatus.set(currentPermission);

          // Aggiorna lo stato di tutti i controlli push
          this.updatePushControlsState();

          if (currentPermission === 'denied') {
            this.snackBar.open('Le notifiche push sono state disabilitate perché il consenso è stato revocato.', 'Chiudi', {
              duration: 5000,
              panelClass: 'warning-snackbar'
            });
          }
        }
      }, 2000); // Controlla ogni 2 secondi
    }
  }
}
