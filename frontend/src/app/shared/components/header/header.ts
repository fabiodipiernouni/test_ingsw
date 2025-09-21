import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { User } from '@core/models/user.model';
import {MatDivider} from '@angular/material/divider';
import {MatChip} from '@angular/material/chips';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDivider,
    MatChip
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header implements OnInit {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // Use signals directly from AuthService
  currentUser = this.authService.currentUser;
  isAuthenticated = this.authService.isAuthenticated;
  unreadNotifications = signal<number>(0);
  isMobileMenuOpen = signal<boolean>(false);

  ngOnInit(): void {
    // Subscribe to notification count
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadNotifications.set(count);
    });
  }

  onLogin(): void {
    this.router.navigate(['/login']);
  }

  onRegister(): void {
    this.router.navigate(['/register']);
  }

  onLogout(): void {
    this.authService.logout().subscribe();
    this.isMobileMenuOpen.set(false);
  }

  onProfileClick(): void {
    this.router.navigate(['/profile']);
    this.isMobileMenuOpen.set(false);
  }

  onNotificationsClick(): void {
    this.router.navigate(['/notifications']);
  }

  onUploadProperty(): void {
    this.router.navigate(['/properties/upload']);
    this.isMobileMenuOpen.set(false);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(current => !current);
  }

  getUserInitials(): string {
    const user = this.currentUser();
    if (!user) return '';
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  getUserDisplayName(): string {
    const user = this.currentUser();
    if (!user) return '';
    return `${user.firstName} ${user.lastName}`;
  }

  isAgent(): boolean {
    return this.authService.isAgent();
  }
}
