import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

import { ApiResponse } from '@service-shared/dto/ApiResponse';
import { environment } from '@src/environments/';
import { SavedSearchCreateDto } from './dto/SavedSearchCreateDto';
import { SavedSearchResponse } from './dto/SavedSearchResponse';
import { ToggleNotificationsDto } from './dto/ToggleNotificationsDto';
import { UpdateSavedSearchNameDto } from './dto/UpdateSavedSearchNameDto';
import { SavedSearchModel } from './models/SavedSearchModel';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly http = inject(HttpClient);

  private readonly API_URL = `${environment.apiUrlSearch}/search`;

  // Reactive state
  savedSearches = signal<SavedSearchModel[]>([]);
  isLoading = signal<boolean>(false);

  constructor() {}

  /**
   * Crea una nuova ricerca salvata
   * POST /search/saved
   */
  createSavedSearch(searchData: SavedSearchCreateDto): Observable<SavedSearchModel> {
    this.isLoading.set(true);

    return this.http.post<ApiResponse<SavedSearchResponse>>(`${this.API_URL}/saved`, searchData).pipe(
      map(response => {
        if (response.success && response.data) {
          return this.convertSavedSearchResponseToModel(response.data);
        }
        throw new Error(response.message || 'Errore durante il salvataggio della ricerca');
      }),
      tap(savedSearch => {
        // Aggiungo la nuova ricerca salvata allo stato
        this.savedSearches.update(current => [savedSearch, ...current]);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        console.error('Errore durante il salvataggio della ricerca:', error);
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Recupera tutte le ricerche salvate dell'utente
   * GET /search/saved
   */
  getSavedSearches(): Observable<SavedSearchModel[]> {
    this.isLoading.set(true);

    return this.http.get<ApiResponse<SavedSearchResponse[]>>(`${this.API_URL}/saved`).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data.map(item => this.convertSavedSearchResponseToModel(item));
        }
        throw new Error(response.message || 'Errore durante il recupero delle ricerche salvate');
      }),
      tap(searches => {
        this.savedSearches.set(searches);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        console.error('Errore durante il recupero delle ricerche salvate:', error);
        this.isLoading.set(false);
        this.savedSearches.set([]);
        return throwError(() => error);
      })
    );
  }

  /**
   * Elimina una ricerca salvata
   * DELETE /search/saved/:searchId
   */
  deleteSavedSearch(searchId: string): Observable<boolean> {
    this.isLoading.set(true);

    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/saved/${searchId}`).pipe(
      map(() => true),
      tap(() => {
        // Rimuovo la ricerca salvata dallo stato
        this.savedSearches.update(current => 
          current.filter(search => search.id !== searchId)
        );
        this.isLoading.set(false);
      }),
      catchError((error) => {
        console.error(`Errore durante l'eliminazione della ricerca salvata ${searchId}:`, error);
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Attiva/disattiva le notifiche per una ricerca salvata
   * PATCH /search/saved/:searchId/notifications
   */
  toggleNotifications(searchId: string, isNotificationEnabled: boolean): Observable<SavedSearchModel> {
    this.isLoading.set(true);

    const body: ToggleNotificationsDto = { isNotificationEnabled };

    return this.http.patch<ApiResponse<SavedSearchResponse>>(
      `${this.API_URL}/saved/${searchId}/notifications`,
      body
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          return this.convertSavedSearchResponseToModel(response.data);
        }
        throw new Error(response.message || 'Errore durante l\'aggiornamento delle notifiche');
      }),
      tap(updatedSearch => {
        // Aggiorno lo stato della ricerca salvata
        this.savedSearches.update(current =>
          current.map(search => 
            search.id === searchId ? updatedSearch : search
          )
        );
        this.isLoading.set(false);
      }),
      catchError((error) => {
        console.error(`Errore durante l'aggiornamento delle notifiche per la ricerca ${searchId}:`, error);
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Aggiorna il nome di una ricerca salvata
   * PATCH /search/saved/:searchId/name
   */
  updateSavedSearchName(searchId: string, name: string): Observable<SavedSearchModel> {
    this.isLoading.set(true);

    const body: UpdateSavedSearchNameDto = { name };

    return this.http.patch<ApiResponse<SavedSearchResponse>>(
      `${this.API_URL}/saved/${searchId}/name`,
      body
    ).pipe(
      map(response => {
        if (response.success && response.data) {
          return this.convertSavedSearchResponseToModel(response.data);
        }
        throw new Error(response.message || 'Errore durante l\'aggiornamento del nome');
      }),
      tap(updatedSearch => {
        // Aggiorno lo stato della ricerca salvata
        this.savedSearches.update(current =>
          current.map(search => 
            search.id === searchId ? updatedSearch : search
          )
        );
        this.isLoading.set(false);
      }),
      catchError((error) => {
        console.error(`Errore durante l'aggiornamento del nome per la ricerca ${searchId}:`, error);
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Ricarica le ricerche salvate (utile dopo operazioni che potrebbero modificarle)
   */
  refreshSavedSearches(): Observable<SavedSearchModel[]> {
    return this.getSavedSearches();
  }

  /**
   * Converte SavedSearchResponse a SavedSearchModel
   */
  private convertSavedSearchResponseToModel(response: SavedSearchResponse): SavedSearchModel {
    return {
      id: response.id,
      userId: response.userId,
      name: response.name,
      filters: response.filters,
      isNotificationEnabled: response.isNotificationEnabled,
      lastSearchedAt: new Date(response.lastSearchedAt),
      createdAt: new Date(response.createdAt),
      updatedAt: new Date(response.updatedAt)
    };
  }
}
