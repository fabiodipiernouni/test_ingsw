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
import { environment } from '@src/environments/environment';

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
  private isOpeningInfoWindow = false; // Flag per ignorare boundsChanged durante apertura InfoWindow

  isLoading = signal<boolean>(false);

  /**
   * Mappa dei livelli di zoom fissi in base al raggio (in km)
   * Ogni entry definisce il raggio massimo per quel livello di zoom
   * NOTA: Zoom minimo consentito è 18 (1km)
   */
  private readonly ZOOM_LEVELS: ReadonlyMap<number, number> = new Map([
    [18, 1],      // 1km - quartiere (ZOOM MINIMO CONSENTITO)
    [17, 2],      // 2km
    [16, 3],      // 3km
    [15, 5],      // 5km - città piccola
    [14, 8],      // 8km
    [13, 10],     // 10km - città media
    [12, 15],     // 15km
    [11, 25],     // 25km - area metropolitana
    [10, 50],     // 50km - provincia
    [9, 75],      // 75km
    [8, 100],     // 100km - regione piccola
    [7, 150],     // 150km
    [6, 200],     // 200km - regione
    [5, 300],     // 300km - più regioni
    [4, 500],     // 500km - mezza Italia
    [3, 1000],    // 1000km - Italia intera
  ]);

  private readonly MIN_ZOOM = 18; // 1km - limite minimo
  private readonly MAX_ZOOM = 3;  // 1000km - limite massimo

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

    // Registra la funzione globale per gestire i click dall'InfoWindow
    this.setupGlobalPropertySelector();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.clearMarkers();
    
    // Pulisci la funzione globale
    (window as any).selectProperty = undefined;
  }

  /**
   * Configura una funzione globale che permette all'HTML dell'InfoWindow
   * di comunicare con il componente Angular
   */
  private setupGlobalPropertySelector(): void {
    (window as any).selectProperty = (propertyId: string) => {
      console.log('🏠 Click su proprietà dalla mappa:', propertyId);
      
      // Trova la proprietà corrispondente
      const property = this.properties().find(p => p.id === propertyId);
      
      if (property) {
        // Emetti l'evento propertySelected
        this.propertySelected.emit(property);
      } else {
        console.error('❌ Proprietà non trovata:', propertyId);
      }
    };
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
      minZoom: this.MAX_ZOOM,  // Zoom minimo (più lontano - 1000km)
      maxZoom: this.MIN_ZOOM,  // Zoom massimo (più vicino - 1km)
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

  /**
   * Calcola il livello di zoom appropriato in base al raggio
   * Usa la mappa ZOOM_LEVELS per trovare lo zoom più adatto
   */
  private calculateInitialZoom(): number {
    const radiusKm = this.radius();
    
    if (!radiusKm)
      return this.getZoomForRadius(environment.geoSearchValues.defaultRadiusKm);
    
    return this.getZoomForRadius(radiusKm);
  }

  /**
   * Calcola il raggio massimo per un dato livello di zoom.
   * Arrotonda lo zoom per assicurarsi che sia sempre un intero nella HashMap.
   */
  private getRadiusForZoom(zoom: number): number {
    const roundedZoom = Math.round(zoom);
    return this.ZOOM_LEVELS.get(roundedZoom) || environment.geoSearchValues.defaultRadiusKm; // Default 100km se non trovato
  }

  /**
   * Calcola lo zoom appropriato per un dato raggio in km.
   * Restituisce il livello di zoom più vicino che può contenere il raggio.
   */
  private getZoomForRadius(radiusKm: number): number {
    for (const [zoom, maxRadius] of this.ZOOM_LEVELS) {
      if (radiusKm <= maxRadius) {
        return zoom;
      }
    }
    return this.MAX_ZOOM; // Se il raggio è troppo grande, usa lo zoom minimo
  }

  private onBoundsChanged(): void {
    // Ignora il cambio di bounds se stiamo aprendo un'InfoWindow
    if (this.isOpeningInfoWindow) {
      console.log('🗺️ Bounds changed ignorato (apertura InfoWindow)');
      return;
    }
    
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
    const currentZoom = this.map.getZoom();
    
    // Ottieni il raggio direttamente dalla HashMap in base allo zoom corrente
    const radiusInKm = this.getRadiusForZoom(currentZoom);

    // if(radiusInKm > environment.geoSearchValues.maxRadiusKm) return; // evita ricerche troppo ampie

    const radiusSearch: RadiusSearch = {
      center: {
        type: 'Point',
        coordinates: [center.lng(), center.lat()]
      },
      radius: radiusInKm
    };

    console.log('📍 Bounds changed - Centro:', center.lat().toFixed(4), center.lng().toFixed(4), 'Zoom:', currentZoom, 'Raggio:', radiusInKm, 'km');

    this.boundsChanged.emit(radiusSearch);
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

    // Listener per la chiusura dell'InfoWindow
    infoWindow.addListener('closeclick', () => {
      this.isOpeningInfoWindow = false;
      console.log('🗺️ InfoWindow chiusa - riabilito boundsChanged e aggiorno ricerca');
      // Emetti subito il boundsChanged per aggiornare la ricerca
      this.emitBoundsChanged();
    });

    marker.addListener('click', () => {
      // Imposta flag per ignorare il boundsChanged durante l'apertura
      this.isOpeningInfoWindow = true;
      
      // Chiudi tutte le altre info windows
      this.markers.forEach(m => {
        if (m.marker.infoWindow) {
          m.marker.infoWindow.close();
        }
      });

      // Apri l'info window di questo marker
      infoWindow.open(this.map, marker);
      
      // Riabilita il boundsChanged dopo un breve delay per permettere l'animazione del pan
      setTimeout(() => {
        this.isOpeningInfoWindow = false;
        console.log('🗺️ Animazione pan completata - boundsChanged riabilitato');
      }, 300);
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
      // Rimosso disableAutoPan: true per permettere il centramento
    });

    // Listener per la chiusura dell'InfoWindow
    infoWindow.addListener('closeclick', () => {
      this.isOpeningInfoWindow = false;
      console.log('🗺️ InfoWindow chiusa - riabilito boundsChanged e aggiorno ricerca');
      // Emetti subito il boundsChanged per aggiornare la ricerca
      this.emitBoundsChanged();
    });

    marker.addListener('click', () => {
      // Imposta flag per ignorare il boundsChanged durante l'apertura
      this.isOpeningInfoWindow = true;
      
      // Chiudi tutte le altre info windows
      this.markers.forEach(m => {
        if (m.marker.infoWindow) {
          m.marker.infoWindow.close();
        }
      });

      // Apri l'info window di questo marker
      infoWindow.open(this.map, marker);
      
      // Riabilita il boundsChanged dopo un breve delay per permettere l'animazione del pan
      setTimeout(() => {
        this.isOpeningInfoWindow = false;
        console.log('🗺️ Animazione pan completata - boundsChanged riabilitato');
      }, 300);
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
      <div style="max-width: 280px; font-family: Roboto, sans-serif;">
        <img src="${imageUrl}"
             alt="${property.title}"
             style="width: 100%; height: 120px; object-fit: cover; border-radius: 6px; margin-bottom: 8px; cursor: pointer;"
             onclick="window.selectProperty('${property.id}')">

        <div style="margin-bottom: 8px;">
          <h3 style="margin: 0 0 2px 0; font-size: 14px; font-weight: 600; color: #1a202c; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${property.title}
          </h3>
          <p style="margin: 0; font-size: 11px; color: #718096;">
            ${property.city}, ${property.province} • ${listingTypeLabel}
          </p>
        </div>

        <div style="background: #f7fafc; padding: 8px; border-radius: 6px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between;">
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 10px; color: #718096; margin-bottom: 2px;">Prezzo</div>
              <div style="font-size: 15px; font-weight: 700; color: #1976d2;">€${price}</div>
            </div>
            <div style="text-align: center; flex: 1; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
              <div style="font-size: 10px; color: #718096; margin-bottom: 2px;">Stanze</div>
              <div style="font-size: 14px; font-weight: 600; color: #2d3748;">${property.rooms || 'N/A'}</div>
            </div>
            <div style="text-align: center; flex: 1;">
              <div style="font-size: 10px; color: #718096; margin-bottom: 2px;">Superficie</div>
              <div style="font-size: 14px; font-weight: 600; color: #2d3748;">${property.area || 'N/A'} m²</div>
            </div>
          </div>
        </div>

        <p style="margin: 0 0 8px 0; font-size: 12px; color: #4a5568; line-height: 1.4; max-height: 50px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
          ${property.description || ''}
        </p>

        <a href="javascript:void(0)"
           onclick="window.selectProperty('${property.id}')"
           style="display: block; text-align: center; background: #1976d2; color: white; padding: 8px 12px; border-radius: 6px; text-decoration: none; font-weight: 500; font-size: 13px; transition: background 0.2s; cursor: pointer;"
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

  public getCurrentRadiusSearch(): RadiusSearch | null {
    if (!this.map) return null;

    const bounds = this.map.getBounds();
    if (!bounds) return null;

    const center = bounds.getCenter();
    const currentZoom = this.map.getZoom();
    
    // Ottieni il raggio direttamente dalla HashMap in base allo zoom corrente
    const radiusInKm = this.getRadiusForZoom(currentZoom);

    return {
      center: {
        type: 'Point',
        coordinates: [center.lng(), center.lat()]
      },
      radius: radiusInKm
    };
  }

}
