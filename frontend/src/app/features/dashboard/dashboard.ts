import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '@core/services/auth/auth.service';
import { UserModel } from '@core-services/auth/models/UserModel';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit {
  private authService = inject(AuthService);
  currentUser: UserModel | null = null;
  private snackbar = inject(MatSnackBar);

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    console.log('Dashboard currentUser:', this.currentUser);
    console.log('Dashboard currentUser.createdAt:', this.currentUser?.createdAt);
  }

  formatDate(dateString?: string | Date): string {
    if (!dateString) {
      console.log('formatDate: dateString is empty/null/undefined:', dateString);
      return 'N/A';
    }

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.log('formatDate: Invalid date:', dateString);
        return 'N/A';
      }
      return date.toLocaleDateString('it-IT');
    } catch (error) {
      console.log('formatDate: Error parsing date:', error, dateString);
      return 'N/A';
    }
  }

  getUserRoleLabel(): string {
    if (!this.currentUser) return '';
    switch (this.currentUser.role) {
      case 'owner': return 'Proprietario';
      case 'agent': return 'Agente Immobiliare';
      case 'admin': return 'Amministratore';
      case 'client': return 'Cliente';
      default: return 'Cliente';
    }
  }

  logout(): void {
    this.authService.logout();

    this.snackbar.open('Logout effettuato con successo', 'Chiudi', { duration: 3000 });
  }
}
