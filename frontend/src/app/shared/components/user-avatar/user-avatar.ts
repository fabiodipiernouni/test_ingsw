import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-avatar.html',
  styleUrls: ['./user-avatar.scss']
})
export class UserAvatar {
  @Input() avatarUrl?: string | null;
  @Input() firstName: string = '';
  @Input() lastName: string = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() altText?: string;

  getUserInitials(): string {
    if (!this.firstName || !this.lastName) return '';
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
  }
}
