import { Component, inject, signal, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PropertyService } from '@core/services/property/property.service';
import { MapStateService } from '@core/services/shared/map-state.service';

import {MatTooltip} from '@angular/material/tooltip';
import {PropertyList} from '@features/properties/property-list/property-list';
import {SearchForm} from '@features/search/search-form/search-form';
import {SearchMap} from '@features/search/search-map/search-map';
import {PropertyCardDto} from '@core/services/property/dto/PropertyCardDto';
import {PagedResult} from '@service-shared/dto/pagedResult';
import {GetPropertiesCardsRequest} from '@core/services/property/dto/GetPropertiesCardsRequest';
import {RadiusSearch} from '@service-shared/dto/RadiusSearch';
import {GetGeoPropertiesCardsRequest} from '@core/services/property/dto/GetGeoPropertiesCardsRequest';
import {GeoPropertyCardDto} from '@core/services/property/dto/GeoPropertyCardDto';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SearchForm,
    PropertyList,
    SearchMap,
    MatTooltip
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss'
})
export class Search implements OnInit, OnDestroy {
  @ViewChild(SearchMap) searchMapComponent?: SearchMap;
  @ViewChild(SearchForm) searchFormComponent?: SearchForm;

  private readonly propertyService = inject(PropertyService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly mapStateService = inject(MapStateService);
  private readonly destroy$ = new Subject<void>();

  searchResult = signal<PagedResult<PropertyCardDto> | null>(null);
  searchGeoResult = signal<GeoPropertyCardDto[]>([]);
  currentFilters = signal<GetPropertiesCardsRequest>({});
  isLoading = signal<boolean>(false);
  emptyResultMessage = signal<string>('');

  // Map state
  showMap = signal<boolean>(false);
  viewMode = signal<'list' | 'map' | 'split'>('list');
  mapCenter = signal<{ lat: number; lng: number } | undefined>(undefined);
  mapRadius = signal<number>(100); // Default 100km
  private enableAutoSearch = true; // Flag per controllare se l'auto-search è abilitato

  // Computed: verifica se è stata effettuata una ricerca
  hasSearched = () => this.searchResult() !== null;

  ngOnInit(): void {
    // Ripristina lo stato della mappa se presente (ritorno da dettaglio)
    this.restoreMapState();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private restoreMapState(): void {
    const savedState = this.mapStateService.getState();
    if (savedState) {
      console.log('🔄 Ripristino stato mappa salvato');

      // Ripristina i filtri e lo stato della vista
      this.currentFilters.set(savedState.filters);
      this.viewMode.set(savedState.viewMode);
      this.showMap.set(savedState.showMap);

      if (savedState.center) {
        this.mapCenter.set(savedState.center);
      }

      // Esegui la ricerca con i filtri salvati
      this.executeSearch(savedState.filters);

      // Centra la mappa sulla posizione salvata
      if (savedState.center && savedState.zoom) {
        setTimeout(() => {
          this.searchMapComponent?.setCenter(
            savedState.center!.lat,
            savedState.center!.lng,
            savedState.zoom
          );
        }, 200);
      }

      // Pulisci lo stato salvato dopo averlo ripristinato
      this.mapStateService.clearState();
    }
  }

  /**
   * Gestisce l'evento searchStarted emesso da search-form (bottone "Cerca").
   * Riceve i filtri e avvia la ricerca NORMALE (solo lista, NO mappa).
   *
   * Nota: anche se ci sono geoFilters (autocomplete selezionato), NON attiva la mappa.
   * La mappa si attiva SOLO con "Cerca in mappa" (onMapSearchClicked).
   */
  async onSearchStarted(searchFormData: GetPropertiesCardsRequest): Promise<void> {
    this.currentFilters.set(searchFormData);

    // NON attivare la mappa qui - la ricerca normale mostra solo la lista
    // (anche se ci sono geoFilters da autocomplete)

    await this.executeSearch(searchFormData);
  }

  /**
   * Gestisce il click su "Cerca in mappa" dal search-form.
   *
   * Logica:
   * 1. Se ci sono geoFilters (autocomplete selezionato) → usa quelle coordinate
   * 2. Altrimenti → richiede la geolocalizzazione dell'utente
   *    - Se accetta: centra la mappa sulla sua posizione con raggio 50km e avvia la ricerca
   *    - Se rifiuta: mostra l'Italia intera senza ricerca automatica (l'utente deve fare zoom)
   */
  async onMapSearchClicked(searchFormData: GetPropertiesCardsRequest): Promise<void> {
    console.log('📥 Ricevuto evento mapSearchClicked in search.ts:', searchFormData);

    this.currentFilters.set(searchFormData);

    // Rileva se siamo su mobile o desktop
    const isMobile = window.innerWidth <= 768;

    // Mobile: solo vista mappa | Desktop: vista split (lista + mappa)
    if (isMobile) {
      this.viewMode.set('map');
      this.showMap.set(true);
    } else {
      this.viewMode.set('split');
      this.showMap.set(true);
    }

    console.log('✅ Vista mappa attivata - viewMode:', this.viewMode(), 'showMap:', this.showMap(), 'isMobile:', isMobile);

    // CASO 1: Se ci sono già geoFilters (autocomplete selezionato), usa quelle coordinate
    if (searchFormData.geoFilters?.radiusSearch) {
      console.log('📍 Uso coordinate da autocomplete:', searchFormData.geoFilters.radiusSearch);

      const center = searchFormData.geoFilters.radiusSearch.center;
      const radius = searchFormData.geoFilters.radiusSearch.radius;

      this.mapCenter.set({
        lat: center.coordinates[1],
        lng: center.coordinates[0]
      });
      this.mapRadius.set(radius);

      // Centra la mappa sulle coordinate dell'autocomplete
      setTimeout(() => {
        this.searchMapComponent?.setCenter(
          center.coordinates[1],
          center.coordinates[0],
          this.getZoomFromRadius(radius)
        );
      }, 100);

      // Esegui la ricerca geografica con le coordinate dell'autocomplete
      const geoRequest: GetGeoPropertiesCardsRequest = {
        filters: searchFormData.filters || {},
        status: searchFormData.status,
        agencyId: searchFormData.agencyId,
        geoFilters: searchFormData.geoFilters,
        sortBy: searchFormData.pagedRequest?.sortBy || 'createdAt',
        sortOrder: searchFormData.pagedRequest?.sortOrder || 'DESC'
      };

      await this.executeGeoSearch(geoRequest);
      return;
    }

    // CASO 2: Nessun autocomplete selezionato → richiedi la geolocalizzazione dell'utente
    if (navigator.geolocation) {
      console.log('📍 Richiesta geolocalizzazione utente...');

      navigator.geolocation.getCurrentPosition(
        // Successo: l'utente ha condiviso la posizione
        async (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const radiusKm = 50; // Raggio di 50km per vedere le case in zona

          console.log('✅ Geolocalizzazione ottenuta:', { lat: userLat, lng: userLng });

          this.mapCenter.set({ lat: userLat, lng: userLng });
          this.mapRadius.set(radiusKm);

          // Centra la mappa sulla posizione dell'utente
          setTimeout(() => {
            this.searchMapComponent?.setCenter(userLat, userLng, this.getZoomFromRadius(radiusKm));
          }, 100);

          // Crea i geoFilters con la posizione dell'utente
          const geoRequest: GetGeoPropertiesCardsRequest = {
            filters: searchFormData.filters || {},
            status: searchFormData.status,
            agencyId: searchFormData.agencyId,
            geoFilters: {
              radiusSearch: {
                center: {
                  type: 'Point',
                  coordinates: [userLng, userLat]
                },
                radius: radiusKm
              }
            },
            sortBy: searchFormData.pagedRequest?.sortBy || 'createdAt',
            sortOrder: searchFormData.pagedRequest?.sortOrder || 'DESC'
          };

          // Esegui SOLO la ricerca geografica con la posizione dell'utente
          await this.executeGeoSearch(geoRequest);
        },
        // Errore: l'utente ha rifiutato o c'è stato un errore
        (error) => {
          console.log('❌ Geolocalizzazione rifiutata o non disponibile:', error.message);

          this.snackBar.open(
            'Mostra l\'Italia intera. Fai zoom sulla mappa per cercare in una zona specifica.',
            'OK',
            { duration: 5000 }
          );

          // DISABILITA l'auto-search - l'utente deve fare zoom manualmente
          this.enableAutoSearch = false;

          // Mostra l'Italia intera senza avviare la ricerca
          const defaultCenter = { lat: 42.5, lng: 12.5 };
          this.mapCenter.set(defaultCenter);

          // Imposta risultati vuoti per mostrare la mappa
          this.searchGeoResult.set([]); // Mappa vuota senza marker
          this.searchResult.set({
            data: [],
            totalCount: 0,
            currentPage: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          });

          setTimeout(() => {
            this.searchMapComponent?.setCenter(defaultCenter.lat, defaultCenter.lng, 6); // Zoom Italia
          }, 100);

          // NON eseguire la ricerca - l'utente deve fare zoom manualmente
          // La ricerca partirà solo quando farà zoom abbastanza (vedi onMapBoundsChanged)
        },
        // Opzioni della richiesta di geolocalizzazione
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      // Browser non supporta la geolocalizzazione
      console.log('❌ Geolocalizzazione non supportata dal browser');

      this.snackBar.open(
        'Il tuo browser non supporta la geolocalizzazione. Mostra l\'Italia intera.',
        'OK',
        { duration: 5000 }
      );

      // DISABILITA l'auto-search - l'utente deve fare zoom manualmente
      this.enableAutoSearch = false;

      const defaultCenter = { lat: 42.5, lng: 12.5 };
      this.mapCenter.set(defaultCenter);

      // Imposta risultati vuoti per mostrare la mappa
      this.searchGeoResult.set([]); // Mappa vuota senza marker
      this.searchResult.set({
        data: [],
        totalCount: 0,
        currentPage: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      });

      setTimeout(() => {
        this.searchMapComponent?.setCenter(defaultCenter.lat, defaultCenter.lng, 6);
      }, 100);
    }
  }

  onLoadMore(): void {
    if (this.searchResult()?.hasNextPage) {
      this.loadAnotherPage((this.currentFilters().pagedRequest?.page || 0) + 1);
    }
  }

  onPropertySelected(property: PropertyCardDto): void {
    this.router.navigate(['/properties', property.id]);
  }

  onGeoPropertySelected(property: GeoPropertyCardDto): void {
    // Salva lo stato della mappa se è attiva
    if (this.showMap()) {
      const mapCenter = this.searchMapComponent?.map?.getCenter();
      const mapZoom = this.searchMapComponent?.map?.getZoom();

      this.mapStateService.saveState({
        center: mapCenter ? { lat: mapCenter.lat(), lng: mapCenter.lng() } : this.mapCenter(),
        zoom: mapZoom,
        viewMode: this.viewMode(),
        showMap: this.showMap(),
        filters: this.currentFilters()
      });
    }

    this.router.navigate(['/properties', property.id]);
  }

  toggleMapView(): void {
    this.showMap.update(current => !current);

    // Cambia viewMode in base allo stato
    if (this.showMap()) {
      this.viewMode.set('split');
    } else {
      this.viewMode.set('list');
    }
  }

  toggleViewMode(mode: 'list' | 'map'): void {
    this.viewMode.set(mode);
  }

  /**
   * Gestisce il cambio di bounds della mappa (auto-search).
   * La ricerca parte solo se il raggio è sotto i 200km e se l'auto-search è abilitato.
   */
  async onMapBoundsChanged(radiusSearch: RadiusSearch): Promise<void> {
    const MAX_SEARCH_RADIUS_KM = 200;

    console.log('🗺️ Bounds cambiati - Raggio attuale:', radiusSearch.radius, 'km', '- Auto-search:', this.enableAutoSearch);

    // Se l'auto-search è disabilitato, riabilita solo quando il raggio scende sotto i 200km
    if (!this.enableAutoSearch) {
      if (radiusSearch.radius <= MAX_SEARCH_RADIUS_KM) {
        console.log('✅ Raggio sotto soglia - riabilito auto-search');
        this.enableAutoSearch = true;
        // Continua con la ricerca
      } else {
        console.log('⏸️ Auto-search disabilitato - in attesa di zoom sufficiente');
        return;
      }
    }

    // Verifica se il raggio è troppo grande
    if (radiusSearch.radius > MAX_SEARCH_RADIUS_KM) {
      console.log(`⚠️ Raggio troppo grande (${radiusSearch.radius}km > ${MAX_SEARCH_RADIUS_KM}km) - ricerca non avviata`);

      // Mostra un messaggio all'utente
      this.snackBar.open(
        `Fai più zoom per cercare immobili (raggio attuale: ${Math.round(radiusSearch.radius)}km)`,
        'OK',
        { duration: 3000 }
      );

      // Non eseguire la ricerca
      return;
    }

    console.log(`✅ Raggio OK (${radiusSearch.radius}km ≤ ${MAX_SEARCH_RADIUS_KM}km) - avvio ricerca`);

    // Aggiorna i filtri correnti con la nuova ricerca geografica
    const updatedFilters: GetGeoPropertiesCardsRequest = {
      filters: this.currentFilters().filters || {},
      status: this.currentFilters().status,
      agencyId: this.currentFilters().agencyId,
      geoFilters: {
        radiusSearch
      },
      sortBy: this.currentFilters().pagedRequest?.sortBy || 'createdAt',
      sortOrder: this.currentFilters().pagedRequest?.sortOrder || 'DESC'
    };

    await this.executeGeoSearch(updatedFilters);
  }

  /**
   * Calcola lo zoom appropriato dal raggio in km
   */
  private getZoomFromRadius(radiusKm: number): number {
    if (radiusKm <= 5) return 13;
    if (radiusKm <= 10) return 12;
    if (radiusKm <= 25) return 11;
    if (radiusKm <= 50) return 10;
    if (radiusKm <= 100) return 9;
    if (radiusKm <= 200) return 8;
    return 7;
  }

  saveCurrentSearch(): void {
    const filters = this.currentFilters();
    if (Object.keys(filters).length === 0) {
      this.snackBar.open('Effettua prima una ricerca per salvarla', 'Chiudi', {
        duration: 3000
      });
      return;
    }

    // Generate a name for the search based on filters
    const searchName = this.generateSearchName();

    // TODO: Implement save search functionality
    this.snackBar.open(`Ricerca "${searchName}" salvata con successo`, 'Chiudi', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  clearSearch(): void {
    // Reset filtri e risultati
    this.currentFilters.set({});
    this.searchResult.set(null);
    this.searchGeoResult.set([]);

    // Nascondi la mappa e resetta la vista
    this.showMap.set(false);
    this.viewMode.set('list');

    // Reset del form di ricerca (incluso autocomplete)
    this.searchFormComponent?.resetFilters();

    // Riabilita l'auto-search per future ricerche in mappa
    this.enableAutoSearch = true;

    console.log('🧹 Ricerca pulita - stato resettato');
  }

  private async executeGeoSearch(searchFormData: GetGeoPropertiesCardsRequest): Promise<void> {
    this.isLoading.set(true);

    try {
      const result = await firstValueFrom(
        this.propertyService.geoSearchProperties(searchFormData)
      );

      this.searchGeoResult.set(result);
      if (result.length > 0) {
        const propertyCards = await firstValueFrom(
          this.propertyService.getPropertyCardsByIds(result.map(p => p.id))
        );

        // devo usare le propertyCards per popolare la lista a sinistra, non paginando
        this.searchResult.set({
          data: propertyCards,
          totalCount: propertyCards.length,
          currentPage: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        });
      } else {
        // Nessun risultato trovato - imposta risultato vuoto
        this.searchResult.set({
          data: [],
          totalCount: 0,
          currentPage: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        });
      }
    }
    catch (error) {
      this.snackBar.open('Errore durante la ricerca geografica. Riprova più tardi.', 'Chiudi', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      console.error('Geo Search error:', error);
    }
    finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Esegue la ricerca utilizzando PropertyService.
   * Gestisce i risultati, incluso il caso di nessun risultato trovato.
   */
  private async executeSearch(searchFormData: GetPropertiesCardsRequest): Promise<void> {
    this.isLoading.set(true);

    try {
      const result = await firstValueFrom(
        this.propertyService.searchProperties(searchFormData)
      );

      this.searchResult.set(result);

      // Gestione caso nessun risultato
      if (result.totalCount === 0) {
        this.emptyResultMessage.set(
          'Peccato! Al momento non ci sono immobili che corrispondono ai tuoi criteri di ricerca. ' +
          'Prova a modificare i filtri o riprova più tardi, aggiungiamo nuovi immobili ogni giorno!'
        );
      }

      // Update map center if location is specified
      //if ( filters.location) {
        // TODO: Geocode location and update map center
      //}
    } catch (error) {
      this.snackBar.open('Errore durante la ricerca. Riprova più tardi.', 'Chiudi', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      console.error('Search error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Carica una pagina specifica di risultati (per paginazione).
   * Aggiunge i nuovi risultati a quelli esistenti.
   */
  private async loadAnotherPage(page: number): Promise<void> {
    this.isLoading.set(true);

    try {

      const currentF = this.currentFilters();

      currentF.pagedRequest!.page = page;

      this.currentFilters.set(currentF);

      const result = await firstValueFrom(
        this.propertyService.searchProperties(this.currentFilters())
      );

      // Append new properties to existing ones
      const currentResult = this.searchResult();
      if (currentResult) {
        this.searchResult.set({
          ...result,
          data: [...currentResult.data, ...result.data]  // Concatena i nuovi dati ai precedenti
        });
      } else {
        this.searchResult.set(result);
      }
    } catch (error) {
      this.snackBar.open('Errore durante il caricamento. Riprova.', 'Chiudi', {
        duration: 3000
      });
      console.error('Load page error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private generateSearchName(): string {
    const parts: string[] = [];

    const filters = this.currentFilters().filters || {};

    if (filters.location) parts.push(filters.location);
    if (filters.propertyType) parts.push(this.getPropertyTypeLabel(filters.propertyType));
    if (filters.listingType) parts.push(this.getListingTypeLabel(filters.listingType));
    if (filters.priceMin && filters.priceMax) {
      parts.push(`€${filters.priceMin.toLocaleString()}-${filters.priceMax.toLocaleString()}`);
    }

    return parts.join(' • ');
  }

  private getPropertyTypeLabel(type: string): string {
    const types: Record<string, string> = {
      apartment: 'Appartamento',
      villa: 'Villa',
      house: 'Casa',
      loft: 'Loft',
      office: 'Ufficio'
    };
    return types[type] || type;
  }

  private getListingTypeLabel(type: string): string {
    return type === 'sale' ? 'Vendita' : 'Affitto';
  }
}
