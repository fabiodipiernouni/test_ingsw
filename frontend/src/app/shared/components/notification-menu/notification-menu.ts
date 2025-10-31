import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@core/services/notification/notification.service';
import { NotificationDto } from '@core/services/notification/dto/NotificationDto';
import { GetNotificationsRequest } from '@core/services/notification/dto/GetNotificationsRequest';

@Component({
  selector: 'app-notification-menu',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './notification-menu.html',
  styleUrl: './notification-menu.scss'
})
export class NotificationMenu {
  notificationService = inject(NotificationService);
  router = inject(Router);
  
  // Esponi il signal per il template
  unreadCount = this.notificationService.unreadCount;
  
  // Lista delle notifiche
  notifications = signal<NotificationDto[]>([]);
  
  // Stato di caricamento
  isLoading = signal<boolean>(false);
  
  // Stato per caricare altre notifiche
  hasMore = signal<boolean>(true);
  
  // Pagina corrente
  currentPage = signal<number>(1);
  
  // Limite di notifiche per pagina
  readonly PAGE_LIMIT = 10;

  onNotificationClick(): void {
    // Carica le notifiche quando si apre il menu
    if (this.notifications().length === 0) {
      this.loadNotifications();
    }
  }

  /**
   * Carica le notifiche
   */
  loadNotifications(reset: boolean = true): void {
    if (this.isLoading()) return;
    
    if (reset) {
      this.currentPage.set(1);
      this.notifications.set([]);
    }
    
    this.isLoading.set(true);
    
    const request: GetNotificationsRequest = {
      pagedRequest: {
        page: this.currentPage(),
        limit: this.PAGE_LIMIT,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      }
    };
    
    this.notificationService.getNotifications(request).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const currentNotifications = reset ? [] : this.notifications();
          this.notifications.set([...currentNotifications, ...response.data.data]);
          
          // Verifica se ci sono altre notifiche da caricare
          this.hasMore.set(
            response.data.currentPage < response.data.totalPages
          );
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Carica altre notifiche (pagina successiva)
   */
  loadMore(): void {
    if (!this.hasMore() || this.isLoading()) return;
    
    this.currentPage.set(this.currentPage() + 1);
    this.loadNotifications(false);
  }

  /**
   * Segna tutte le notifiche come lette
   */
  onMarkAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        // Aggiorna lo stato locale
        this.notifications.set(
          this.notifications().map(n => ({ ...n, isRead: true }))
        );
      },
      error: (error) => {
        console.error('Error marking all as read:', error);
      }
    });
  }

  /**
   * Segna una notifica come letta
   */
  markAsRead(notification: NotificationDto, event: Event): void {
    event.stopPropagation();
    
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        // Aggiorna lo stato locale
        this.notifications.set(
          this.notifications().map(n => 
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
      }
    });
  }

  /**
   * Segna una notifica come non letta
   */
  markAsUnread(notification: NotificationDto, event: Event): void {
    event.stopPropagation();
    
    this.notificationService.markAsUnread(notification.id).subscribe({
      next: () => {
        // Aggiorna lo stato locale
        this.notifications.set(
          this.notifications().map(n => 
            n.id === notification.id ? { ...n, isRead: false } : n
          )
        );
      },
      error: (error) => {
        console.error('Error marking notification as unread:', error);
      }
    });
  }

  /**
   * Gestisce il click su una notifica
   */
  onNotificationItemClick(notification: NotificationDto): void {
    // Se non è già letta, segnala come letta e aspetta prima di fare il redirect
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          // Aggiorna lo stato locale
          this.notifications.set(
            this.notifications().map(n => 
              n.id === notification.id ? { ...n, isRead: true } : n
            )
          );
          
          // Dopo aver segnato come letta, effettua la navigazione se presente
          if (notification.actionUrl) {
            this.navigateToUrl(notification.actionUrl);
          }
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
          // Anche in caso di errore, effettua la navigazione se presente
          if (notification.actionUrl) {
            this.navigateToUrl(notification.actionUrl);
          }
        }
      });
    } else {
      // Se è già letta, vai direttamente all'URL se presente
      if (notification.actionUrl) {
        this.navigateToUrl(notification.actionUrl);
      }
    }
  }

  /**
   * Naviga all'URL specificato
   * Se è un URL interno, usa il router, altrimenti apre un link esterno
   */
  private navigateToUrl(url: string): void {
    try {
      // Controlla se è un URL esterno
      if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
      } else {
        // URL interno, usa il router
        this.router.navigateByUrl(url);
      }
    } catch (error) {
      console.error('Error navigating to URL:', error);
      // Fallback a window.location
      window.location.href = url;
    }
  }

  /**
   * Restituisce l'icona appropriata per il tipo di notifica
   */
  getNotificationIcon(notification: NotificationDto): string {
    switch (notification.type) {
      case 'new_property_match_saved_search':
        return 'home';
      case 'promotional_message':
        return 'campaign';
      case 'visit_status_update':
        return 'event';
      default:
        return 'notifications';
    }
  }

  /**
   * Restituisce il colore dell'icona per il tipo di notifica
   */
  getNotificationColor(notification: NotificationDto): string {
    switch (notification.type) {
      case 'new_property_match_saved_search':
        return 'primary';
      case 'promotional_message':
        return 'accent';
      case 'visit_status_update':
        return 'warn';
      default:
        return '';
    }
  }

  /**
   * Formatta la data in modo user-friendly
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
      return 'Proprio ora';
    } else if (diffMins < 60) {
      return `${diffMins} minuti fa`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'ora' : 'ore'} fa`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'giorno' : 'giorni'} fa`;
    } else {
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }
}
