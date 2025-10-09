import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Property, PropertyStats } from '@features/properties/models/property';
import { SearchFilters, SearchResult } from '@core/models/search.model';
import { environment } from '../../../../environments/environment';
import {ApiResponse} from '@core/services/dto/ApiResponse';

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private readonly http = inject(HttpClient);

  private readonly API_URL = `${environment.apiUrlProperties}/properties`;

  // Reactive state
  private readonly propertiesSubject = new BehaviorSubject<Property[]>([]);
  public properties$ = this.propertiesSubject.asObservable();

  properties = signal<Property[]>([]);
  totalCount = signal<number>(0);
  isLoading = signal<boolean>(false);


  constructor() {

  }

  searchProperties(filters: SearchFilters, page: number = 1, limit: number = 20): Observable<SearchResult> {
    this.isLoading.set(true);

    // Costruisco i parametri query per l'API
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    // Aggiungo i filtri come parametri query se presenti e validi
    if (filters.location && filters.location.trim() !== '') {
      params = params.set('location', filters.location);
    }
    if (filters.propertyType && filters.propertyType.trim() !== '') {
      params = params.set('propertyType', filters.propertyType);
    }
    if (filters.listingType && filters.listingType.trim() !== '') {
      params = params.set('listingType', filters.listingType);
    }
    if (filters.priceMin !== undefined && filters.priceMin !== null && !Number.isNaN(filters.priceMin)) {
      params = params.set('priceMin', filters.priceMin.toString());
    }
    if (filters.priceMax !== undefined && filters.priceMax !== null && !Number.isNaN(filters.priceMax)) {
      params = params.set('priceMax', filters.priceMax.toString());
    }
    if (filters.bedrooms !== undefined && filters.bedrooms !== null && !Number.isNaN(filters.bedrooms)) {
      params = params.set('bedrooms', filters.bedrooms.toString());
    }
    if (filters.bathrooms !== undefined && filters.bathrooms !== null && !Number.isNaN(filters.bathrooms)) {
      params = params.set('bathrooms', filters.bathrooms.toString());
    }
    if (filters.areaMin !== undefined && filters.areaMin !== null && !Number.isNaN(filters.areaMin)) {
      params = params.set('areaMin', filters.areaMin.toString());
    }
    if (filters.areaMax !== undefined && filters.areaMax !== null && !Number.isNaN(filters.areaMax)) {
      params = params.set('areaMax', filters.areaMax.toString());
    }
    if (filters.energyClass && filters.energyClass.trim() !== '') {
      params = params.set('energyClass', filters.energyClass);
    }
    if (filters.hasElevator !== undefined && filters.hasElevator !== null) {
      params = params.set('hasElevator', filters.hasElevator.toString());
    }
    if (filters.hasBalcony !== undefined && filters.hasBalcony !== null) {
      params = params.set('hasBalcony', filters.hasBalcony.toString());
    }
    if (filters.hasGarden !== undefined && filters.hasGarden !== null) {
      params = params.set('hasGarden', filters.hasGarden.toString());
    }
    if (filters.hasParking !== undefined && filters.hasParking !== null) {
      params = params.set('hasParking', filters.hasParking.toString());
    }
    if (filters.radius !== undefined && filters.radius !== null && !Number.isNaN(filters.radius)) {
      params = params.set('radius', filters.radius.toString());
    }
    if (filters.centerLat !== undefined && filters.centerLat !== null && !Number.isNaN(filters.centerLat)) {
      params = params.set('centerLat', filters.centerLat.toString());
    }
    if (filters.centerLng !== undefined && filters.centerLng !== null && !Number.isNaN(filters.centerLng)) {
      params = params.set('centerLng', filters.centerLng.toString());
    }

    // Chiamata HTTP al backend
    return this.http.get<ApiResponse<SearchResult>>(`${this.API_URL}/cards`, { params }).pipe(
      map(response => {
        // Mappo la risposta del backend al formato SearchResult
        const searchResult: SearchResult = {
          properties: response.data?.properties || [],
          totalCount: response.data?.totalCount || 0,
          currentPage: response.data?.currentPage || page,
          totalPages: response.data?.totalPages || Math.ceil((response.data?.totalCount || 0) / limit),
          hasNextPage: response.data?.hasNextPage || false,
          hasPreviousPage: response.data?.hasPreviousPage || false
        };
        return searchResult;
      }),
      tap(result => {
        this.properties.set(result.properties);
        this.totalCount.set(result.totalCount);
        this.propertiesSubject.next(result.properties);
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

  getPropertyById(id: string): Observable<Property | null> {
    this.isLoading.set(true);

    // GET /properties/{id}
    return this.http.get<ApiResponse<Property>>(`${this.API_URL}/${id}`).pipe(
      map(response => response.data || null),
      tap(() => this.isLoading.set(false)),
      catchError((error) => {
        console.error(`Errore durante il recupero della proprietà ${id}:`, error);
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  createProperty(propertyData: Partial<Property>): Observable<Property> {
    this.isLoading.set(true);

    // POST /properties
    return this.http.post<ApiResponse<Property>>(`${this.API_URL}`, propertyData).pipe(
      map(response => response.data!),
      tap(property => {
        this.properties.update(current => [...current, property]);
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

  updateProperty(id: string, updates: Partial<Property>): Observable<Property> {
    this.isLoading.set(true);

    // PUT /properties/{id}
    return this.http.put<ApiResponse<Property>>(`${this.API_URL}/${id}`, updates).pipe(
      map(response => response.data!),
      tap(property => {
        this.properties.update(current =>
          current.map(p => p.id === id ? property : p)
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

  getPropertyStats(): Observable<PropertyStats> {
    this.isLoading.set(true);

    // GET /properties/stats
    return this.http.get<ApiResponse<PropertyStats>>(`${this.API_URL}/stats`).pipe(
      map(response => response.data!),
      tap(() => this.isLoading.set(false)),
      catchError((error) => {
        console.error('Errore durante il recupero delle statistiche:', error);
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  // Metodo per incrementare le visualizzazioni di una proprietà
  incrementPropertyViews(propertyId: string): Observable<void> {
    // POST /properties/{id}/views
    return this.http.post<ApiResponse<void>>(`${this.API_URL}/${propertyId}/views`, {}).pipe(
      map(() => void 0),
      catchError((error) => {
        console.error(`Errore durante l'incremento delle visualizzazioni per la proprietà ${propertyId}:`, error);
        return throwError(() => error);
      })
    );
  }

  // Metodo per ottenere le proprietà di un agente specifico
  getPropertiesByAgent(agentId: string, page: number = 1, limit: number = 20): Observable<SearchResult> {
    this.isLoading.set(true);

    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    // GET /properties/agent/{agentId}
    return this.http.get<ApiResponse<SearchResult>>(`${this.API_URL}/agent/${agentId}`, { params }).pipe(
      map(response => response.data!),
      tap(result => {
        this.properties.set(result.properties);
        this.totalCount.set(result.totalCount);
        this.propertiesSubject.next(result.properties);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        console.error(`Errore durante il recupero delle proprietà dell'agente ${agentId}:`, error);
        this.isLoading.set(false);
        return throwError(() => error);
      })
    );
  }

  // Metodo per attivare/disattivare una proprietà
  togglePropertyStatus(propertyId: string, isActive: boolean): Observable<Property> {
    // PATCH /properties/{id}/status
    return this.http.patch<ApiResponse<Property>>(`${this.API_URL}/${propertyId}/status`, { isActive }).pipe(
      map(response => response.data!),
      tap(property => {
        this.properties.update(current =>
          current.map(p => p.id === propertyId ? property : p)
        );
      }),
      catchError((error) => {
        console.error(`Errore durante la modifica dello stato della proprietà ${propertyId}:`, error);
        return throwError(() => error);
      })
    );
  }
}
