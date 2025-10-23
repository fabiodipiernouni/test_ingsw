import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SearchPropertiesFilters } from '@core/services/property/dto/SearchPropertiesFilters';
import { PagedRequest } from '@service-shared/dto/pagedRequest';
import {GetPropertiesCardsRequest} from '@core/services/property/dto/GetPropertiesCardsRequest';
import {GeoSearchPropertiesFilters} from '@core/services/property/dto/GeoSearchPropertiesFilters';
import {environment} from '@src/environments/environment';

// Tipizzazione Google Maps per Autocomplete classico
interface GoogleMapsWindow extends Window {
  google: {
    maps: {
      places: {
        Autocomplete: any;
        AutocompleteService: any;
      };
      event: any;
    };
  };
}

declare const window: GoogleMapsWindow;

interface PlaceDetails {
  city?: string;
  province?: string;
  zipCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  formattedAddress?: string;
}

@Component({
  selector: 'app-search-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatExpansionModule,
    MatSliderModule,
    MatCheckboxModule
  ],
  templateUrl: './search-form.html',
  styleUrls: ['./search-form.scss']
})
export class SearchForm implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('locationInput', { static: false }) locationInput!: ElementRef<HTMLInputElement>;

  searchForm!: FormGroup;
  filtersExpanded = false;
  showMapSearchOption = false;
  formSubmitted = false;
  locationHasFocus = false;
  showLocationError = false;

  // Stato autocomplete
  private selectedPlace: PlaceDetails | null = null;
  private autocomplete: any = null;

  @Output() searchStarted = new EventEmitter<GetPropertiesCardsRequest>();
  @Output() mapSearchClicked = new EventEmitter<GetPropertiesCardsRequest>();

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngAfterViewInit(): void {
    this.initializeAutocomplete();
  }

  ngOnDestroy(): void {
    // Cleanup listeners
    if (this.autocomplete) {
      window.google?.maps?.event?.clearInstanceListeners(this.autocomplete);
    }
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      location: [''],
      propertyType: [''],
      listingType: [''],
      rooms: [null],
      bedrooms: [null],
      bathrooms: [null],
      priceMin: [0],
      priceMax: [1000000],
      hasElevator: [false],
      hasBalcony: [false],
      hasGarden: [false],
      hasParking: [false],
      sortBy: ['createdAt'],
      sortOrder: ['DESC']
    });
  }

  /**
   * Inizializza Google Places Autocomplete (versione classica)
   *
   * NOTA: Utilizziamo l'Autocomplete classico invece di PlaceAutocompleteElement perché:
   * 1. PlaceAutocompleteElement usa Shadow DOM chiuso (non accessibile)
   * 2. Non è compatibile con mat-form-field di Angular Material
   * 3. L'Autocomplete classico è ancora supportato e funzionale
   * 4. Google garantisce 12+ mesi di preavviso prima di deprecarlo
   */
  private async initializeAutocomplete(): Promise<void> {
    try {
      console.log('🔍 [Autocomplete] Inizio inizializzazione...');

      // Verifica che Google Maps sia caricato
      if (!window.google?.maps) {
        console.warn('⚠️ [Autocomplete] Google Maps non ancora caricato, riprovo...');
        setTimeout(() => this.initializeAutocomplete(), 500);
        return;
      }

      console.log('✅ [Autocomplete] Google Maps caricato');

      // IMPORTANTE: Carica esplicitamente la libreria Places
      if (!window.google.maps.places) {
        console.log('📦 [Autocomplete] Caricamento libreria Places...');
        try {
          await (window.google.maps as any).importLibrary('places');
          console.log('✅ [Autocomplete] Libreria Places caricata con successo');
        } catch (error) {
          console.error('❌ [Autocomplete] Errore caricamento libreria Places:', error);
          throw error;
        }
      } else {
        console.log('✅ [Autocomplete] Libreria Places già caricata');
      }

      const inputElement = this.locationInput.nativeElement;
      console.log('✅ [Autocomplete] Input element trovato:', inputElement);

      // Sopprimi temporaneamente i warning di deprecazione per l'Autocomplete
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        const message = args[0]?.toString() || '';
        // Filtra solo il warning specifico di PlaceAutocompleteElement
        if (!message.includes('PlaceAutocompleteElement') &&
            !message.includes('March 1st, 2025')) {
          originalWarn.apply(console, args);
        }
      };

      console.log('🏗️ [Autocomplete] Creazione istanza Autocomplete...');

      // Crea l'autocomplete classico
      this.autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
        componentRestrictions: { country: 'it' },
        types: ['(regions)'], // Solo città, province, CAP
        fields: ['address_components', 'geometry', 'formatted_address', 'name']
      });

      console.log('✅ [Autocomplete] Istanza creata con successo');

      // Ripristina console.warn
      console.warn = originalWarn;

      // Listener per la selezione di un luogo
      this.autocomplete.addListener('place_changed', () => {
        console.log('📍 [Autocomplete] Place changed event triggered');
        const place = this.autocomplete.getPlace();
        console.log('📍 [Autocomplete] Place object:', place);

        if (!place.geometry) {
          console.log('⚠️ [Autocomplete] Nessun dettaglio geografico - ricerca testuale');
          this.selectedPlace = null;
          return;
        }

        // Estrai dettagli
        this.selectedPlace = this.extractPlaceDetailsClassic(place);

        // Aggiorna il form
        this.searchForm.patchValue({
          location: place.formatted_address || place.name
        }, { emitEvent: false });

        console.log('✅ [Autocomplete] Luogo selezionato:', this.selectedPlace);
      });

      // Listener per input manuale (quando l'utente digita ma non seleziona)
      inputElement.addEventListener('input', () => {
        const value = inputElement.value;
        this.searchForm.patchValue({ location: value }, { emitEvent: false });

        // Se l'utente modifica manualmente, reset della selezione place
        this.selectedPlace = null;
      });


      console.log('✅✅ [Autocomplete] Google Places Autocomplete inizializzato con successo');
    } catch (error) {
      console.error('❌ [Autocomplete] Errore inizializzazione autocomplete:', error);

      // Mostra dettagli dell'errore se disponibili
      if (error instanceof Error) {
        console.error('❌ [Autocomplete] Messaggio errore:', error.message);
        console.error('❌ [Autocomplete] Stack trace:', error.stack);
      }
    }
  }

  /**
   * Estrae dati strutturati da un Place di Google (Autocomplete classico)
   */
  private extractPlaceDetailsClassic(place: any): PlaceDetails {
    const details: PlaceDetails = {
      formattedAddress: place.formatted_address || place.name
    };

    // Estrai coordinate
    if (place.geometry?.location) {
      details.coordinates = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };
    }

    // Estrai componenti indirizzo
    place.address_components?.forEach((component: any) => {
      const types = component.types;

      if (types.includes('locality')) {
        details.city = component.long_name;
      } else if (types.includes('administrative_area_level_2')) {
        details.province = component.short_name;
      } else if (types.includes('postal_code')) {
        details.zipCode = component.long_name;
      }
    });

    return details;
  }

  /**
   * Gestisce il submit del form di ricerca NORMALE (bottone "Cerca")
   *
   * Due scenari:
   * 1. Autocomplete selezionato → ricerca geografica (Point + raggio)
   * 2. Testo libero → ricerca testuale (LIKE su city/province/zipCode)
   */
  onSearch(): void {

    const locationValue = this.searchForm.get('location')?.value?.trim();

    if (!locationValue) {
      this.searchForm.get('location')?.markAsTouched();
      this.showLocationError = true;
      this.cdr.detectChanges();
      return;
    }

    this.showLocationError = false;

    // Reset dell'errore se la validazione passa
    this.formSubmitted = false;

    const searchStartedPayload: GetPropertiesCardsRequest = {
      filters: this.buildSearchFilter(),
      // Aggiungi geoFilters SOLO se c'è un place selezionato dall'autocomplete
      geoFilters: this.selectedPlace?.coordinates ? this.buildGeoSearchFilter() : undefined,
      pagedRequest: this.buildPagedRequest()
    }

    console.log('🔍 [Search] Ricerca normale avviata:', {
      hasAutocomplete: !!this.selectedPlace?.coordinates,
      payload: searchStartedPayload
    });

    this.searchStarted.emit(searchStartedPayload);
  }

  private buildGeoSearchFilter(): GeoSearchPropertiesFilters {
    const filter: GeoSearchPropertiesFilters = {};

    if (this.selectedPlace?.coordinates) {
      // Ricerca per raggio
      filter.radiusSearch = {
        center: {
          type: 'Point',
          coordinates: [this.selectedPlace.coordinates.lng, this.selectedPlace.coordinates.lat]
        },
        radius: environment.geoSearchValues.defaultRadiusKm
      };
    }

    return filter;
  }

  /**
   * Costruisce il filtro di ricerca in base a:
   * 1. Se c'è un luogo selezionato da autocomplete → ricerca geospaziale (gestita tramite geoFilters)
   * 2. Altrimenti → ricerca testuale normale (LIKE su city/province/zipCode)
   */
  private buildSearchFilter(): SearchPropertiesFilters {
    const formValue = this.searchForm.value;
    const filter: SearchPropertiesFilters = {};

    // Location: aggiungi solo se NON c'è autocomplete selezionato
    // (se c'è autocomplete, la ricerca geografica viene gestita tramite geoFilters)
    if (formValue.location && !this.selectedPlace?.coordinates) {
      filter.location = formValue.location;
    }

    // Altri filtri (invariati)
    if (formValue.propertyType) {
      filter.propertyType = formValue.propertyType;
    }

    if (formValue.listingType) {
      filter.listingType = formValue.listingType;
    }

    if (formValue.rooms !== null && formValue.rooms !== undefined) {
      filter.rooms = formValue.rooms;
    }

    if (formValue.bedrooms !== null && formValue.bedrooms !== undefined) {
      filter.bedrooms = formValue.bedrooms;
    }

    if (formValue.bathrooms !== null && formValue.bathrooms !== undefined) {
      filter.bathrooms = formValue.bathrooms;
    }

    if (formValue.priceMin > 0) {
      filter.priceMin = formValue.priceMin;
    }

    if (formValue.priceMax < 1000000) {
      filter.priceMax = formValue.priceMax;
    }

    if (formValue.hasElevator) {
      filter.hasElevator = true;
    }

    if (formValue.hasBalcony) {
      filter.hasBalcony = true;
    }

    if (formValue.hasGarden) {
      filter.hasGarden = true;
    }

    if (formValue.hasParking) {
      filter.hasParking = true;
    }

    return filter;
  }

  /**
   * Costruisce l'oggetto PagedRequest per paginazione e ordinamento
   */
  private buildPagedRequest(): PagedRequest {
    const formValue = this.searchForm.value;

    return {
      page: 1, // Sempre pagina 1 quando si fa una nuova ricerca
      limit: 20, // Default
      sortBy: formValue.sortBy || 'createdAt',
      sortOrder: formValue.sortOrder || 'DESC'
    };
  }

  /**
   * Reset del form e dello stato autocomplete
   */
  resetFilters(): void {
    this.selectedPlace = null;

    // Reset input autocomplete
    if (this.locationInput?.nativeElement) {
      this.locationInput.nativeElement.value = '';
    }

    this.searchForm.reset({
      location: '',
      propertyType: '',
      listingType: '',
      rooms: null,
      bedrooms: null,
      bathrooms: null,
      priceMin: 0,
      priceMax: 1000000,
      hasElevator: false,
      hasBalcony: false,
      hasGarden: false,
      hasParking: false,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    });
  }

  priceDisplay(): string {
    const min = this.searchForm.get('priceMin')?.value || 0;
    const max = this.searchForm.get('priceMax')?.value || 1000000;

    const formatPrice = (value: number): string => {
      if (value >= 10000000) {
        return '€10.000.000+';
      }
      return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
      }).format(value);
    };

    return `${formatPrice(min)} - ${formatPrice(max)}`;
  }

  get locationControl() {
    return this.searchForm.get('location');
  }

  /**
   * Gestisce il click sull'opzione "Cerca in mappa"
   */
  onMapSearchClick(): void {
    this.showMapSearchOption = false;

    console.log('🗺️ Click su "Cerca in mappa"');

    // Crea la ricerca con o senza geoFilters (dipende se c'è una location selezionata)
    const mapSearchPayload: GetPropertiesCardsRequest = {
      filters: this.buildSearchFilter(),
      geoFilters: this.selectedPlace?.coordinates ? this.buildGeoSearchFilter() : undefined,
      pagedRequest: this.buildPagedRequest()
    };

    console.log('📤 Emissione evento mapSearchClicked con payload:', mapSearchPayload);
    this.mapSearchClicked.emit(mapSearchPayload);
  }

  /**
   * Gestisce il focus sull'input location
   */
  onLocationInputFocus(): void {
    this.formSubmitted = false;
    this.locationControl?.markAsUntouched();
    this.locationHasFocus = true;
    this.showLocationError = false;
    this.showMapSearchOption = true;
    this.cdr.detectChanges();
  }

  /**
   * Gestisce la perdita di focus dell'input location
   */
  onLocationInputBlur(): void {
    this.locationHasFocus = false;
    // Timeout per permettere il click sull'opzione "Cerca in mappa" prima che venga nascosta
    setTimeout(() => {
      this.showMapSearchOption = false;
      this.cdr.detectChanges();
    }, 200);
  }

  /**
   * Gestisce il cambiamento dell'input location
   */
  onLocationInputChange(): void {
    this.formSubmitted = false;
    this.cdr.detectChanges();
  }
}
