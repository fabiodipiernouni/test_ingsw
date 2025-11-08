import {Component, EventEmitter, Input, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PropertyCard } from '@features/properties/property-card/property-card';
import { PropertyCardDto } from '@core/services/property/dto/PropertyCardDto';


@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    PropertyCard
  ],
  templateUrl: './property-list.html',
  styleUrl: './property-list.scss'
})
export class PropertyList {
  @Input() properties: PropertyCardDto[] = [];
  @Input() emptyMessage: string | null = null;

  @Output() propertyClick = new EventEmitter<PropertyCardDto>();

  onPropertyClick(property: PropertyCardDto): void {
    this.propertyClick.emit(property);
  }
}
