import { Component, AfterViewInit, OnDestroy, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PropertyService } from '@core/services/property/property.service';
import { CreatePropertyRequest } from '@core/services/property/dto/CreatePropertyRequest';
import { ImageMetadataDto } from '@core/services/property/dto/ImageMetadataDto';
import { of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';

// Tipizzazione Google Maps
interface GoogleMapsWindow extends Window {
  google: {
    maps: {
      places: {
        Autocomplete: any;
        AutocompleteService: any;
      };
      event: any;
      Geocoder: any;
      Map: any;
      marker: any;
      importLibrary: (library: string) => Promise<any>;
    };
  };
}

declare const google: any;
declare const window: GoogleMapsWindow;

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
  @ViewChild('addressInput', { static: false }) addressInput!: ElementRef<HTMLInputElement>;

  isLoading = signal(false);
  uploadedImages = signal<ImagePreview[]>([]);
  currentLocation = signal<{ lat: number; lng: number } | null>(null);
  geocodingError = signal<string | null>(null);
  addressSelectionError = signal<string | null>(null);
  lastValidAddress = signal<string>(''); // Ultimo indirizzo valido selezionato
  isAddressComplete = signal(false); // True solo se l'indirizzo ha tutti i campi incluso CAP

  private map: any;
  private marker: any;
  private autocomplete: any = null;

  // Step 1: Basic Information
  basicInfoForm: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(10)]],
    description: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(2000)]],
    price: [null, [Validators.required, Validators.min(1)]],
    propertyType: ['', Validators.required],
    listingType: ['', Validators.required]
  });

  // Step 2: Property Details
  detailsForm: FormGroup = this.fb.group({
    rooms: [null, [Validators.required, Validators.min(1)]],
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
    fullAddress: ['', Validators.required],  // Campo per l'autocomplete
    street: [''],  // Popolato automaticamente dall'autocomplete
    city: [''],
    province: [''],
    zipCode: [''],
    country: ['Italia']
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
        order: currentImages.length + index // Order sequenziale
      }));

      // Aggiungi le nuove immagini e riordina tutte
      const allImages = [...currentImages, ...newPreviews];
      allImages.forEach((img, i) => img.order = i);

      this.uploadedImages.set(allImages);
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
    setTimeout(() => {
      this.initMap();
      this.initializeAutocomplete();
    }, 100);
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
      });

      // Listener per click sulla mappa
      this.map.addListener('click', (event: any) => {
        this.onMapClick(event.latLng);
      });

      console.log('Mappa inizializzata correttamente');
    } catch (error) {
      console.error('Errore inizializzazione mappa:', error);
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
        const formattedAddress = result.results[0].formatted_address;

        // Popola il form
        this.addressForm.patchValue({
          fullAddress: formattedAddress,
          street: fullStreet,
          city: city,
          province: province,
          zipCode: zipCode
        });

        // Salva l'ultimo indirizzo valido
        this.lastValidAddress.set(formattedAddress);
        this.addressSelectionError.set(null);

        // Verifica se l'indirizzo è completo (ha CAP)
        if (zipCode && city && fullStreet) {
          this.isAddressComplete.set(true);
          console.log('Reverse geocoding completato - Indirizzo completo:', { street: fullStreet, city, province, zipCode });
        } else {
          this.isAddressComplete.set(false);
          this.addressSelectionError.set('Indirizzo troppo generico. Seleziona un punto preciso sulla mappa.');
          this.snackBar.open('⚠️ Seleziona un punto preciso sulla mappa per ottenere il CAP', 'OK', {
            duration: 5000,
            panelClass: ['warning-snackbar']
          });
          console.log('Reverse geocoding completato - Indirizzo incompleto (manca CAP):', { street: fullStreet, city, province, zipCode });
        }
      } else {
        console.warn('Nessun indirizzo trovato per queste coordinate');
        this.snackBar.open('Impossibile determinare l\'indirizzo da queste coordinate', 'Chiudi', {
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Errore reverse geocoding:', error);
      this.snackBar.open('Errore durante il reverse geocoding', 'Chiudi', {
        duration: 3000
      });
    }
  }

  /**
   * Inizializza Google Places Autocomplete
   */
  private async initializeAutocomplete(): Promise<void> {
    try {
      console.log('[Autocomplete] Inizio inizializzazione...');

      // Verifica che Google Maps sia caricato
      if (!window.google?.maps) {
        console.warn('[Autocomplete] Google Maps non ancora caricato, riprovo...');
        setTimeout(() => this.initializeAutocomplete(), 500);
        return;
      }

      console.log('[Autocomplete] Google Maps caricato');

      // Carica esplicitamente la libreria Places
      if (!window.google.maps.places) {
        console.log('[Autocomplete] Caricamento libreria Places...');
        try {
          await (window.google.maps as any).importLibrary('places');
          console.log('[Autocomplete] Libreria Places caricata con successo');
        } catch (error) {
          console.error('[Autocomplete] Errore caricamento libreria Places:', error);
          throw error;
        }
      } else {
        console.log('[Autocomplete] Libreria Places già caricata');
      }

      const inputElement = this.addressInput.nativeElement;
      console.log('[Autocomplete] Input element trovato:', inputElement);

      // Sopprimi temporaneamente i warning di deprecazione per l'Autocomplete
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        const message = args[0]?.toString() || '';
        if (!message.includes('PlaceAutocompleteElement') &&
            !message.includes('March 1st, 2025')) {
          originalWarn.apply(console, args);
        }
      };

      console.log('[Autocomplete] Creazione istanza Autocomplete...');

      // Crea l'autocomplete per indirizzi completi
      this.autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
        componentRestrictions: { country: 'it' },
        types: ['address'], // Solo indirizzi completi
        fields: ['address_components', 'geometry', 'formatted_address', 'name']
      });

      console.log('[Autocomplete] Istanza creata con successo');

      // Ripristina console.warn
      console.warn = originalWarn;

      // Listener per la selezione di un luogo
      this.autocomplete.addListener('place_changed', () => {
        console.log('[Autocomplete] Place changed event triggered');
        const place = this.autocomplete.getPlace();
        console.log('[Autocomplete] Place object:', place);

        if (!place.geometry) {
          console.log('[Autocomplete] Nessun dettaglio geografico');
          this.addressSelectionError.set('Seleziona un indirizzo valido dall\'elenco');
          this.currentLocation.set(null);
          return;
        }

        // Estrai coordinate
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        // Estrai componenti indirizzo
        let street = '';
        let city = '';
        let province = '';
        let zipCode = '';
        let streetNumber = '';

        place.address_components?.forEach((component: any) => {
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
        });

        // Componi via completa
        const fullStreet = streetNumber ? `${street} ${streetNumber}` : street;

        // Popola il form
        this.addressForm.patchValue({
          fullAddress: place.formatted_address || place.name,
          street: fullStreet,
          city: city,
          province: province,
          zipCode: zipCode
        }, { emitEvent: false });

        // Salva coordinate e indirizzo valido
        this.currentLocation.set({ lat, lng });
        this.lastValidAddress.set(place.formatted_address || place.name || '');

        // Verifica se l'indirizzo è completo (ha CAP, città e via)
        if (zipCode && city && fullStreet) {
          this.isAddressComplete.set(true);
          this.addressSelectionError.set(null);
          console.log('[Autocomplete] Indirizzo completo selezionato:', {
            formatted: place.formatted_address,
            coordinates: { lat, lng },
            components: { street: fullStreet, city, province, zipCode }
          });
        } else {
          // Indirizzo troppo generico (es. solo via senza numero o senza CAP)
          this.isAddressComplete.set(false);
          this.addressSelectionError.set('Indirizzo troppo generico. Seleziona un punto preciso sulla mappa.');
          this.snackBar.open('⚠️ Indirizzo troppo ampio. Seleziona un punto preciso sulla mappa per ottenere il CAP.', 'OK', {
            duration: 6000,
            panelClass: ['warning-snackbar']
          });
          console.log('[Autocomplete] Indirizzo incompleto (manca CAP o dettagli):', {
            formatted: place.formatted_address,
            coordinates: { lat, lng },
            components: { street: fullStreet, city, province, zipCode }
          });
        }

        // Posiziona il marker sulla mappa
        this.placeMarker(lat, lng);
      });

      // Listener per blur: gestisce input manuale e ripristina lo stato coerente
      inputElement.addEventListener('blur', () => {
        const currentValue = this.addressForm.get('fullAddress')?.value || '';
        const lastValid = this.lastValidAddress();

        // CASO 1: Input vuoto - reset completo
        if (currentValue.length === 0) {
          this.currentLocation.set(null);
          this.lastValidAddress.set('');
          this.isAddressComplete.set(false);
          if (this.marker) {
            this.marker.map = null; // Rimuove il marker dalla mappa
            this.marker = null;
          }
          // Reset campi indirizzo
          this.addressForm.patchValue({
            street: '',
            city: '',
            province: '',
            zipCode: ''
          }, { emitEvent: false });
        }
        // CASO 2: Input con valore invalido - ripristina l'ultimo valido
        else if (currentValue !== lastValid) {
          this.addressForm.patchValue({
            fullAddress: lastValid
          }, { emitEvent: false });

          if (lastValid) {
            this.snackBar.open('Devi selezionare un indirizzo dall\'elenco suggerito. Input ripristinato.', 'Chiudi', {
              duration: 4000,
              panelClass: ['warning-snackbar']
            });
          }
        }
      });

      console.log('[Autocomplete] Google Places Autocomplete inizializzato con successo');
    } catch (error) {
      console.error('[Autocomplete] Errore inizializzazione autocomplete:', error);

      if (error instanceof Error) {
        console.error('[Autocomplete] Messaggio errore:', error.message);
        console.error('[Autocomplete] Stack trace:', error.stack);
      }

      this.snackBar.open('Errore durante l\'inizializzazione dell\'autocomplete', 'Chiudi', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
  }

  onSubmit(): void {
    // Verifica che ci sia un marker posizionato (location selezionata)
    if (!this.currentLocation()) {
      this.snackBar.open('Devi selezionare una posizione sulla mappa o dall\'autocomplete', 'Chiudi', {
        duration: 4000,
        panelClass: ['error-snackbar']
      });
      this.addressSelectionError.set('Posizione obbligatoria');
      return;
    }

    if (this.basicInfoForm.valid && this.detailsForm.valid && this.addressForm.valid) {
      this.isLoading.set(true);

      const location = this.currentLocation()!;
      const uploadedImages = this.uploadedImages();

      // Costruisci CreatePropertyRequest secondo l'OpenAPI
      const propertyData: CreatePropertyRequest = {
        title: this.basicInfoForm.value.title,
        description: this.basicInfoForm.value.description,
        price: this.basicInfoForm.value.price,
        propertyType: this.basicInfoForm.value.propertyType,
        listingType: this.basicInfoForm.value.listingType,
        rooms: this.detailsForm.value.rooms,
        bedrooms: this.detailsForm.value.bedrooms,
        bathrooms: this.detailsForm.value.bathrooms,
        area: this.detailsForm.value.area,
        floor: this.detailsForm.value.floor || undefined,
        energyClass: this.detailsForm.value.energyClass || undefined,
        hasElevator: this.detailsForm.value.hasElevator || false,
        hasBalcony: this.detailsForm.value.hasBalcony || false,
        hasGarden: this.detailsForm.value.hasGarden || false,
        hasParking: this.detailsForm.value.hasParking || false,
        features: [],
        address: {
          street: this.addressForm.value.street,
          city: this.addressForm.value.city,
          province: this.addressForm.value.province,
          zipCode: this.addressForm.value.zipCode,
          country: this.addressForm.value.country || 'Italia'
        },
        status: 'pending',
        location: {
          type: 'Point',
          coordinates: [location.lng, location.lat] // [longitude, latitude]
        }
      };

      // Step 1: Crea la proprietà
      this.propertyService.createProperty(propertyData).pipe(
        switchMap(property => {
          console.log('Proprietà creata con successo:', property.id);

          // Step 2: Se ci sono immagini, caricale con metadata
          if (uploadedImages.length > 0) {
            const files = uploadedImages.map(img => img.file);

            // Costruisci metadata per ogni immagine
            const metadata: ImageMetadataDto[] = uploadedImages.map(img => ({
              isPrimary: img.isPrimary,
              order: img.order,
              caption: undefined,
              altText: undefined
            }));

            return this.propertyService.uploadImages(property.id, files, metadata).pipe(
              tap(uploadedImageModels => {
                console.log(`Upload completato: ${uploadedImageModels.length} immagine/i`);
              }),
              catchError(error => {
                console.error('Errore durante l\'upload delle immagini:', error);

                // Mostra dettagli errore se disponibili
                const errorMessage = error?.error?.message || error?.message || 'Errore sconosciuto';
                this.snackBar.open(`Errore upload immagini: ${errorMessage}`, 'Chiudi', {
                  duration: 6000,
                  panelClass: ['error-snackbar']
                });

                // Lancia l'errore per bloccare la pipeline
                throw error;
              }),
              // Step 3: Imposta lo status ad 'active'
              switchMap(() => this.propertyService.updateProperty(property.id, { status: 'active' }).pipe(
                tap(() => {
                  console.log('Status della proprietà aggiornato ad active');
                }),
                catchError(error => {
                  console.error('Errore durante l\'aggiornamento dello status:', error);
                  this.snackBar.open('Proprietà e immagini caricate, ma errore nell\'attivazione', 'Chiudi', {
                    duration: 4000,
                    panelClass: ['warning-snackbar']
                  });
                  // Ritorna la proprietà comunque
                  return of(property);
                }),
                // Ritorna sempre la proprietà originale con id
                switchMap(() => of(property))
              ))
            );
          }

          // Nessuna immagine da caricare, imposta comunque lo status ad 'active'
          return this.propertyService.updateProperty(property.id, { status: 'active' }).pipe(
            tap(() => {
              console.log('Status della proprietà aggiornato ad active (senza immagini)');
            }),
            catchError(error => {
              console.error('Errore durante l\'aggiornamento dello status:', error);
              this.snackBar.open('Proprietà creata, ma errore nell\'attivazione', 'Chiudi', {
                duration: 4000,
                panelClass: ['warning-snackbar']
              });
              return of(property);
            }),
            switchMap(() => of(property))
          );
        })
      ).subscribe({
        next: (property) => {
          this.snackBar.open('Immobile caricato con successo!', 'Chiudi', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.isLoading.set(false);
          // Step 4: Navigate to /properties/{id}
          this.router.navigate(['/properties', property.id]);
        },
        error: (error) => {
          console.error('Errore durante il caricamento:', error);
          this.snackBar.open('Errore durante il caricamento della proprietà', 'Chiudi', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.isLoading.set(false);
        }
      });
    } else {
      this.snackBar.open('Compila tutti i campi obbligatori', 'Chiudi', {
        duration: 3000,
        panelClass: ['error-snackbar']
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
    if (control?.hasError('maxlength')) {
      return `Massimo ${control.getError('maxlength').requiredLength} caratteri`;
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
   * Cleanup degli Object URLs e listeners quando il componente viene distrutto
   */
  ngOnDestroy(): void {
    // Revoca tutti gli Object URLs per liberare memoria
    this.uploadedImages().forEach(image => {
      URL.revokeObjectURL(image.previewUrl);
    });

    // Cleanup listeners autocomplete
    if (this.autocomplete) {
      window.google?.maps?.event?.clearInstanceListeners(this.autocomplete);
    }
  }
}
