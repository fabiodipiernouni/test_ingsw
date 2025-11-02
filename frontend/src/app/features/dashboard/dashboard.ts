import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { UserModel } from '@core-services/auth/models/UserModel';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserWarning } from '@features/auth/user-warning/user-warning';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    RouterModule,
    UserWarning
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  currentUser: UserModel | null = null;
  private snackbar = inject(MatSnackBar);

  isOwner = computed(() => this.authService.isOwner());
  isAdmin = computed(() => this.authService.isAdmin());
  isAgent = computed(() => this.authService.isAgent());

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

  getRoleDescription(): string {
    if (!this.currentUser) return '';
    switch (this.currentUser.role) {
      case 'owner': return 'Gestisci amministratori e agenti';
      case 'admin': return 'Gestisci agenti immobiliari';
      case 'agent': return 'Gestisci i tuoi immobili';
      case 'client': return 'Trova la casa dei tuoi sogni';
      default: return '';
    }
  }

  canUploadProperties(): boolean {
    return this.isAgent();
  }

  canViewAgencyProperties(): boolean {
    return this.isOwner() || this.isAdmin();
  }

  canCreateAdmins(): boolean {
    return this.isOwner();
  }

  canCreateAgents(): boolean {
    return this.isOwner() || this.isAdmin();
  }

  canManageAgency(): boolean {
    return this.canCreateAdmins() || this.canCreateAgents();
  }

  canSendPromotions(): boolean {
    return this.isAdmin() || this.isOwner();
  }

  goToMyProperties(): void {
    const user = this.currentUser;
    if (!user) return;
    
    const filters = JSON.stringify({ agentId: user.id });
    this.router.navigate(['/search'], { queryParams: { filters } });
  }

  goToAgencyProperties(): void {
    const user = this.currentUser;
    if (!user?.agency?.id) return;
    
    const filters = JSON.stringify({ agencyId: user.agency.id });
    this.router.navigate(['/search'], { queryParams: { filters } });
  }

  logout(): void {
    this.authService.logout();

    this.snackbar.open('Logout effettuato con successo', 'Chiudi', { duration: 3000 });
  }
}
