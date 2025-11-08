import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

export interface AuthLayoutConfig {
  title: string;
  subtitle: string;
  footerText?: string;
  footerLinkText?: string;
  footerLinkRoute?: string;
  footerLinkQueryParams?: { [key: string]: string };
}

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, RouterModule],
  templateUrl: './auth-layout.html',
  styleUrls: ['./auth-layout.scss']
})
export class AuthLayoutComponent {
  config = input.required<AuthLayoutConfig>();
}
