import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  signal,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RadiusSearch } from '@service-shared/dto/RadiusSearch';
import { ListingType } from '@core/services/property/models/types';
import { GeoPropertyCardDto } from '@core/services/property/dto/GeoPropertyCardDto';

declare const google: any;

interface MarkerData {
  marker: any;
  property: GeoPropertyCardDto;
}

@Component({
  selector: 'app-search-map',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './search-map.html',
  styleUrls: ['./search-map.scss']
})
export class SearchMap implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  @Input() properties: GeoPropertyCardDto[] = [];
  @Input() center?: { lat: number; lng: number };
  @Input() radius?: number; // in kilometers

  @Output() boundsChanged = new EventEmitter<RadiusSearch>();
  @Output() propertySelected = new EventEmitter<GeoPropertyCardDto>();

  public map: any; // Pubblica per permettere l'accesso allo stato della mappa
  private markers: MarkerData[] = [];
  private searchDebounceTimer: any;
  private readonly defaultCenter = { lat: 42.5, lng: 12.5 }; // Fallback: Italia intera
  private readonly DEFAULT_ZOOM = 10;

  isLoading = signal<boolean>(false);

  constructor() {
    // Effect per aggiornare markers quando cambiano le properties
    effect(() => {
      if (this.map && this.properties) {
        console.log('⚡ Effect attivato - properties:', this.properties.length);
        this.updateMarkers();
      }
    });
  }

  ngOnInit(): void {
    // Initialization logic
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Rileva quando le properties cambiano dall'esterno
    if (changes['properties'] && this.map) {
      console.log('🔄 ngOnChanges - properties cambiate:', this.properties.length);
      this.updateMarkers();
    }
  }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.clearMarkers();
  }

  private async initializeMap(): Promise<void> {
    if (!this.mapContainer?.nativeElement) {
      console.error('Map container not found');
      return;
    }

    // Carica le librerie necessarie di Google Maps
    if (!google.maps.geometry) {
      try {
        await google.maps.importLibrary('geometry');
      } catch (error) {
        console.error('Errore caricamento libreria geometry:', error);
      }
    }

    // Carica la libreria marker per AdvancedMarkerElement
    if (!google.maps.marker) {
      try {
        await google.maps.importLibrary('marker');
      } catch (error) {
        console.error('Errore caricamento libreria marker:', error);
      }
    }

// Nessuna location selezionata: prova geolocalizzazione o fallback su Italia
    if (!this.center) {
      console.log('Nessuna posizione centrale fornita, tentativo di geolocalizzazione...');
      this.center = await new Promise<{ lat: number; lng: number }>(
        (resolve) => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) =>
              // Successo: centra sulla posizione utente
              resolve({
                "lat": position.coords.latitude,
                "lng": position.coords.longitude
              }),
              (error) => {
                // Errore/negato: mostra Italia intera
                console.log('Geolocalizzazione non disponibile o negata, uso centro di default (Italia) - ', error);
                resolve(this.defaultCenter);
              },
              {timeout: 5000} // Max 5 secondi
            );
          } else {
            // Browser non supporta geolocalizzazione: mostra Italia
            resolve(this.defaultCenter);
          }
        }
      );
    }

    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center: this.center,
      zoom: this.DEFAULT_ZOOM,
      mapId: '7da3bb3ee01b95aec6b80944', // Map ID creato nella Google Cloud Console
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: this.getMapStyles()
    });

    // Listener per bounds change (auto-search)
    google.maps.event.addListener(this.map, 'bounds_changed', () => {
      this.onBoundsChanged();
    });

    // Aggiungi markers iniziali se ci sono properties
    if (this.properties.length > 0) {
      this.updateMarkers();
    }
  }

  private onBoundsChanged(): void {
    // Debounce di 500ms per evitare troppe chiamate durante lo scroll/zoom
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.emitBoundsChanged();
    }, 500);
  }

  private emitBoundsChanged(): void {
    if (!this.map) return;

    const bounds = this.map.getBounds();
    if (!bounds) return;

    const center = bounds.getCenter();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    let radiusInKm: number;

    // Verifica che la libreria geometry sia disponibile
    if (google.maps.geometry?.spherical) {
      // Calcola il raggio come metà della diagonale del bounding box visibile
      // Questo rappresenta meglio l'area effettivamente visualizzata
      const diagonalMeters = google.maps.geometry.spherical.computeDistanceBetween(ne, sw);
      radiusInKm = Math.round((diagonalMeters / 2) / 1000);
    } else {
      // Fallback: calcola usando la formula di Haversine
      const lat1 = ne.lat();
      const lng1 = ne.lng();
      const lat2 = sw.lat();
      const lng2 = sw.lng();

      const diagonal = this.calculateDistance(lat1, lng1, lat2, lng2);
      radiusInKm = Math.round(diagonal / 2);
    }

    if(radiusInKm > 300) return; // evita ricerche troppo ampie

    // Limita solo il minimo a 1km, nessun limite massimo per permettere ricerche su tutta Italia
    const clampedRadius = Math.max(1, radiusInKm);

    const radiusSearch: RadiusSearch = {
      center: {
        type: 'Point',
        coordinates: [center.lng(), center.lat()]
      },
      radius: clampedRadius
    };

    console.log('📍 Bounds changed - Centro:', center.lat().toFixed(4), center.lng().toFixed(4), 'Raggio:', clampedRadius, 'km');

    this.boundsChanged.emit(radiusSearch);
  }

  /**
   * Calcola la distanza tra due punti geografici usando la formula di Haversine
   * @returns distanza in km
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Raggio della Terra in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance);
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private updateMarkers(): void {
    console.log('🏠 updateMarkers chiamato - Numero proprietà:', this.properties.length);

    // Rimuovi markers esistenti
    this.clearMarkers();

    // Aggiungi nuovi markers
    this.properties.forEach((property, index) => {
      console.log(`  Proprietà ${index + 1}:`, {
        id: property.id,
        title: property.title,
        hasLocation: !!property.location,
        location: property.location,
        coordinates: property.location?.coordinates
      });

      if (property.location?.coordinates) {
        // Se ha le coordinate, usa quelle
        this.addMarker(property);
      } else {
        // Fallback: usa geocoding con city + province
        console.warn(`  ⚠️ Proprietà "${property.title}" non ha coordinate - uso geocoding fallback`);
        this.addPropertyMarker(property);
      }
    });

    console.log('✅ Totale markers aggiunti:', this.markers.length);

    // Fit bounds se ci sono markers e non è stato specificato un centro
    if (this.markers.length > 0 && !this.center) {
      console.log('📐 Adattamento bounds della mappa ai markers');
      this.fitBounds();
    }
  }


  /**
   * Aggiunge un marker usando una google.maps.LatLng location
   */
  private addPropertyMarker(property: GeoPropertyCardDto): void {
    if (!this.map) return;

    // Crea l'elemento HTML personalizzato per l'icona
    const markerContent = this.createMarkerElement(property.listingType);

    const marker = new google.maps.marker.AdvancedMarkerElement({
      position: property.location,
      map: this.map,
      title: property.title,
      content: markerContent
    });

    // Info window al click
    const infoWindow = new google.maps.InfoWindow({
      content: this.getInfoWindowContent(property)
    });

    marker.addListener('click', () => {
      // Chiudi tutte le altre info windows
      this.markers.forEach(m => {
        if (m.marker.infoWindow) {
          m.marker.infoWindow.close();
        }
      });

      // Apri l'info window di questo marker
      infoWindow.open(this.map, marker);
    });

    marker.infoWindow = infoWindow;

    this.markers.push({ marker, property });
  }

  private addMarker(property: GeoPropertyCardDto): void {
    if (!this.map || !property.location?.coordinates) return;

    // GeoJSON Point è [lng, lat]
    const coords = property.location.coordinates;
    const position = {
      lat: coords[1],
      lng: coords[0]
    };

    console.log(`    ➕ Creazione marker per "${property.title}" a posizione:`, position);

    // Crea l'elemento HTML personalizzato per l'icona
    const markerContent = this.createMarkerElement(property.listingType);

    const marker = new google.maps.marker.AdvancedMarkerElement({
      position,
      map: this.map,
      title: property.title,
      content: markerContent
    });

    console.log(`    ✅ Marker creato con successo per "${property.title}"`);

    // Info window al click
    const infoWindow = new google.maps.InfoWindow({
      content: this.getInfoWindowContent(property)
    });

    marker.addListener('click', () => {
      // Chiudi tutte le altre info windows
      this.markers.forEach(m => {
        if (m.marker.infoWindow) {
          m.marker.infoWindow.close();
        }
      });

      // Apri l'info window di questo marker
      infoWindow.open(this.map, marker);
    });

    marker.infoWindow = infoWindow;

    this.markers.push({ marker, property });
  }

  private clearMarkers(): void {
    this.markers.forEach(({ marker }) => {
      if (marker.infoWindow) {
        marker.infoWindow.close();
      }
      marker.setMap(null);
    });
    this.markers = [];
  }

  private fitBounds(): void {
    if (!this.map || this.markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    this.markers.forEach(({ marker }) => {
      bounds.extend(marker.getPosition());
    });

    this.map.fitBounds(bounds);
  }

  /**
   * Crea l'elemento HTML personalizzato per il marker (casetta)
   * Usato da AdvancedMarkerElement
   */
  private createMarkerElement(listingType?: ListingType): HTMLElement {
    const type = listingType?.toString().toUpperCase();
    const color = type === 'SALE' ? '#E91E63' : '#2196F3';

    // Crea un div contenitore
    const markerDiv = document.createElement('div');
    markerDiv.style.width = '36px';
    markerDiv.style.height = '36px';
    markerDiv.style.position = 'relative';
    markerDiv.style.cursor = 'pointer';

    // Crea l'SVG della casetta
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '36');
    svg.setAttribute('height', '36');
    svg.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';

    // Path della casetta
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z');
    path.setAttribute('fill', color);
    path.setAttribute('stroke', '#FFFFFF');
    path.setAttribute('stroke-width', '1.5');

    svg.appendChild(path);
    markerDiv.appendChild(svg);

    return markerDiv;
  }

  private getInfoWindowContent(property: GeoPropertyCardDto): string {
    const price = property.price?.toLocaleString('it-IT') || 'N/A';
    const imageUrl = property.primaryImage?.smallUrl || '/assets/placeholder.jpg';
    const type = property.listingType?.toString().toUpperCase();
    const listingTypeLabel = type === 'SALE' ? 'Vendita' : 'Affitto';

    return `
      <div style="max-width: 320px; font-family: Roboto, sans-serif;">
        <img src="${imageUrl}"
             alt="${property.title}"
             style="width: 100%; height: 180px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; cursor: pointer;"
             onclick="window.location.href='/properties/${property.id}'">

        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1a202c;">
            ${property.title}
          </h3>
          <p style="margin: 0; font-size: 12px; color: #718096;">
            ${property.city}, ${property.province} • ${listingTypeLabel}
          </p>
        </div>

        <div style="background: #f7fafc; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 11px; color: #718096; margin-bottom: 2px;">Prezzo</div>
              <div style="font-size: 18px; font-weight: 700; color: #1976d2;">€${price}</div>
            </div>
            <div style="text-align: center; flex: 1; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 11px; color: #718096; margin-bottom: 2px;">Stanze</div>
              <div style="font-size: 16px; font-weight: 600; color: #2d3748;">${property.rooms || 'N/A'}</div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 11px; color: #718096; margin-bottom: 2px;">Superficie</div>
              <div style="font-size: 16px; font-weight: 600; color: #2d3748;">${property.area || 'N/A'} m²</div>
            </div>
          </div>
        </div>

        <p style="margin: 0 0 12px 0; font-size: 13px; color: #4a5568; line-height: 1.5; max-height: 60px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
          ${property.description || ''}
        </p>

        <a href="/properties/${property.id}"
           style="display: block; text-align: center; background: #1976d2; color: white; padding: 10px 16px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 14px; transition: background 0.2s;"
           onmouseover="this.style.background='#1565c0'"
           onmouseout="this.style.background='#1976d2'">
          Vedi Dettagli
        </a>
      </div>
    `;
  }

  private getMapStyles(): any[] {
    // Stile mappa personalizzato (opzionale)
    return [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ];
  }

  /**
   * Metodi pubblici per controllo esterno
   */
  public setCenter(lat: number, lng: number, zoom?: number): void {
    if (this.map) {
      this.map.setCenter({ lat, lng });
      if (zoom) {
        this.map.setZoom(zoom);
      }
    }
  }

  public triggerSearch(): void {
    this.emitBoundsChanged();
  }
}

