import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { OAuthProvider } from '@core/entities/user.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-oauth',
    standalone: true,
    imports: [CommonModule, MatProgressSpinnerModule],
    template: `
        <div class="oauth-callback">
            <div class="loading-container">
                <mat-spinner></mat-spinner>
                <p>Completando l'autenticazione...</p>
            </div>
        </div>
    `,
    styles: [`
        .oauth-callback {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .loading-container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        p {
            margin-top: 1rem;
            color: #666;
        }
    `]
})
export class OAuthCallback implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private authService = inject(AuthService);
    private snackBar = inject(MatSnackBar);

    ngOnInit(): void {
        // Get OAuth callback parameters
        const queryParams = this.route.snapshot.queryParams;

        console.log('OAuth Callback - Current URL:', window.location.href);
        console.log('OAuth Callback - Query params:', queryParams);

        // Check for OAuth errors first
        const error = queryParams['error'];
        const errorDescription = queryParams['error_description'];

        if (error) {
            this.handleOAuthError(error, errorDescription);
            return;
        }

        // The backend should have processed the OAuth flow and redirected here with tokens
        // Check if we have token in query params (success case)
        const token = queryParams['token'];
        const refreshToken = queryParams['refreshToken'];
        const isNewUser = queryParams['isNewUser'] === 'true';
        const userJson = queryParams['user']; // User data from backend

        if (token) {
            // Handle successful OAuth login
            this.handleOAuthSuccess(token, refreshToken, isNewUser, userJson);
        } else {
            // No token found - this means OAuth flow wasn't completed properly
            console.error('No token found in callback URL');
            this.handleOAuthError('Authentication failed', 'No token received from OAuth provider');
        }
    }

    private handleOAuthSuccess(token: string, refreshToken?: string, isNewUser?: boolean, userJson?: string): void {
        try {
            // Parse user data if provided
            let user = null;
            if (userJson) {
                user = JSON.parse(decodeURIComponent(userJson));
                console.log('OAuth user data received:', user);
            }

            // Use AuthService to handle the authentication
            this.authService.handleOAuthSuccess(token, refreshToken, user, isNewUser);

            // Show success message
            const message = isNewUser ? 'Account creato con successo!' : 'Login effettuato con successo!';
            this.snackBar.open(message, 'Chiudi', {
                duration: 3000,
                panelClass: ['success-snackbar']
            });

            // Redirect based on user state
            const redirectUrl = isNewUser ? '/onboarding' : '/dashboard';
            this.router.navigate([redirectUrl]);

        } catch (error) {
            console.error('Error processing OAuth success:', error);
            this.handleOAuthError('Processing Error', 'Failed to process authentication data');
        }
    }

    private handleOAuthError(error: string, description?: string): void {
        console.error('OAuth Error:', error, description);

        this.snackBar.open(
            description || 'Errore durante l\'autenticazione OAuth',
            'Chiudi',
            {
                duration: 5000,
                panelClass: ['error-snackbar']
            }
        );

        // Redirect back to login
        this.router.navigate(['/login']);
    }
}
