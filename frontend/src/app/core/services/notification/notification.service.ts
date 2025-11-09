import { Injectable, inject, signal, effect } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, interval, switchMap, startWith, catchError, of, tap } from 'rxjs';
import { environment } from '@src/environments/';
import { ApiResponse } from '@service-shared/dto/ApiResponse';
import { PagedResult } from '@service-shared/dto/pagedResult';
import { NotificationCountResponse } from '@core-services/notification/dto/NotificationCountResponse';
import { NotificationDto } from '@core-services/notification/dto/NotificationDto';
import { GetNotificationsRequest } from '@core-services/notification/dto/GetNotificationsRequest';
import { SendPromotionalMessageDto, SendPromotionalMessageResponse } from '@core-services/notification/dto/SendPromotionalMessageDto';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private readonly API_URL = environment.apiUrlNotifications;
  
  // Signal per il conteggio delle notifiche non lette
  unreadCount = signal<number>(0);
  
  constructor() {
    // Avvia il polling automatico quando il service viene inizializzato
    this.startPolling();
  }

  /**
   * Ottiene il conteggio delle notifiche non lette
   */
  getUnreadCount(): Observable<ApiResponse<NotificationCountResponse>> {
    return this.http.get<ApiResponse<NotificationCountResponse>>(
      `${this.API_URL}/notifications/unread/count`
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.unreadCount.set(response.data.count);
        }
      }),
      catchError(error => {
        console.error('Error fetching unread count:', error);
        return of({ 
          success: false, 
          data: { count: 0 },
          timestamp: new Date()
        } as ApiResponse<NotificationCountResponse>);
      })
    );
  }

  /**
   * Avvia il polling automatico del conteggio
   */
  private startPolling(): void {
    interval(environment.notificationPollingIntervalMs)
      .pipe(
        startWith(0), // Esegui immediatamente la prima chiamata
        switchMap(() => this.getUnreadCount())
      )
      .subscribe();
  }

  /**
   * Forza un refresh immediato del conteggio
   * Utile dopo aver letto/eliminato una notifica
   */
  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe();
  }

  /**
   * Segna una notifica come letta
   */
  markAsRead(notificationId: string): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(
      `${this.API_URL}/notifications/${notificationId}/mark-as-read`,
      {}
    ).pipe(
      tap(() => {
        const currentCount = this.unreadCount();
        if (currentCount > 0) {
          this.unreadCount.set(currentCount - 1);
        }
      })
    );
  }

  /**
   * Segna una notifica come non letta
   */
  markAsUnread(notificationId: string): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(
      `${this.API_URL}/notifications/${notificationId}/mark-as-unread`,
      {}
    ).pipe(
      tap(() => {
        this.unreadCount.set(this.unreadCount() + 1);
      })
    );
  }

  /**
   * Segna tutte le notifiche come lette
   */
  markAllAsRead(): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(
      `${this.API_URL}/notifications/mark-as-read`,
      {}
    ).pipe(
      tap(() => {
        this.unreadCount.set(0);
      })
    );
  }

  /**
   * Elimina una notifica
   */
  deleteNotification(notificationId: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.API_URL}/notifications/${notificationId}`
    ).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  /**
   * Ottiene le notifiche dell'utente con paginazione
   */
  getNotifications(request: GetNotificationsRequest): Observable<ApiResponse<PagedResult<NotificationDto>>> {
    let params = new HttpParams();

    // Aggiungi parametri di paginazione
    if (request.pagedRequest) {
      params = params.set('page', request.pagedRequest.page.toString());
      params = params.set('limit', request.pagedRequest.limit.toString());
      params = params.set('sortBy', request.pagedRequest.sortBy);
      params = params.set('sortOrder', request.pagedRequest.sortOrder);
    }

    // Aggiungi filtro isRead se specificato
    if (request.isRead !== undefined) {
      params = params.set('isRead', request.isRead.toString());
    }

    // Aggiungi filtro tipo se specificato
    if (request.type) {
      params = params.set('type', request.type);
    }

    return this.http.get<ApiResponse<PagedResult<NotificationDto>>>(
      `${this.API_URL}/notifications`,
      { params }
    );
  }

  /**
   * Invia un messaggio promozionale a tutti gli utenti con consenso
   * Solo per admin e owner
   */
  sendPromotionalMessage(dto: SendPromotionalMessageDto): Observable<ApiResponse<SendPromotionalMessageResponse>> {
    return this.http.post<ApiResponse<SendPromotionalMessageResponse>>(
      `${this.API_URL}/promotional-message`,
      dto
    );
  }
}
