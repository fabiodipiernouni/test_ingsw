import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

import { ApiResponse } from '@service-shared/dto/ApiResponse';
import {PagedResult} from '@service-shared/dto/pagedResult';
import {PropertyCardDto} from '@core/services/property/dto/PropertyCardDto';
import {PropertyModel} from '@features/properties/models/PropertyModel';
import {Helper} from '@core/services/property/Utils/helper';
import {environment} from '@src/environments/environment';
import {GetPropertiesCardsRequest} from '@core/services/property/dto/GetPropertiesCardsRequest';
import {GeoPropertyCardDto} from '@core/services/property/dto/GeoPropertyCardDto';
import {GetGeoPropertiesCardsRequest} from '@core/services/property/dto/GetGeoPropertiesCardsRequest';
import {PropertyCard} from '@features/properties/property-card/property-card';

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

  getPropertyCardsByIds(ids: string[], sortBy: string = 'createdAt', sortOrder:string = 'DESC'): Observable<PropertyCardDto[]> {
    this.isLoading.set(true);
    const body = { ids, sortBy, sortOrder };

    return this.http.post<ApiResponse<PropertyCardDto[]>>(`${this.API_URL}/cards/by-ids`, body).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message);
      }),
      tap(() => { this.isLoading.set(false); }),
      catchError((error) => {
        console.error('Errore durante il recupero delle proprietà per ID:', error);
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  geoSearchProperties(req: GetGeoPropertiesCardsRequest): Observable<GeoPropertyCardDto[]> {
    this.isLoading.set(true);

    // POST /properties/geocards
    return this.http.post<ApiResponse<GeoPropertyCardDto[]>>(`${this.API_URL}/geocards`, req).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message);
      }),
      tap(() => {
        this.isLoading.set(false);
      }),
      catchError((error) => {
        console.error('Errore durante la ricerca geografica delle proprietà:', error);
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  searchProperties(req: GetPropertiesCardsRequest): Observable<PagedResult<PropertyCardDto>> {
    this.isLoading.set(true);

    // POST /properties/cards
    return this.http.post<ApiResponse<PagedResult<PropertyCardDto>>>(`${this.API_URL}/cards`, req).pipe(
      map(response => {
        // La response contiene già un PagedResult con la struttura corretta
        if (response.success && response.data) {
          return response.data;
        }

        throw new Error(response.message);
      }),
      tap(response => {
        this.properties.set(response.data);
        this.totalCount.set(response.totalCount);
        this.propertiesSubject.next(response.data);
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
