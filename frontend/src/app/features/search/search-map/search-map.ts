import {
  Component,
  input,
  output,
  OnDestroy,
  AfterViewInit,
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
export class SearchMap implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  // Input signals - la mappa riceve sempre centro e proprietà dal parent
  properties = input.required<GeoPropertyCardDto[]>();
  center = input.required<{ lat: number; lng: number }>();
  radius = input<number>(); // in kilometers (opzionale)

  // Output signals
  boundsChanged = output<RadiusSearch>();
  propertySelected = output<GeoPropertyCardDto>();

  public map: any; // Pubblica per permettere l'accesso allo stato della mappa
  private markers: MarkerData[] = [];
  private searchDebounceTimer: any;
  private isMapInitialized = false;

  isLoading = signal<boolean>(false);

  constructor() {
    // Effect per sincronizzare il centro della mappa
    effect(() => {
      const mapCenter = this.center();
      if (this.isMapInitialized && this.map && mapCenter) {
        console.log('⚡ Effect centro - aggiorno mappa:', mapCenter);
        this.map.setCenter(mapCenter);
      }
    });

    // Effect per aggiornare markers quando cambiano le properties
    effect(() => {
      const props = this.properties();
      if (this.isMapInitialized && this.map) {
        console.log('⚡ Effect properties - aggiorno markers:', props.length);
        this.updateMarkers();
      }
    });
  }

  ngAfterViewInit(): void {
    // Inizializza la mappa SOLO quando abbiamo il centro
    const mapCenter = this.center();
    if (mapCenter) {
      this.initializeMap();
    } else {
      console.error('❌ Impossibile inizializzare mappa: centro non fornito');
    }
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

    const mapCenter = this.center();
    
    console.log('🗺️ Inizializzazione mappa con centro:', mapCenter);

    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center: mapCenter,
      zoom: this.calculateInitialZoom(),
      mapId: '7da3bb3ee01b95aec6b80944', // Map ID creato nella Google Cloud Console
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: this.getMapStyles()
    });

    this.isMapInitialized = true;

    // Listener per bounds change (auto-search)
    google.maps.event.addListener(this.map, 'bounds_changed', () => {
      this.onBoundsChanged();
    });

    // Aggiungi markers iniziali se ci sono properties
    const initialProperties = this.properties();
    if (initialProperties.length > 0) {
      console.log('🏠 Aggiunta markers iniziali:', initialProperties.length);
      this.updateMarkers();
    }
  }

  private calculateInitialZoom(): number {
    const radiusKm = this.radius();
    if (!radiusKm) return 10; // Default zoom
    
    // Calcola zoom in base al raggio
    if (radiusKm <= 5) return 13;
    if (radiusKm <= 10) return 12;
    if (radiusKm <= 25) return 11;
    if (radiusKm <= 50) return 10;
    if (radiusKm <= 100) return 9;
    if (radiusKm <= 200) return 8;
    return 7;
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
    const props = this.properties();
    console.log('🏠 updateMarkers chiamato - Numero proprietà:', props.length);

    // Rimuovi markers esistenti
    this.clearMarkers();

    // Aggiungi nuovi markers
    props.forEach((property, index) => {
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

    // Fit bounds solo se non è stato specificato un centro specifico
    // e ci sono markers da mostrare
    if (this.markers.length > 0 && this.properties().length > 0) {
      console.log('📐 Markers aggiunti, mantieni il centro corrente');
      // Non facciamo fitBounds per mantenere il centro impostato dal parent
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
   * Metodo pubblico per forzare la ricerca nell'area corrente della mappa
   */
  public searchCurrentArea(): void {
    this.emitBoundsChanged();
  }
}
