import {
  Component,
  Input,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

declare const google: any;

@Component({
  selector: 'app-property-location-map',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './property-location-map.html',
  styleUrls: ['./property-location-map.scss']
})
export class PropertyLocationMap implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  @Input() latitude!: number;
  @Input() longitude!: number;

  private map: any;
  private marker: any;
  private readonly MAX_ZOOM_OUT = 10; // ~80km di raggio visibile
  private readonly DEFAULT_ZOOM = 16; // Zoom iniziale: raggio ~1km (mostra il quartiere immediato)
  private readonly MIN_ZOOM = 3; // Zoom minimo per evitare zoom out eccessivo

  isLoading = true;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['latitude'] || changes['longitude']) {
      if (this.map && this.latitude && this.longitude) {
        this.updateMapLocation();
      }
    }
  }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    // Cleanup
    if (this.marker) {
      this.marker.setMap(null);
    }
  }

  private async initializeMap(): Promise<void> {
    if (!this.mapContainer?.nativeElement) {
      console.error('Map container not found');
      return;
    }

    if (!this.latitude || !this.longitude) {
      console.error('Latitude and longitude are required');
      this.isLoading = false;
      return;
    }

    try {
      // Carica le librerie necessarie
      if (!google.maps.marker) {
        await google.maps.importLibrary('marker');
      }

      const center = { lat: this.latitude, lng: this.longitude };

      this.map = new google.maps.Map(this.mapContainer.nativeElement, {
        center: center,
        zoom: this.DEFAULT_ZOOM,
        mapId: '7da3bb3ee01b95aec6b80944',
        // Disabilita controlli non necessari
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true, // Abilita il pulsante fullscreen
        zoomControl: true,
        // Limita lo zoom out massimo
        minZoom: this.MIN_ZOOM,
        maxZoom: 20,
        // Disabilita il drag (l'utente non può spostare il centro)
        draggable: false,
        // Disabilita scroll wheel zoom (solo pulsanti +/-)
        scrollwheel: false,
        // Disabilita doppio click zoom
        disableDoubleClickZoom: true,
        styles: this.getMapStyles()
      });

      // Listener per limitare lo zoom out a ~80km
      this.map.addListener('zoom_changed', () => {
        const currentZoom = this.map.getZoom();
        if (currentZoom < this.MAX_ZOOM_OUT) {
          this.map.setZoom(this.MAX_ZOOM_OUT);
        }
      });

      // Crea il marker
      this.createMarker(center);

      this.isLoading = false;
    } catch (error) {
      console.error('Error initializing map:', error);
      this.isLoading = false;
    }
  }

  private createMarker(position: { lat: number; lng: number }): void {
    // Crea un'icona personalizzata a forma di casa (come nella ricerca)
    const markerContent = this.createHouseMarkerElement();

    // Usa AdvancedMarkerElement per marker moderno con icona personalizzata
    this.marker = new google.maps.marker.AdvancedMarkerElement({
      map: this.map,
      position: position,
      title: 'Posizione immobile',
      content: markerContent
    });
  }

  /**
   * Crea l'elemento HTML personalizzato per il marker (casetta)
   * Stesso stile usato nella mappa di ricerca
   */
  private createHouseMarkerElement(): HTMLElement {
    const color = '#E91E63'; // Colore rosa per evidenziare la proprietà

    // Crea un div contenitore
    const markerDiv = document.createElement('div');
    markerDiv.style.width = '40px';
    markerDiv.style.height = '40px';
    markerDiv.style.position = 'relative';

    // Crea l'SVG della casetta
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '40');
    svg.setAttribute('height', '40');
    svg.style.filter = 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))';

    // Path della casetta (icona Material Design "home")
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z');
    path.setAttribute('fill', color);
    path.setAttribute('stroke', '#FFFFFF');
    path.setAttribute('stroke-width', '2');

    svg.appendChild(path);
    markerDiv.appendChild(svg);

    return markerDiv;
  }

  private updateMapLocation(): void {
    const newCenter = { lat: this.latitude, lng: this.longitude };

    if (this.map) {
      this.map.setCenter(newCenter);
    }

    if (this.marker) {
      this.marker.position = newCenter;
    } else {
      this.createMarker(newCenter);
    }
  }

  private getMapStyles(): any[] {
    return [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      }
    ];
  }
}

