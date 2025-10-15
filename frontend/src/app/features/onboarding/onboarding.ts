import { Component, inject, OnInit } from '@angular/core';
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

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
  }

  isOwner(): boolean {
    return this.currentUser?.role === 'owner';
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  isAgent(): boolean {
    return this.currentUser?.role === 'agent';
  }

  canCreateAdmins(): boolean {
    return this.isOwner();
  }

  canCreateAgents(): boolean {
    return this.isOwner() || this.isAdmin();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

}
