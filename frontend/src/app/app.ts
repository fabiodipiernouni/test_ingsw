import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { Header } from '@shared/components/header/header';
import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    Header
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private titleService = inject(Title);

  ngOnInit(): void {

    // Initialize notifications
    this.initializeNotifications();

    // Handle route changes for analytics/title updates
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Update page title based on route
      this.updatePageTitle(event.url);

      // Scroll to top on route change
      window.scrollTo(0, 0);

    });

  }

  private initializeNotifications(): void {
    // TODO
    // Load notifications if user is authenticated
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        // Load user notifications
        this.notificationService.getNotifications().subscribe();
      }
    });
  }

  private updatePageTitle(url: string): void {
    // Extract title from current route data
    const urlSegments = url.split('/').filter(segment => segment);
    let title = 'DietiEstates25';

    if (urlSegments.length === 0) {
      title = 'Cerca Immobili - DietiEstates25';
    } else {
      // This will be overridden by route-specific titles
      const pageMap: Record<string, string> = {
        'search': 'Cerca Immobili',
        'login': 'Accedi',
        'register': 'Registrati',
        'dashboard': 'Dashboard',
        'profile': 'Il Mio Profilo',
        'saved-searches': 'Ricerche Salvate',
        'notifications': 'Notifiche',
        'favorites': 'I Miei Preferiti',
        'settings': 'Impostazioni'
      };

      const pageName = pageMap[urlSegments[0]];
      if (pageName) {
        title = `${pageName} - DietiEstates25`;
      }
    }

    this.titleService.setTitle(title);
  }
}
