import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { PropertyService } from '@core/services/property/property.service';
import { SearchPropertyFilter } from '@core/services/property/dto/SearchPropertyFilter';
import { PropertyCardDto } from '@core/services/property/dto/PropertyCardDto';
import { PagedResult } from '@service-shared/dto/pagedResult';
import { PagedRequest } from '@service-shared/dto/pagedRequest';
import { firstValueFrom } from 'rxjs';

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
export class SearchFormComponent implements OnInit {
  searchForm!: FormGroup;
  filtersExpanded = false;
  isSearching = false;

  // Gestione paginazione
  private currentPage = 1;
  private readonly defaultPageSize = 20;

  @Output() searchResults = new EventEmitter<PagedResult<PropertyCardDto>>();
  @Output() searchError = new EventEmitter<any>();
  @Output() searchStarted = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private propertyService: PropertyService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      location: [''],
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
   * Esegue la ricerca in base ai filtri impostati nel form.
   * Resetta la pagina corrente a 1 ad ogni nuova ricerca.
   * Emite eventi per l'inizio della ricerca, i risultati ottenuti o eventuali errori.
   */
  async onSearch(): Promise<void> {
    if (this.isSearching) {
      return; // Previene ricerche multiple simultanee
    }

    this.isSearching = true;
    this.currentPage = 1; // Reset alla prima pagina ad ogni nuova ricerca
    this.searchStarted.emit();

    try {
      await this.executeSearch(this.currentPage);
    } catch (error) {
      this.searchError.emit(error);
    } finally {
      this.isSearching = false;
    }
  }

  async loadNextPage(): Promise<void> {
    if (this.isSearching) {
      return;
    }

    this.isSearching = true;
    this.currentPage++;

    try {
      await this.executeSearch(this.currentPage);
    } catch (error) {
      this.searchError.emit(error);
      this.currentPage--; // Rollback in caso di errore
    } finally {
      this.isSearching = false;
    }
  }

  async loadPage(page: number): Promise<void> {
    if (this.isSearching || page < 1) {
      return;
    }

    this.isSearching = true;
    this.currentPage = page;

    try {
      await this.executeSearch(page);
    } catch (error) {
      this.searchError.emit(error);
    } finally {
      this.isSearching = false;
    }
  }

  private async executeSearch(page: number): Promise<void> {
    const filter = this.buildSearchFilter();
    const pagedRequest = this.buildPagedRequest(page);

    try {
      // Usa firstValueFrom per convertire Observable in Promise
      const result = await firstValueFrom(
        this.propertyService.searchProperties(filter, pagedRequest)
      );

      this.searchResults.emit(result);
    } catch (error) {
      throw error; // Rilancia l'errore per gestirlo nel chiamante
    }
  }

  private buildSearchFilter(): SearchPropertyFilter {
    const formValue = this.searchForm.value;
    const filter: SearchPropertyFilter = {};

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

  private buildPagedRequest(page: number): PagedRequest {
    return {
      page: page,
      limit: this.defaultPageSize,
      sortBy: this.searchForm.get('sortBy')?.value || 'createdAt',
      sortOrder: this.searchForm.get('sortOrder')?.value || 'DESC'
    };
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
    this.currentPage = 1;
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

  // Metodo pubblico per permettere al component parent di caricare altre pagine
  getCurrentPage(): number {
    return this.currentPage;
  }

  getIsSearching(): boolean {
    return this.isSearching;
  }
}
