import { Component } from '@angular/core';
import { AuthLayoutComponent } from '../../../shared/components/auth-layout/auth-layout';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-privacy-page',
  standalone: true,
  imports: [CommonModule, AuthLayoutComponent],
  templateUrl: './privacy-page.html',
  styleUrls: ['./privacy-page.scss']
})
export class PrivacyPageComponent {
  config = {
    title: 'Privacy Policy',
    subtitle: 'Informativa sulla privacy',
  };
}
