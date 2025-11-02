import { Component, OnInit, OnDestroy, inject, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PropertyService } from '@core/services/property/property.service';
import { PropertyModel } from '@features/properties/models/PropertyModel';
import { PropertyImageModel } from '@core/services/property/models/PropertyImageModel';
import { PropertyLocationMap } from './property-location-map/property-location-map';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
    PropertyLocationMap
  ],
  templateUrl: './property-detail.html',
  styleUrl: './property-detail.scss'
})
export class PropertyDetail implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly propertyService = inject(PropertyService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  property = signal<PropertyModel | null>(null);
  isLoading = signal<boolean>(true);
  selectedImageIndex = signal<number>(0);
  error = signal<string | null>(null);

  private filtersParam: string | null = null;

  ngOnInit(): void {
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const propertyId = params['id'];
      if (propertyId) {
        this.loadProperty(propertyId);
      } else {
        this.error.set('ID proprietà non valido');
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void { 
    const hasUrlParams = this.route.snapshot.queryParamMap.keys.length > 0;
      
    if (hasUrlParams) {
      // Leggi i filtri dall'URL
      this.filtersParam = this.route.snapshot.queryParamMap.get('filters');
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true }); // Rimuovi i parametri dall'URL
    }
    
  }

  private async loadProperty(id: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const property = await firstValueFrom(
        this.propertyService.getPropertyById(id)
      );

      if (property) {
        this.property.set(property);
      } else {
        this.error.set('Immobile non trovato');
      }
    } catch (error) {
      console.error('Error loading property:', error);
      this.error.set('Errore durante il caricamento dell\'immobile');
      this.snackBar.open('Impossibile caricare i dettagli dell\'immobile', 'Chiudi', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/search'], { queryParams: { filters: this.filtersParam } });
  }

  selectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  previousImage(): void {
    const images = this.property()?.images || [];
    if (images.length > 0) {
      const currentIndex = this.selectedImageIndex();
      const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
      this.selectedImageIndex.set(newIndex);
    }
  }

  nextImage(): void {
    const images = this.property()?.images || [];
    if (images.length > 0) {
      const currentIndex = this.selectedImageIndex();
      const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
      this.selectedImageIndex.set(newIndex);
    }
  }

  getSelectedImageUrl(): string {
    const images = this.property()?.images || [];
    if (images.length > 0 && images[this.selectedImageIndex()].urls) {
      // Per l'immagine principale nella galleria usiamo 'large'
      return images[this.selectedImageIndex()].urls?.large ||
             images[this.selectedImageIndex()].urls?.medium ||
             images[this.selectedImageIndex()].urls?.original ||
             '/assets/images/no-image.jpg';
    }
    return '/assets/images/no-image.jpg';
  }

  getThumbnailUrl(image: PropertyImageModel): string {
    // Per le thumbnails usiamo 'small'
    return image.urls?.small ||
           image.urls?.medium ||
           image.urls?.original ||
           '/assets/images/no-image.jpg';
  }

  getListingTypeLabel(): string {
    return this.property()?.listingType === 'sale' ? 'Vendita' : 'Affitto';
  }

  getPropertyTypeLabel(): string {
    const types: Record<string, string> = {
      apartment: 'Appartamento',
      villa: 'Villa',
      house: 'Casa',
      loft: 'Loft',
      office: 'Ufficio'
    };
    return types[this.property()?.propertyType || ''] || this.property()?.propertyType || '';
  }

  getEnergyClassColor(): string {
    const colors: Record<string, string> = {
      'A+': '#4caf50',
      'A': '#8bc34a',
      'B': '#cddc39',
      'C': '#ffeb3b',
      'D': '#ffc107',
      'E': '#ff9800',
      'F': '#ff5722',
      'G': '#f44336'
    };
    return colors[this.property()?.energyClass || ''] || '#9e9e9e';
  }

  getFullAddress(): string {
    const address = this.property()?.address;
    if (!address) return 'Indirizzo non disponibile';

    const parts = [
      address.street,
      address.city,
      address.province,
      address.zipCode
    ].filter(Boolean);

    return parts.join(', ');
  }

  contactAgent(): void {
    const agent = this.property()?.agent;
    if (agent) {
      this.snackBar.open(`Contatto agente: ${agent.firstName} ${agent.lastName}`, 'Chiudi', {
        duration: 5000
      });
      // TODO: Implementare sistema di messaggistica o modale contatto
    }
  }

  addToFavorites(): void {
    this.snackBar.open('Immobile aggiunto ai preferiti', 'Chiudi', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
    // TODO: Implementare sistema preferiti
  }

  shareProperty(): void {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.snackBar.open('Link copiato negli appunti', 'Chiudi', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    });
  }

  scheduleViewing(): void {
    this.snackBar.open('Richiesta visita inviata all\'agente', 'Chiudi', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
    // TODO: Implementare sistema prenotazione visite
  }
}
