import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SearchPropertiesFilter } from '@core/services/property/dto/SearchPropertiesFilter';

@Component({
  selector: 'app-search-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatExpansionModule,
    MatSliderModule,
    MatCheckboxModule
  ],
  templateUrl: './search-form.html',
  styleUrls: ['./search-form.scss']
})
export class SearchForm implements OnInit {
  searchForm!: FormGroup;
  filtersExpanded = false;

  @Output() searchStarted = new EventEmitter<SearchPropertiesFilter>();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      location: ['', [Validators.required]],
      propertyType: [''],
      listingType: [''],
      bedrooms: [null],
      bathrooms: [null],
      priceMin: [0],
      priceMax: [1000000],
      hasElevator: [false],
      hasBalcony: [false],
      hasGarden: [false],
      hasParking: [false],
      sortBy: ['createdAt'],
      sortOrder: ['DESC']
    });
  }

  /**
   * Gestisce il submit del form di ricerca.
   * Valida il form e, se valido, emette l'evento searchStarted con i filtri costruiti.
   */
  onSearch(): void {
    // Valida il form
    if (!this.searchForm.valid) {
      // Marca tutti i campi come touched per mostrare gli errori
      this.searchForm.markAllAsTouched();
      return;
    }

    const filter = this.buildSearchFilter();
    this.searchStarted.emit(filter);
  }

  private buildSearchFilter(): SearchPropertiesFilter {
    const formValue = this.searchForm.value;
    const filter: SearchPropertiesFilter = {};

    // Popola solo i campi con valori significativi
    if (formValue.location?.trim()) {
      filter.location = formValue.location.trim();
    }

    if (formValue.propertyType) {
      filter.propertyType = formValue.propertyType;
    }

    if (formValue.listingType) {
      filter.listingType = formValue.listingType;
    }

    if(formValue.rooms !== null && formValue.rooms !== undefined) {
      filter.rooms = formValue.rooms;
    }

    if (formValue.bedrooms !== null && formValue.bedrooms !== undefined) {
      filter.bedrooms = formValue.bedrooms;
    }

    if (formValue.bathrooms !== null && formValue.bathrooms !== undefined) {
      filter.bathrooms = formValue.bathrooms;
    }

    // Prezzo: include solo se diverso dai valori di default
    if (formValue.priceMin > 0) {
      filter.priceMin = formValue.priceMin;
    }

    if (formValue.priceMax < 1000000) {
      filter.priceMax = formValue.priceMax;
    }

    // Features: include solo se selezionate (true)
    if (formValue.hasElevator) {
      filter.hasElevator = true;
    }

    if (formValue.hasBalcony) {
      filter.hasBalcony = true;
    }

    if (formValue.hasGarden) {
      filter.hasGarden = true;
    }

    if (formValue.hasParking) {
      filter.hasParking = true;
    }

    return filter;
  }

  resetFilters(): void {
    this.searchForm.reset({
      location: '',
      propertyType: '',
      listingType: '',
      bedrooms: null,
      bathrooms: null,
      priceMin: 0,
      priceMax: 1000000,
      hasElevator: false,
      hasBalcony: false,
      hasGarden: false,
      hasParking: false,
      sortBy: 'createdAt',
      sortOrder: 'DESC'
    });
  }

  priceDisplay(): string {
    const min = this.searchForm.get('priceMin')?.value || 0;
    const max = this.searchForm.get('priceMax')?.value || 1000000;

    const formatPrice = (value: number): string => {
      if (value >= 10000000) {
        return '€10.000.000+';
      }
      return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
      }).format(value);
    };

    return `${formatPrice(min)} - ${formatPrice(max)}`;
  }

  // Helper per il template
  get locationControl() {
    return this.searchForm.get('location');
  }
}
