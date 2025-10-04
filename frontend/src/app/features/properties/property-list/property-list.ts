import {Component, EventEmitter, Input, Output, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PropertyCard } from '@features/properties/property-card/property-card';
import { Property } from '@features/properties/models/property';

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
  @Input() properties = signal<Property[]>([]);

  @Output() propertyClick = new EventEmitter<Property>()

  onPropertyClick(property: Property): void {
    console.log('Property clicked:', property);
    // Navigate to property details
  }
}
