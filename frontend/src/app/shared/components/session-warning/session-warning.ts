import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '@core-services/auth/auth.service';

@Component({
  selector: 'app-session-warning',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './session-warning.html',
  styleUrl: './session-warning.scss'
})
export class SessionWarningComponent {
  private readonly authService = inject(AuthService);

  showWarning = signal<boolean>(false);

  constructor() {
    // Monitora il segnale dal servizio di autenticazione
    effect(() => {
      this.showWarning.set(this.authService.tokenExpiringWarning());
    });
  }

  renewSession(): void {
    this.authService.renewSession().subscribe({
      next: () => {
        console.log('Sessione rinnovata con successo');
      },
      error: (error) => {
        console.error('Errore durante il rinnovo della sessione:', error);
      }
    });
  }
}

