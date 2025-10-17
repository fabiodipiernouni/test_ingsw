import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

import { ApiResponse } from '@service-shared/dto/ApiResponse';
import {PagedRequest} from '@service-shared/dto/pagedRequest';
import {SearchPropertiesFilter} from '@core/services/property/dto/SearchPropertiesFilter';
import {PagedResult} from '@service-shared/dto/pagedResult';
import {PropertyCardDto} from '@core/services/property/dto/PropertyCardDto';
import {PropertyModel} from '@features/properties/models/PropertyModel';
import {Helper} from '@core/services/property/Utils/helper';
import {environment} from '@src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private readonly http = inject(HttpClient);

  private readonly API_URL = `${environment.apiUrlProperties}/properties`;

  // Reactive state
  private readonly propertiesSubject = new BehaviorSubject<PropertyCardDto[]>([]);
  public properties$ = this.propertiesSubject.asObservable();

  properties = signal<PropertyCardDto[]>([]);
  totalCount = signal<number>(0);
  isLoading = signal<boolean>(false);

  constructor() {

  }

  searchProperties(filters: SearchPropertiesFilter, pagedRequest: PagedRequest): Observable<PagedResult<PropertyCardDto>> {
    this.isLoading.set(true);

    // Costruisco il body della request secondo GetPropertiesCardsRequest
    const requestBody = {
      filters: filters,
      pagedRequest: pagedRequest
    };

    // POST /properties/cards
    return this.http.post<ApiResponse<PagedResult<PropertyCardDto>>>(`${this.API_URL}/cards`, requestBody).pipe(
      map(response => {
        // La response contiene già un PagedResult con la struttura corretta
        if (response.success && response.data) {
          return response.data;
        }
        // Fallback se la risposta non è come previsto
        return {
          data: [],
          totalCount: 0,
          currentPage: pagedRequest.page || 1,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        };
      }),
      tap(result => {
        this.properties.set(result.data);
        this.totalCount.set(result.totalCount);
        this.propertiesSubject.next(result.data);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        console.error('Errore durante la ricerca delle proprietà:', error);
        this.isLoading.set(false);

        // Aggiorno lo stato con dati vuoti
        this.properties.set([]);
        this.totalCount.set(0);
        this.propertiesSubject.next([]);

        return throwError(() => error);
      })
    );
  }

  getPropertyById(id: string): Observable<PropertyModel | null> {
    this.isLoading.set(true);

    // GET /properties/{id}
    return this.http.get<ApiResponse<PropertyModel>>(`${this.API_URL}/${id}`).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Errore durante il recupero della proprietà');
      }),
      tap(() => this.isLoading.set(false)),
      catchError((error) => {
        console.error(`Errore durante il recupero della proprietà ${id}:`, error);
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  createProperty(propertyData: Partial<PropertyModel>): Observable<PropertyModel> {
    this.isLoading.set(true);

    // POST /properties
    return this.http.post<ApiResponse<PropertyModel>>(`${this.API_URL}`, propertyData).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message);
      }),
      tap(property => {
        this.properties.update(current => [...current, Helper.fromPropertyModelToPropertyCardDto(property)]);
        this.totalCount.update(count => count + 1);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        console.error('Errore durante la creazione della proprietà:', error);
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  updateProperty(id: string, updates: Partial<PropertyModel>): Observable<PropertyModel> {
    this.isLoading.set(true);

    // PUT /properties/{id}
    return this.http.put<ApiResponse<PropertyModel>>(`${this.API_URL}/${id}`, updates).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Errore durante l\'aggiornamento della proprietà');
      }),
      tap(property => {
        this.properties.update(current =>
          current.map(p => p.id === id ? Helper.fromPropertyModelToPropertyCardDto(property) : p)
        );
        this.isLoading.set(false);
      }),
      catchError((error) => {
        console.error(`Errore durante l'aggiornamento della proprietà ${id}:`, error);
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  deleteProperty(id: string): Observable<boolean> {
    this.isLoading.set(true);

    // DELETE /properties/{id}
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`).pipe(
      map(() => true),
      tap(() => {
        this.properties.update(current => current.filter(p => p.id !== id));
        this.totalCount.update(count => count - 1);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        console.error(`Errore durante l'eliminazione della proprietà ${id}:`, error);
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }
}
