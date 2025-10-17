import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '@core/services/auth/auth.service';
import { UserModel } from '@core/services/auth/models/UserModel';
import { ChangePassword } from './components/change-password/change-password';
import { VerifyEmail } from './components/verify-email/verify-email';
import { NotificationPreferences } from './components/notification-preferences/notification-preferences';
import { UserAvatar } from '@shared/components/user-avatar/user-avatar';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    RouterModule,
    ChangePassword,
    VerifyEmail,
    NotificationPreferences,
    UserAvatar
  ],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class Profile implements OnInit {
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  currentUser = signal<UserModel | null>(null);
  isLoading = signal<boolean>(false);
  selectedTab = signal<number>(0);

  // Computed values for UI
  isAgent = computed(() => this.authService.isAgent());
  isClient = computed(() => this.authService.isClient());
  isAdmin = computed(() => this.authService.isAdmin());
  isOwner = computed(() => this.authService.isOwner());

  fullName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });

  userRoleLabel = computed(() => {
    const role = this.currentUser()?.role;
    switch (role) {
      case 'agent': return 'Agente Immobiliare';
      case 'admin': return 'Amministratore';
      case 'owner': return 'Proprietario';
      case 'client': return 'Cliente';
      default: return 'Cliente';
    }
  });

  ngOnInit(): void {
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    // Get user from auth service
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUser.set(user);
    }
  }

  onPasswordChanged(): void {
    this.snackBar.open(
      'Password cambiata con successo',
      'Chiudi',
      { duration: 3000, panelClass: ['success-snackbar'] }
    );
  }

  onEmailVerified(): void {
    this.snackBar.open(
      'Email verificata con successo',
      'Chiudi',
      { duration: 3000, panelClass: ['success-snackbar'] }
    );
    this.loadUserProfile();
  }

  onTabChange(index: number): void {
    this.selectedTab.set(index);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  getJoinDateLabel(): string {
    const user = this.currentUser();
    if (!user?.createdAt) return '';

    const date = new Date(user.createdAt);
    return date.toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long'
    });
  }
}
