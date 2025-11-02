import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core-services/auth/auth.service';
import { UserModel } from '@core-services/auth/models/UserModel';
import { UserWarning } from '@features/auth/user-warning/user-warning';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    RouterLink,
    UserWarning
  ],
  templateUrl: './onboarding.html',
  styleUrls: ['./onboarding.scss']
})
export class Onboarding implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  currentUser: UserModel | null = null;

  isOwner = computed(() => this.authService.isOwner());
  isAdmin = computed(() => this.authService.isAdmin());
  isAgent = computed(() => this.authService.isAgent());

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
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

  canUploadProperty(): boolean {
    return this.isAgent();
  }

  canUploadProperties(): boolean {
    return this.isAgent();
  }

  canViewAgencyProperties(): boolean {
    return this.isOwner() || this.isAdmin();
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

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

}
