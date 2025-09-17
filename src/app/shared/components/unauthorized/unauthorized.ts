import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="error-container">
      <mat-card class="error-card">
        <mat-card-content>
          <div class="error-content">
            <mat-icon class="error-icon">lock</mat-icon>
            <h1>Accesso Negato</h1>
            <p>Non hai i permessi necessari per accedere a questa pagina.</p>
            <div class="error-actions">
              <button mat-raised-button color="primary" (click)="goHome()">
                <mat-icon>home</mat-icon>
                Torna alla Home
              </button>
              <button mat-button (click)="goBack()">
                <mat-icon>arrow_back</mat-icon>
                Indietro
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .error-container {
      min-height: calc(100vh - 140px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
    }

    .error-card {
      max-width: 500px;
      text-align: center;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .error-content {
      padding: 2rem;
    }

    .error-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: #e53e3e;
      margin-bottom: 1.5rem;
    }

    h1 {
      color: #1a202c;
      margin-bottom: 1rem;
      font-weight: 600;
    }

    p {
      color: #718096;
      margin-bottom: 2rem;
      font-size: 1.1rem;
      line-height: 1.6;
    }

    .error-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    @media (max-width: 480px) {
      .error-actions {
        flex-direction: column;
      }
    }
  `]
})
export class Unauthorized {
  private router = inject(Router);

  goHome(): void {
    this.router.navigate(['/']);
  }

  goBack(): void {
    window.history.back();
  }
}
