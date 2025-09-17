import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { SearchFilters } from '../../../core/models/search.model';

@Component({
  selector: 'app-search-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSliderModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatIconModule
  ],
  templateUrl: './search-form.html',
  styleUrl: './search-form.scss'
})
export class SearchForm {
  private fb = inject(FormBuilder);

  @Output() filtersChanged = new EventEmitter<Partial<SearchFilters>>();
  @Output() searchExecuted = new EventEmitter<SearchFilters>();

  searchForm: FormGroup = this.fb.group({
    location: [''],
    propertyType: [''],
    listingType: [''],
    priceMin: [0],
    priceMax: [1000000],
    bedrooms: [null],
    bathrooms: [null],
    hasElevator: [null],
    hasBalcony: [null],
    hasGarden: [null],
    hasParking: [null]
  });

  priceDisplay = signal('€0 - €1.000.000+');
  filtersExpanded = signal(false);

  constructor() {
    this.searchForm.get('priceMin')?.valueChanges.subscribe(() => this.updatePriceDisplay());
    this.searchForm.get('priceMax')?.valueChanges.subscribe(() => this.updatePriceDisplay());

    // Emit filters change on form changes
    this.searchForm.valueChanges.subscribe(values => {
      this.filtersChanged.emit(values);
    });
  }

  onSearch(): void {
    const filters = this.searchForm.value as SearchFilters;
    this.searchExecuted.emit(filters);
  }

  resetFilters(): void {
    this.searchForm.reset({
      location: '',
      propertyType: '',
      listingType: '',
      priceMin: 0,
      priceMax: 1000000,
      bedrooms: null,
      bathrooms: null,
      hasElevator: null,
      hasBalcony: null,
      hasGarden: null,
      hasParking: null
    });
    this.updatePriceDisplay();
  }

  private updatePriceDisplay(): void {
    const min = this.searchForm.get('priceMin')?.value || 0;
    const max = this.searchForm.get('priceMax')?.value || 1000000;

    const minFormatted = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(min);

    const maxFormatted = max >= 1000000 ?
      '€1.000.000+' :
      new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
      }).format(max);

    this.priceDisplay.set(`${minFormatted} - ${maxFormatted}`);
  }
}
