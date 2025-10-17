import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatRippleModule } from '@angular/material/core';
import { PropertyCardDto } from '@core/services/property/dto/PropertyCardDto';


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
  property = input.required<PropertyCardDto>();
  propertyClick = output<PropertyCardDto>();
  imageLoaded = signal(false);

  onCardClick(): void {
    this.propertyClick.emit(this.property());
  }

  //TODO
  /*onFavoriteClick(event: Event): void {
    event.stopPropagation();
    this.isFavorite.update(current => !current);
    this.favoriteToggle.emit(this.property());
  }*/

  onImageLoad(): void {
    this.imageLoaded.set(true);
  }

  /*
  // TODO
  getImageUrl(): string {
    const images = this.property().primaryImage;
    return images?.url ?? '/assets/images/no-image.jpg';
  }
  */

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
