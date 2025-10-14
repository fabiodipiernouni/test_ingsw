import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { OAuthCallbackService } from '@core/services/auth/oauth-callback.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth-callback.html',
  styleUrls: ['./oauth-callback.scss'],
})
export class OAuthCallback implements OnInit {
  private route = inject(ActivatedRoute);
  private oauthCallbackService = inject(OAuthCallbackService);

  ngOnInit(): void {
    // Gestisce il callback OAuth
    this.oauthCallbackService.handleCallback(this.route);
  }
}