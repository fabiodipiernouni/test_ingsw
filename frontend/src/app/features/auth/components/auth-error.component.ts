import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-error',
  standalone: true,  
  imports: [CommonModule],
  template: `
    <div class="error-container">
      <div class="error-card">
        <div class="error-icon">⚠️</div>
        <h2>Authentication Error</h2>
        <p class="error-message">{{ errorMessage() }}</p>
        
        <div class="actions">
          <button class="btn-primary" (click)="goHome()">
            Go to Home
          </button>
          <button class="btn-secondary" (click)="tryAgain()">
            Try Again
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f8f9fa;
      padding: 20px;
    }

    .error-card {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 500px;
      width: 100%;
    }

    .error-icon {
      font-size: 48px;
      margin-bottom: 20px;
    }

    h2 {
      color: #dc3545;
      margin-bottom: 20px;
      font-size: 24px;
    }

    .error-message {
      color: #666;
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 30px;
    }

    .actions {
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    }

    button {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      min-width: 120px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    @media (max-width: 480px) {
      .error-card {
        padding: 30px 20px;
      }
      
      .actions {
        flex-direction: column;
      }
      
      button {
        width: 100%;
      }
    }
  `]
})
export class AuthErrorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  errorMessage = signal<string>('An unexpected error occurred during authentication.');

  ngOnInit(): void {
    // Ottieni il messaggio di errore dai query parameters
    const message = this.route.snapshot.queryParams['message'];
    if (message) {
      this.errorMessage.set(decodeURIComponent(message));
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  tryAgain(): void {
    this.router.navigate(['/auth/login']);
  }
}