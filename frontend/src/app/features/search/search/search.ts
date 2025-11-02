import { Component, inject, signal, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PropertyService } from '@core/services/property/property.service';
import { SearchService } from '@core/services/search/search.service';

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
import { AuthService } from '@src/app/core/services/auth/auth.service';
import { SavedSearchFilters } from '@src/app/core/services/search/dto/SavedSearchFilters';
import { environment } from '@src/environments/environment';

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
export class Search implements AfterViewInit, OnDestroy {
  @ViewChild(SearchMap) searchMapComponent?: SearchMap;
  @ViewChild(SearchForm) searchFormComponent?: SearchForm;

  private readonly propertyService = inject(PropertyService);
  private readonly searchService = inject(SearchService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  searchResult = signal<PagedResult<PropertyCardDto> | null>(null);
  searchGeoResult = signal<GeoPropertyCardDto[]>([]);
  currentFilters = signal<GetPropertiesCardsRequest>({});
  isLoading = signal<boolean>(false);
  emptyResultMessage = signal<string>('');
  currentSavedSearchId = signal<string | null>(null); // ID della ricerca salvata corrente

  isAuthenticated = this.authService.isAuthenticated;

  // Map state - devono sempre essere forniti alla mappa, mai undefined
  showMap = signal<boolean>(false);
  viewMode = signal<'list' | 'map' | 'split'>('list');
  mapCenter = signal<{ lat: number; lng: number }>({ lat: 42.5, lng: 12.5 }); // Default: Italia
  mapRadius = signal<number>(100); // Default 100km
  private enableAutoSearch = true; // Flag per controllare se l'auto-search è abilitato

  // Computed: verifica se è stata effettuata una ricerca
  hasSearched = () => this.searchResult() !== null;

  ngAfterViewInit(): void {
    // Controlla se ci sono parametri URL per eseguire una ricerca automatica
    // Questo ha priorità sul ripristino dello stato della mappa
    const hasUrlParams = this.route.snapshot.queryParamMap.keys.length > 0;
    
    if (hasUrlParams) {
      // Leggi i filtri dall'URL
      const filtersParam = this.route.snapshot.queryParamMap.get('filters');
      // this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true }); // Rimuovi i parametri dall'URL
      
      if (filtersParam) {
        try {
          const filters = JSON.parse(filtersParam) as SavedSearchFilters;

          // Imposta i filtri nel form
          this.searchFormComponent?.setFiltersFromUrl(filters);
         
          const searchFormData: GetPropertiesCardsRequest = {
            filters: filters.filters,
            geoFilters: filters.geoFilters,
            status: filters.status,
            agencyId: filters.agencyId,
            pagedRequest: {
              page: 1,
              limit: 20,
              sortBy: filters.sortBy || 'createdAt',
              sortOrder: filters.sortOrder || 'DESC'
            }
          };
          if (searchFormData.geoFilters) {
            this.onMapSearchClicked(searchFormData);
          } else {
            this.onSearchStarted(searchFormData);
          }

        } catch (error) {
          console.error('Errore:', error);
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Gestisce l'evento searchStarted emesso da search-form (bottone "Cerca").
   * Riceve i filtri e avvia la ricerca NORMALE (solo lista, NO mappa).
   *
   * Nota: anche se ci sono geoFilters (autocomplete selezionato), NON attiva la mappa.
   * La mappa si attiva SOLO con "Cerca in mappa" (onMapSearchClicked).
   * 
   * IMPORTANTE: Se ci sono geoFilters, salva il centro per un eventuale futuro "Mostra mappa"
   */
  async onSearchStarted(searchFormData: GetPropertiesCardsRequest): Promise<void> {
    this.currentFilters.set(searchFormData);
    this.currentSavedSearchId.set(null); // Reset ID ricerca salvata per nuova ricerca

    // Se ci sono geoFilters (autocomplete selezionato), salva il centro per un eventuale "Mostra mappa"
    if (searchFormData.geoFilters?.radiusSearch) {
      const center = searchFormData.geoFilters.radiusSearch.center;
      const radius = searchFormData.geoFilters.radiusSearch.radius;
      
      this.mapCenter.set({
        lat: center.coordinates[1],
        lng: center.coordinates[0]
      });
      this.mapRadius.set(radius);
      
      console.log('📍 Centro mappa salvato da autocomplete per futuro uso:', this.mapCenter());
    }

    // NON attivare la mappa qui - la ricerca normale mostra solo la lista
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
    console.log('🔍 Debug geoFilters:', searchFormData.geoFilters);
    console.log('🔍 Debug radiusSearch:', searchFormData.geoFilters?.radiusSearch);

    this.currentFilters.set(searchFormData);
    this.currentSavedSearchId.set(null); // Reset ID ricerca salvata per nuova ricerca

    // Rileva se siamo su mobile o desktop
    const isMobile = window.innerWidth <= 768;

    // CASO 1: Se ci sono già geoFilters (autocomplete selezionato), usa quelle coordinate
    if (searchFormData.geoFilters?.radiusSearch) {
      console.log('📍 Uso coordinate da autocomplete:', searchFormData.geoFilters.radiusSearch);

      const center = searchFormData.geoFilters.radiusSearch.center;
      const radius = searchFormData.geoFilters.radiusSearch.radius;

      // PRIMA imposta il centro, POI attiva la mappa
      this.mapCenter.set({
        lat: center.coordinates[1],
        lng: center.coordinates[0]
      });
      this.mapRadius.set(radius);

      // Ora attiva la vista mappa
      if (isMobile) {
        this.viewMode.set('map');
        this.showMap.set(true);
      } else {
        this.viewMode.set('split');
        this.showMap.set(true);
      }

      console.log('✅ Vista mappa attivata - viewMode:', this.viewMode(), 'showMap:', this.showMap(), 'isMobile:', isMobile);

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
      console.log('✅ Ricerca geografica completata con coordinate da autocomplete - ESCO dalla funzione');
      return;
    }

    // CASO 2: Nessun autocomplete selezionato → richiedi la geolocalizzazione dell'utente
    console.log('⚠️ Nessun geoFilters.radiusSearch trovato - procedo con geolocalizzazione utente');
    if (navigator.geolocation) {
      console.log('📍 Richiesta geolocalizzazione utente...');

      navigator.geolocation.getCurrentPosition(
        // Successo: l'utente ha condiviso la posizione
        async (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const radiusKm = 50; // Raggio di 50km per vedere le case in zona

          console.log('✅ Geolocalizzazione ottenuta:', { lat: userLat, lng: userLng });

          // PRIMA imposta il centro, POI attiva la mappa
          this.mapCenter.set({ lat: userLat, lng: userLng });
          this.mapRadius.set(radiusKm);

          // Ora attiva la vista mappa
          if (isMobile) {
            this.viewMode.set('map');
            this.showMap.set(true);
          } else {
            this.viewMode.set('split');
            this.showMap.set(true);
          }

          console.log('✅ Vista mappa attivata con geolocalizzazione');

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

          // PRIMA imposta il centro (Italia intera), POI attiva la mappa
          const defaultCenter = { lat: 42.5, lng: 12.5 };
          this.mapCenter.set(defaultCenter);
          this.mapRadius.set(300); // Raggio grande per l'Italia intera

          // Ora attiva la vista mappa
          if (isMobile) {
            this.viewMode.set('map');
            this.showMap.set(true);
          } else {
            this.viewMode.set('split');
            this.showMap.set(true);
          }

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

      // PRIMA imposta il centro (Italia intera), POI attiva la mappa
      const defaultCenter = { lat: 42.5, lng: 12.5 };
      this.mapCenter.set(defaultCenter);
      this.mapRadius.set(300); // Raggio grande per l'Italia intera

      // Ora attiva la vista mappa
      if (isMobile) {
        this.viewMode.set('map');
        this.showMap.set(true);
      } else {
        this.viewMode.set('split');
        this.showMap.set(true);
      }

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
    }
  }

  onLoadMore(): void {
    if (this.searchResult()?.hasNextPage) {
      this.loadAnotherPage((this.currentFilters().pagedRequest?.page || 0) + 1);
    }
  }

  onPropertySelected(property: PropertyCardDto): void {
    const savedFilters = this.prepareFiltersForSaving();
    this.router.navigate(['/properties', property.id], {
      queryParams: { filters: JSON.stringify(savedFilters) }
    });
  }

  onGeoPropertySelected(property: GeoPropertyCardDto): void {
    const savedFilters = this.prepareFiltersForSaving();
    this.router.navigate(['/properties', property.id], {
      queryParams: { filters: JSON.stringify(savedFilters) }
    });
  }

  async toggleMapView(): Promise<void> {
    const willShowMap = !this.showMap();
    
    // Se sto per MOSTRARE la mappa e NON ci sono geoFilters, richiedi geolocalizzazione
    if (willShowMap && !this.currentFilters().geoFilters?.radiusSearch) {
      console.log('📍 Mostra mappa da ricerca normale - richiedo geolocalizzazione');
      
      // Prepara i filtri attuali per la ricerca geografica
      const searchFormData: GetPropertiesCardsRequest = {
        filters: this.currentFilters().filters || {},
        status: this.currentFilters().status,
        agencyId: this.currentFilters().agencyId,
        pagedRequest: this.currentFilters().pagedRequest
      };
      
      // Usa la logica di onMapSearchClicked per gestire geolocalizzazione
      await this.onMapSearchClicked(searchFormData);
      return; // onMapSearchClicked gestirà showMap e viewMode
    }
    
    // Altrimenti, semplice toggle della mappa (i geoFilters esistono già)
    this.showMap.set(willShowMap);

    // Cambia viewMode in base allo stato
    if (willShowMap) {
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
   * La ricerca parte solo se il raggio è sotto i MAX_SEARCH_RADIUS_KM e se l'auto-search è abilitato.
   */
  async onMapBoundsChanged(radiusSearch: RadiusSearch): Promise<void> {
    this.currentSavedSearchId.set(null); // Reset ID ricerca salvata per nuova ricerca

    const MAX_SEARCH_RADIUS_KM = environment.geoSearchValues.maxRadiusKm;

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

    console.log(`✅ Raggio OK (${radiusSearch.radius}km < ${MAX_SEARCH_RADIUS_KM}km) - avvio ricerca`);

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

  saveCurrentSearch(): void {
    const currentFilters = this.currentFilters();
    
    if (!currentFilters || Object.keys(currentFilters).length === 0) {
      this.snackBar.open('Effettua prima una ricerca per salvarla', 'Chiudi', {
        duration: 3000
      });
      return;
    }

    // Genera il nome della ricerca (include dettagli location e raggio dalla mappa)
    const searchName = this.generateSearchName();

    const savedFilters = this.prepareFiltersForSaving();

    // Prepara i dati per il salvataggio
    const searchData = {
      name: searchName,
      filters: savedFilters
    };

    this.searchService.createSavedSearch(searchData).subscribe({
      next: (savedSearch) => {
        this.currentSavedSearchId.set(savedSearch.id); // Salva l'ID
        this.snackBar.open(
          `Ricerca "${savedSearch.name}" salvata con successo!`,
          'Chiudi',
          { duration: 3000, panelClass: ['success-snackbar'] }
        );
      },
      error: (error) => {
        console.error('Errore nel salvataggio della ricerca:', error);
        this.snackBar.open(
          'Errore nel salvataggio della ricerca. Riprova più tardi.',
          'Chiudi',
          { duration: 3000, panelClass: ['error-snackbar'] }
        );
      }
    });
  }

  deleteSavedSearch(): void {
    const searchId = this.currentSavedSearchId();
    
    if (!searchId) {
      return;
    }

    this.searchService.deleteSavedSearch(searchId).subscribe({
      next: () => {
        this.currentSavedSearchId.set(null); // Reset l'ID
        this.snackBar.open(
          'Ricerca salvata eliminata con successo',
          'Chiudi',
          { duration: 3000 }
        );
      },
      error: (error) => {
        console.error('Errore nell\'eliminazione della ricerca:', error);
        this.snackBar.open(
          'Errore nell\'eliminazione della ricerca salvata',
          'Chiudi',
          { duration: 3000, panelClass: ['error-snackbar'] }
        );
      }
    });
  }

  clearSearch(): void {
    // Reset filtri e risultati
    this.currentFilters.set({});
    this.searchResult.set(null);
    this.searchGeoResult.set([]);
    this.currentSavedSearchId.set(null); // Reset anche l'ID della ricerca salvata

    // Nascondi la mappa e resetta la vista
    this.showMap.set(false);
    this.viewMode.set('list');

    // Reset del form di ricerca (incluso autocomplete)
    this.searchFormComponent?.resetFilters();

    // Riabilita l'auto-search per future ricerche in mappa
    this.enableAutoSearch = true;

    console.log('🧹 Ricerca pulita - stato resettato');
  }

  /**
   * Prepara i filtri correnti per il salvataggio o il passaggio via URL.
   * Se la mappa è visibile, usa il raggio corrente dalla mappa invece di quello nei filtri.
   * Questo garantisce che venga salvato esattamente quello che l'utente vede.
   */
  private prepareFiltersForSaving(): SavedSearchFilters {
    const currentFilters = this.currentFilters();
    
    // Se la mappa è visibile, usa il raggio corrente dalla mappa
    let geoFilters = currentFilters.geoFilters;
    if (this.showMap() && this.searchMapComponent) {
      const currentMapRadius = this.searchMapComponent.getCurrentRadiusSearch();
      if (currentMapRadius) {
        console.log('💾 Preparazione filtri con raggio dalla mappa:', currentMapRadius.radius, 'km');
        geoFilters = { radiusSearch: currentMapRadius };
      }
    }

    return {
      filters: currentFilters.filters,
      geoFilters: geoFilters,
      status: currentFilters.status,
      agencyId: currentFilters.agencyId,
      sortBy: currentFilters.pagedRequest?.sortBy,
      sortOrder: currentFilters.pagedRequest?.sortOrder
    };
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

  /**
   * Genera un nome descrittivo per la ricerca salvata.
   * Usa il raggio effettivo dalla mappa se disponibile, e include tutti i filtri impostati.
   */
  private generateSearchName(): string {
    const currentFilters = this.currentFilters();
    const filters = currentFilters?.filters || {};
    const parts: string[] = [];

    // Property type
    if (filters.propertyType) {
      parts.push(this.getPropertyTypeLabel(filters.propertyType));
    }

    // Listing type
    if (filters.listingType) {
      parts.push(this.getListingTypeLabel(filters.listingType));
    }

    // Location - USA IL NOME DELL'AUTOCOMPLETE SE DISPONIBILE
    const selectedPlace = this.searchFormComponent?.selectedPlaceDetails;
    if (selectedPlace?.formattedAddress) {
      if (parts.length > 0) {
        parts.push('a');
      }
      parts.push(selectedPlace.formattedAddress);

      // Aggiungi il raggio EFFETTIVO dalla mappa se disponibile
      if (this.showMap() && this.searchMapComponent) {
        const currentMapRadius = this.searchMapComponent.getCurrentRadiusSearch();
        if (currentMapRadius) {
          parts.push(`(raggio ${currentMapRadius.radius}km)`);
        }
      } else if (currentFilters?.geoFilters?.radiusSearch) {
        // Fallback: usa il raggio dai filtri se la mappa non è attiva
        parts.push(`(raggio ${currentFilters.geoFilters.radiusSearch.radius}km)`);
      }
    } else if (filters.location) {
      // Fallback: usa location testuale se non c'è autocomplete
      if (parts.length > 0) {
        parts.push('a');
      }
      parts.push(filters.location);

      // Aggiungi il raggio EFFETTIVO dalla mappa se disponibile
      if (this.showMap() && this.searchMapComponent) {
        const currentMapRadius = this.searchMapComponent.getCurrentRadiusSearch();
        if (currentMapRadius) {
          parts.push(`(raggio ${currentMapRadius.radius}km)`);
        }
      } else if (currentFilters?.geoFilters?.radiusSearch) {
        // Fallback: usa il raggio dai filtri se la mappa non è attiva
        parts.push(`(raggio ${currentFilters.geoFilters.radiusSearch.radius}km)`);
      }
    }

    // Price range
    if ((filters.priceMin && filters.priceMin > 0) || (filters.priceMax && filters.priceMax < 1000000)) {
      if (filters.priceMin && filters.priceMin > 0 && filters.priceMax && filters.priceMax < 1000000) {
        parts.push(`€${filters.priceMin.toLocaleString('it-IT')}-${filters.priceMax.toLocaleString('it-IT')}`);
      } else if (filters.priceMin && filters.priceMin > 0) {
        parts.push(`da €${filters.priceMin.toLocaleString('it-IT')}`);
      } else if (filters.priceMax && filters.priceMax < 1000000) {
        parts.push(`fino a €${filters.priceMax.toLocaleString('it-IT')}`);
      }
    }

    // Rooms/Bedrooms
    if (filters.bedrooms) {
      parts.push(`${filters.bedrooms}+ camere`);
    }
    if (filters.rooms) {
      parts.push(`${filters.rooms}+ locali`);
    }

    // Bathrooms
    if (filters.bathrooms) {
      parts.push(`${filters.bathrooms}+ bagni`);
    }

    // Amenities
    const amenities: string[] = [];
    if (filters.hasElevator) amenities.push('ascensore');
    if (filters.hasBalcony) amenities.push('balcone');
    if (filters.hasGarden) amenities.push('giardino');
    if (filters.hasParking) amenities.push('parcheggio');
    if (amenities.length > 0) {
      parts.push(`con ${amenities.join(', ')}`);
    }

    // If no specific filters, generate a generic name with timestamp
    if (parts.length === 0) {
      const date = new Date();
      return `Ricerca del ${date.toLocaleDateString('it-IT')} ${date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    }

    const name = parts.join(' ').trim();
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : name;
  }

  private getPropertyTypeLabel(type: string): string {
    const types: Record<string, string> = {
      APARTMENT: 'Appartamento',
      HOUSE: 'Casa',
      VILLA: 'Villa',
      OFFICE: 'Ufficio',
      COMMERCIAL: 'Commerciale',
      GARAGE: 'Garage',
      LAND: 'Terreno',
      apartment: 'Appartamento',
      villa: 'Villa',
      house: 'Casa',
      loft: 'Loft',
      office: 'Ufficio'
    };
    return types[type] || type;
  }

  private getListingTypeLabel(type: string): string {
    const listingMap: Record<string, string> = {
      SALE: 'in vendita',
      RENT: 'in affitto',
      sale: 'in vendita',
      rent: 'in affitto'
    };
    return listingMap[type] || type;
  }
}
