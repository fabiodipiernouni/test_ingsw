import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

export interface Notification {
  id: string;
  userId: string;
  type: 'new_property' | 'price_change' | 'visit_booked' | 'offer_received' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: any;
  createdAt: Date;
}

export interface NotificationPreferences {
  newProperties: boolean;
  priceChanges: boolean;
  visitUpdates: boolean;
  offers: boolean;
  marketing: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);

  private readonly API_URL = 'http://localhost:8080/api/notifications';

  // Reactive state
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);
  preferences = signal<NotificationPreferences>({
    newProperties: true,
    priceChanges: true,
    visitUpdates: true,
    offers: true,
    marketing: false,
    emailEnabled: true,
    pushEnabled: true
  });

  // Mock data
  private mockNotifications: Notification[] = [
    {
      id: '1',
      userId: 'user1',
      type: 'new_property',
      title: 'Nuova proprietà disponibile!',
      message: 'Abbiamo trovato un nuovo appartamento a Vomero che corrisponde alla tua ricerca salvata.',
      isRead: false,
      actionUrl: '/properties/123',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      id: '2',
      userId: 'user1',
      type: 'price_change',
      title: 'Prezzo ribassato!',
      message: 'Il prezzo della villa a Posillipo che segui è sceso da €480.000 a €450.000.',
      isRead: false,
      actionUrl: '/properties/456',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
    },
    {
      id: '3',
      userId: 'user1',
      type: 'visit_booked',
      title: 'Visita confermata',
      message: 'La tua visita per l\'appartamento in Via Scarlatti è stata confermata per domani alle 15:00.',
      isRead: true,
      actionUrl: '/visits/789',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    }
  ];

  constructor() {
    this.loadNotifications();
  }

  private loadNotifications(): void {
    this.notifications.set(this.mockNotifications);
    this.notificationsSubject.next(this.mockNotifications);
    this.updateUnreadCount();
  }

  getNotifications(page: number = 1, limit: number = 20): Observable<{
    notifications: Notification[];
    hasMore: boolean;
    total: number;
  }> {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotifications = this.mockNotifications.slice(startIndex, endIndex);

    return of({
      notifications: paginatedNotifications,
      hasMore: endIndex < this.mockNotifications.length,
      total: this.mockNotifications.length
    }).pipe(delay(300));
  }

  markAsRead(notificationId: string): Observable<boolean> {
    return of(true).pipe(
      delay(200),
      tap(() => {
        const notification = this.mockNotifications.find(n => n.id === notificationId);
        if (notification) {
          notification.isRead = true;
          this.notifications.update(current =>
            current.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
          );
          this.updateUnreadCount();
        }
      })
    );
  }

  markAllAsRead(): Observable<boolean> {
    return of(true).pipe(
      delay(500),
      tap(() => {
        this.mockNotifications.forEach(n => n.isRead = true);
        this.notifications.update(current =>
          current.map(n => ({ ...n, isRead: true }))
        );
        this.updateUnreadCount();
      })
    );
  }

  deleteNotification(notificationId: string): Observable<boolean> {
    return of(true).pipe(
      delay(200),
      tap(() => {
        this.mockNotifications = this.mockNotifications.filter(n => n.id !== notificationId);
        this.notifications.update(current => current.filter(n => n.id !== notificationId));
        this.updateUnreadCount();
      })
    );
  }

  getPreferences(): Observable<NotificationPreferences> {
    return of(this.preferences()).pipe(delay(200));
  }

  updatePreferences(preferences: Partial<NotificationPreferences>): Observable<NotificationPreferences> {
    const updated = { ...this.preferences(), ...preferences };
    return of(updated).pipe(
      delay(500),
      tap(prefs => {
        this.preferences.set(prefs);
      })
    );
  }

  createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Observable<Notification> {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36),
      createdAt: new Date()
    };

    return of(newNotification).pipe(
      delay(200),
      tap(notif => {
        this.mockNotifications.unshift(notif);
        this.notifications.update(current => [notif, ...current]);
        this.updateUnreadCount();
      })
    );
  }

  private updateUnreadCount(): void {
    const unread = this.mockNotifications.filter(n => !n.isRead).length;
    this.unreadCount.set(unread);
  }

  // Simulate push notification
  sendPushNotification(title: string, message: string, actionUrl?: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: message,
        icon: '/assets/icons/app-icon.png',
        badge: '/assets/icons/badge-icon.png'
      });

      if (actionUrl) {
        notification.onclick = () => {
          window.focus();
          window.location.href = actionUrl;
          notification.close();
        };
      }
    }
  }

  requestNotificationPermission(): Observable<NotificationPermission> {
    return new Observable(observer => {
      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          observer.next(permission);
          observer.complete();
        });
      } else {
        observer.next('denied');
        observer.complete();
      }
    });
  }
}
