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

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { User } from '@core/entities/user.model';
import {
  PersonalData,
  ContactInfo,
  ChangePassword,
  NotificationPreferences
} from './components';

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
    PersonalData,
    ContactInfo,
    ChangePassword,
    NotificationPreferences
  ],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class Profile implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  isLoading = signal<boolean>(false);
  selectedTab = signal<number>(0);

  // Computed values for UI
  isAgent = computed(() => this.currentUser()?.role === 'agent');
  isClient = computed(() => this.currentUser()?.role === 'client');
  isAdmin = computed(() => this.currentUser()?.role === 'admin');

  fullName = computed(() => {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : '';
  });

  userRoleLabel = computed(() => {
    const role = this.currentUser()?.role;
    switch (role) {
      case 'agent': return 'Agente Immobiliare';
      case 'admin': return 'Amministratore';
      case 'client': return 'Cliente';
      default: return 'Cliente';
    }
  });

  ngOnInit(): void {
    this.loadUserProfile();
  }

  private loadUserProfile(): void {
    this.isLoading.set(true);

    // Get user from auth service first
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUser.set(user);
    }

    // Then fetch updated profile from API
    this.userService.getProfile().subscribe({
      next: (profile) => {
        this.currentUser.set(profile);
        this.isLoading.set(false);
        // Update auth service with fresh data
        this.authService.currentUser.set(profile);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.snackBar.open(
          'Errore nel caricamento del profilo',
          'Chiudi',
          { duration: 3000, panelClass: ['error-snackbar'] }
        );
      }
    });
  }

  onUserUpdated(user: User): void {
    console.log('Profile update event received:', user);
    this.currentUser.set(user);
    this.authService.currentUser.set(user);
    this.snackBar.open(
      'Profilo aggiornato con successo',
      'Chiudi',
      { duration: 3000, panelClass: ['success-snackbar'] }
    );
  }

  onPasswordChanged(): void {
    this.snackBar.open(
      'Password cambiata con successo',
      'Chiudi',
      { duration: 3000, panelClass: ['success-snackbar'] }
    );
  }

  onTabChange(index: number): void {
    this.selectedTab.set(index);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  getAvatarUrl(): string {
    const user = this.currentUser();
    return user?.avatar || 'assets/images/default-avatar.png';
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
