import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatRippleModule } from '@angular/material/core';
import { Property } from '@core/entities/property.model';

@Component({
  selector: 'app-property-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatRippleModule
  ],
  templateUrl: './property-card.html',
  styleUrl: './property-card.scss'
})
export class PropertyCard {
  @Input() property = signal<Property>({} as Property);
  @Output() propertyClick = new EventEmitter<Property>();
  @Output() favoriteToggle = new EventEmitter<Property>();

  isFavorite = signal(false);
  imageLoaded = signal(false);

  onCardClick(): void {
    this.propertyClick.emit(this.property());
  }

  onFavoriteClick(event: Event): void {
    event.stopPropagation();
    this.isFavorite.update(current => !current);
    this.favoriteToggle.emit(this.property());
  }

  onImageLoad(): void {
    this.imageLoaded.set(true);
  }

  getImageUrl(): string {
    const images = this.property().images;
    return images?.length > 0 ? images[0].url : '/assets/images/no-image.jpg';
  }

  getListingTypeLabel(): string {
    return this.property().listingType === 'sale' ? 'Vendita' : 'Affitto';
  }

  getPropertyTypeLabel(): string {
    const types: Record<string, string> = {
      apartment: 'Appartamento',
      villa: 'Villa',
      house: 'Casa',
      loft: 'Loft',
      office: 'Ufficio'
    };
    return types[this.property().propertyType] || this.property().propertyType;
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
    return colors[this.property().energyClass || ''] || '#9e9e9e';
  }
}
