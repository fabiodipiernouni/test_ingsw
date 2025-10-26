import { Component, inject, signal, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PropertyService } from '@core/services/property/property.service';
import {PropertyModel} from '@features/properties/models/PropertyModel';
import {Helper} from '@core/services/property/Utils/helper';
import {Address} from '@service-shared/models/Address';

declare const google: any;

/**
 * Interfaccia per la preview delle immagini caricate
 */
interface ImagePreview {
  file: File;              // File originale
  previewUrl: string;      // URL.createObjectURL(file) per visualizzazione
  isPrimary: boolean;      // True se è la foto di copertina
  order: number;           // Ordine di visualizzazione
}

@Component({
  selector: 'app-property-upload',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatStepperModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './property-upload.html',
  styleUrl: './property-upload.scss'
})
export class PropertyUpload implements OnDestroy, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly propertyService = inject(PropertyService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  isLoading = signal(false);
  isGeocoding = signal(false);
  uploadedImages = signal<ImagePreview[]>([]);
  currentLocation = signal<{ lat: number; lng: number } | null>(null);
  geocodingError = signal<string | null>(null);

  private map: any;
  private marker: any;

  // Step 1: Basic Information
  basicInfoForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(10)]],
    description: ['', [Validators.required, Validators.minLength(50)]],
    price: [null, [Validators.required, Validators.min(1)]],
    propertyType: ['', Validators.required],
    listingType: ['', Validators.required]
  });

  // Step 2: Property Details
  detailsForm: FormGroup = this.fb.group({
    bedrooms: [null, [Validators.required, Validators.min(1)]],
    bathrooms: [null, [Validators.required, Validators.min(1)]],
    area: [null, [Validators.required, Validators.min(1)]],
    floor: [''],
    energyClass: [''],
    hasElevator: [false],
    hasBalcony: [false],
    hasGarden: [false],
    hasParking: [false]
  });

  // Step 3: Address
  addressForm: FormGroup = this.fb.group({
    street: ['', Validators.required],
    city: ['', Validators.required],
    province: ['', Validators.required],
    zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
    country: ['Italia', Validators.required]
  });

  propertyTypes = [
    { value: 'apartment', label: 'Appartamento' },
    { value: 'villa', label: 'Villa' },
    { value: 'house', label: 'Casa' },
    { value: 'loft', label: 'Loft' },
    { value: 'office', label: 'Ufficio' }
  ];

  listingTypes = [
    { value: 'sale', label: 'Vendita' },
    { value: 'rent', label: 'Affitto' }
  ];

  energyClasses = ['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const newFiles = Array.from(input.files);
      const currentImages = this.uploadedImages();

      const newPreviews: ImagePreview[] = newFiles.map((file, index) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        isPrimary: currentImages.length === 0 && index === 0, // Prima foto caricata = primary
        order: currentImages.length + index
      }));

      this.uploadedImages.update(current => [...current, ...newPreviews]);
    }
  }

  removeImage(index: number): void {
    const images = this.uploadedImages();
    const imageToRemove = images[index];

    // Revoca l'Object URL per liberare memoria
    URL.revokeObjectURL(imageToRemove.previewUrl);

    const remainingImages = images.filter((_, i) => i !== index);

    // Se rimuovo la foto primary e ce ne sono altre, imposta la prima come primary
    if (imageToRemove.isPrimary && remainingImages.length > 0) {
      remainingImages[0].isPrimary = true;
    }

    // Riordina
    remainingImages.forEach((img, i) => img.order = i);

    this.uploadedImages.set(remainingImages);
  }

  /**
   * Imposta una foto come principale (copertina)
   */
  setPrimaryImage(index: number): void {
    this.uploadedImages.update(images =>
      images.map((img, i) => ({
        ...img,
        isPrimary: i === index
      }))
    );
  }

  /**
   * Inizializza la mappa Google Maps dopo che la view è pronta
   */
  ngAfterViewInit(): void {
    // Aspetta un tick per assicurarsi che il DOM sia completamente renderizzato
    setTimeout(() => this.initMap(), 100);
  }

  /**
   * Inizializza Google Maps con centro su Italia
   */
  private async initMap(): Promise<void> {
    if (!this.mapContainer?.nativeElement) {
      console.error('Map container non trovato');
      return;
    }

    try {
      // Carica le librerie necessarie di Google Maps
      if (!google?.maps?.Map) {
        await google.maps.importLibrary('maps');
      }

      if (!google?.maps?.Geocoder) {
        await google.maps.importLibrary('geocoding');
      }

      // Carica la libreria marker per AdvancedMarkerElement
      if (!google?.maps?.marker) {
        await google.maps.importLibrary('marker');
      }

      const italyCenter = { lat: 41.9028, lng: 12.4964 }; // Roma

      this.map = new google.maps.Map(this.mapContainer.nativeElement, {
        center: italyCenter,
        zoom: 6,
        mapId: '7da3bb3ee01b95aec6b80944', // Map ID configurato su Google Cloud Platform
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true
        // Nota: styles non è compatibile con mapId
        // Gli stili vanno configurati tramite Google Cloud Console
      });

      // Listener per click sulla mappa
      this.map.addListener('click', (event: any) => {
        this.onMapClick(event.latLng);
      });

      console.log('✅ Mappa inizializzata correttamente');
    } catch (error) {
      console.error('❌ Errore inizializzazione mappa:', error);
      this.snackBar.open('Errore durante il caricamento della mappa', 'Chiudi', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
  }

  /**
   * Gestisce il click sulla mappa: posiziona marker e fa reverse geocoding
   */
  private async onMapClick(latLng: any): Promise<void> {
    const lat = latLng.lat();
    const lng = latLng.lng();

    // Posiziona o sposta il marker
    this.placeMarker(lat, lng);

    // Salva coordinate
    this.currentLocation.set({ lat, lng });
    this.geocodingError.set(null);

    // Reverse geocoding per ottenere l'indirizzo
    await this.reverseGeocode(lat, lng);
  }

  /**
   * Posiziona il marker sulla mappa
   */
  private placeMarker(lat: number, lng: number): void {
    const position = { lat, lng };

    if (this.marker) {
      // Sposta il marker esistente
      this.marker.position = position;
    } else {
      // Crea elemento HTML personalizzato per il marker (casetta rossa)
      const markerContent = this.createMarkerElement();

      // Crea nuovo marker usando AdvancedMarkerElement
      this.marker = new google.maps.marker.AdvancedMarkerElement({
        position,
        map: this.map,
        title: 'Posizione Immobile',
        content: markerContent,
        gmpDraggable: true
      });

      // Listener per drag del marker
      this.marker.addListener('dragend', (event: any) => {
        const newLat = event.latLng.lat();
        const newLng = event.latLng.lng();
        this.currentLocation.set({ lat: newLat, lng: newLng });
        this.reverseGeocode(newLat, newLng);
      });
    }

    // Centra la mappa sul marker
    this.map.panTo(position);
    this.map.setZoom(15);
  }

  /**
   * Crea l'elemento HTML personalizzato per il marker (icona casetta)
   */
  private createMarkerElement(): HTMLElement {
    const markerDiv = document.createElement('div');
    markerDiv.style.width = '48px';
    markerDiv.style.height = '48px';
    markerDiv.style.position = 'relative';
    markerDiv.style.cursor = 'pointer';

    // Crea l'SVG della casetta
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '48');
    svg.setAttribute('height', '48');
    svg.style.filter = 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))';

    // Path della casetta (icona home)
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z');
    path.setAttribute('fill', '#E91E63'); // Rosa/Rosso per indicare la proprietà
    path.setAttribute('stroke', '#FFFFFF');
    path.setAttribute('stroke-width', '1.5');

    svg.appendChild(path);
    markerDiv.appendChild(svg);

    return markerDiv;
  }

  /**
   * Reverse geocoding: da coordinate a indirizzo
   */
  private async reverseGeocode(lat: number, lng: number): Promise<void> {
    try {
      // Assicurati che il Geocoder sia caricato
      if (!google?.maps?.Geocoder) {
        await google.maps.importLibrary('geocoding');
      }

      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ location: { lat, lng } });

      if (result.results && result.results.length > 0) {
        const addressComponents = result.results[0].address_components;

        // Estrai componenti indirizzo
        let street = '';
        let city = '';
        let province = '';
        let zipCode = '';
        let streetNumber = '';

        for (const component of addressComponents) {
          const types = component.types;

          if (types.includes('route')) {
            street = component.long_name;
          }
          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          }
          if (types.includes('locality')) {
            city = component.long_name;
          }
          if (types.includes('administrative_area_level_2')) {
            province = component.short_name;
          }
          if (types.includes('postal_code')) {
            zipCode = component.long_name;
          }
        }

        // Componi via completa
        const fullStreet = streetNumber ? `${street} ${streetNumber}` : street;

        // Popola il form
        this.addressForm.patchValue({
          street: fullStreet,
          city: city,
          province: province,
          zipCode: zipCode
        });

        console.log('✅ Reverse geocoding completato:', { street: fullStreet, city, province, zipCode });
      } else {
        console.warn('⚠️ Nessun indirizzo trovato per queste coordinate');
        this.snackBar.open('Impossibile determinare l\'indirizzo da queste coordinate', 'Chiudi', {
          duration: 3000
        });
      }
    } catch (error) {
      console.error('❌ Errore reverse geocoding:', error);
      this.snackBar.open('Errore durante il reverse geocoding', 'Chiudi', {
        duration: 3000
      });
    }
  }

  /**
   * Geocoding: da indirizzo a coordinate (chiamato dal pulsante)
   */
  async geocodeAddress(): Promise<void> {
    if (!this.addressForm.valid) return;

    this.isGeocoding.set(true);
    this.geocodingError.set(null);

    const address: Address = this.addressForm.value as Address;

    try {
      const coords = await Helper.geocodeByAddress(address);

      if (coords) {
        this.currentLocation.set(coords);
        this.placeMarker(coords.lat, coords.lng);

        // Feedback positivo
        this.snackBar.open('📍 Indirizzo localizzato sulla mappa!', 'Chiudi', {
          duration: 2000,
          panelClass: ['success-snackbar']
        });
      } else {
        // Messaggio di errore con suggerimenti
        const suggestions = this.getSuggestions(address);
        this.geocodingError.set(
          `Impossibile trovare l'indirizzo specificato. ${suggestions}`
        );

        this.snackBar.open('Indirizzo non trovato. Prova a cliccare direttamente sulla mappa.', 'Chiudi', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    } catch (error) {
      console.error('Errore geocoding:', error);
      this.geocodingError.set('Errore durante la localizzazione dell\'indirizzo');
    } finally {
      this.isGeocoding.set(false);
    }
  }

  /**
   * Genera suggerimenti per migliorare il geocoding
   */
  private getSuggestions(address: Address): string {
    const suggestions: string[] = [];

    // Verifica se i campi critici sono compilati
    if (!address.street || address.street.trim().length < 3) {
      suggestions.push('Inserisci una via più specifica');
    }

    if (!address.city || address.city.trim().length < 2) {
      suggestions.push('Verifica il nome della città');
    }

    if (suggestions.length > 0) {
      return 'Suggerimenti: ' + suggestions.join(', ') + '.';
    }

    return 'Prova a cliccare direttamente sulla mappa per posizionare il marker.';
  }

  /**
   * Chiamato quando l'utente compila manualmente i campi
   * Resetta errori di geocoding quando l'utente modifica l'indirizzo
   */
  onAddressChange(): void {
    // Resetta errori e messaggi quando l'utente modifica l'indirizzo
    this.geocodingError.set(null);
  }

  onSubmit(): void {
    if (this.basicInfoForm.valid && this.detailsForm.valid && this.addressForm.valid) {
      this.isLoading.set(true);

      const propertyData: Partial<PropertyModel> = {
        ...this.basicInfoForm.value,
        ...this.detailsForm.value,
        address: this.addressForm.value,
        images: [] // TODO: Handle image upload
      };

      this.propertyService.createProperty(propertyData).subscribe({
        next: (property) => {
          this.snackBar.open('Immobile caricato con successo!', 'Chiudi', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.router.navigate(['/properties', property.id]);
        },
        error: () => {
          this.snackBar.open('Errore durante il caricamento', 'Chiudi', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.isLoading.set(false);
        }
      });
    }
  }

  getErrorMessage(form: FormGroup, field: string): string {
    const control = form.get(field);
    if (control?.hasError('required')) {
      return 'Campo obbligatorio';
    }
    if (control?.hasError('minlength')) {
      return `Minimo ${control.getError('minlength').requiredLength} caratteri`;
    }
    if (control?.hasError('min')) {
      return `Valore minimo: ${control.getError('min').min}`;
    }
    if (control?.hasError('pattern')) {
      return 'Formato non valido';
    }
    return '';
  }

  /**
   * Cleanup degli Object URLs quando il componente viene distrutto
   */
  ngOnDestroy(): void {
    // Revoca tutti gli Object URLs per liberare memoria
    this.uploadedImages().forEach(image => {
      URL.revokeObjectURL(image.previewUrl);
    });
  }
}
