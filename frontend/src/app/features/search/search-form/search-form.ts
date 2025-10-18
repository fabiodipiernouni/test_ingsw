import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SearchPropertiesFilter } from '@core/services/property/dto/SearchPropertiesFilter';
import { PagedRequest } from '@service-shared/dto/pagedRequest';
import {GetPropertiesCardsRequest} from '@core/services/property/dto/GetPropertiesCardsRequest';

// Tipizzazione Google Maps (versione semplificata che funziona sempre)
interface GoogleMapsWindow extends Window {
  google: {
    maps: {
      importLibrary: (library: string) => Promise<any>;
      places: any;
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

  // Stato autocomplete
  private autocomplete: any = null;
  private selectedPlace: PlaceDetails | null = null;

  @Output() searchStarted = new EventEmitter<GetPropertiesCardsRequest>();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngAfterViewInit(): void {
    this.initializeAutocomplete();
  }

  ngOnDestroy(): void {
    // Cleanup listeners
    if (this.autocomplete && window.google?.maps?.event) {
      window.google.maps.event.clearInstanceListeners(this.autocomplete);
    }
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      location: ['', [Validators.required]],
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
   * Inizializza Google Places Autocomplete sull'input di location
   */
  private async initializeAutocomplete(): Promise<void> {
    try {
      // Verifica che Google Maps sia caricato
      if (!window.google?.maps) {
        console.warn('⚠️ Google Maps non ancora caricato, riprovo...');
        setTimeout(() => this.initializeAutocomplete(), 500);
        return;
      }

      // Carica la libreria Places
      const placesLib = await window.google.maps.importLibrary("places") as any;
      const { Autocomplete } = placesLib;

      // Configura autocomplete - SOLO località generiche
      this.autocomplete = new Autocomplete(this.locationInput.nativeElement, {
        types: ['(regions)'], // Accetta città, province, CAP
        componentRestrictions: { country: 'it' }, // Solo Italia
        fields: ['address_components', 'geometry', 'formatted_address'] // Campi necessari
      });

      // Listener per selezione da autocomplete
      this.autocomplete.addListener('place_changed', () => {
        this.onPlaceSelected();
      });

      console.log('Google Places Autocomplete inizializzato');
    } catch (error) {
      console.error('Errore inizializzazione autocomplete:', error);
      // L'app funziona comunque con ricerca testuale normale
    }
  }

  /**
   * Gestisce la selezione di un luogo dall'autocomplete
   */
  private onPlaceSelected(): void {
    if (!this.autocomplete) return;

    const place = this.autocomplete.getPlace();

    // Se l'utente preme Enter senza selezionare, place.geometry sarà undefined
    if (!place.geometry) {
      console.log('Nessun luogo selezionato, ricerca testuale normale');
      this.selectedPlace = null;
      return;
    }

    // Estrai dettagli strutturati
    this.selectedPlace = this.extractPlaceDetails(place);

    console.log('Luogo selezionato:', this.selectedPlace);
  }

  /**
   * Estrae dati strutturati da un Place di Google
   */
  private extractPlaceDetails(place: any): PlaceDetails {
    const details: PlaceDetails = {
      formattedAddress: place.formatted_address
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
        // Città
        details.city = component.long_name;
      } else if (types.includes('administrative_area_level_2')) {
        // Provincia (es: "NA" o "Napoli")
        details.province = component.short_name;
      } else if (types.includes('postal_code')) {
        // CAP
        details.zipCode = component.long_name;
      }
    });

    return details;
  }

  /**
   * Gestisce il submit del form di ricerca
   */
  onSearch(): void {
    // Valida il form
    if (!this.searchForm.valid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    const filters = this.buildSearchFilter();
    const pagedRequest = this.buildPagedRequest();

    this.searchStarted.emit({ filters, pagedRequest });
  }

  /**
   * Costruisce il filtro di ricerca in base a:
   * 1. Se c'è un luogo selezionato da autocomplete → ricerca geospaziale
   * 2. Altrimenti → ricerca testuale normale (LIKE)
   */
  private buildSearchFilter(): SearchPropertiesFilter {
    const formValue = this.searchForm.value;
    const filter: SearchPropertiesFilter = {};

    // 🎯 GESTIONE LOCATION - Strategia ibrida
    if (this.selectedPlace?.coordinates) {
      // ✅ CASO 1: Luogo selezionato da autocomplete → Ricerca geospaziale
      filter.latitude = this.selectedPlace.coordinates.lat;
      filter.longitude = this.selectedPlace.coordinates.lng;
      filter.radiusKm = 50; // Raggio default, puoi renderlo configurabile

      console.log('🌍 Ricerca geospaziale:', filter.latitude, filter.longitude, `raggio ${filter.radiusKm}km`);
    } else if (formValue.location?.trim()) {
      // ✅ CASO 2: Testo libero → Ricerca testuale (LIKE)
      filter.location = formValue.location.trim();

      console.log('📝 Ricerca testuale:', filter.location);
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
    this.selectedPlace = null; // Reset stato autocomplete

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
}
