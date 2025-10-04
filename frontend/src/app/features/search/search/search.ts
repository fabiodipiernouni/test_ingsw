import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SearchForm } from '../search-form/search-form';
import { PropertyList } from '../../properties/property-list/property-list';
import { PropertyService } from '@core/services/property/property.service';
import { SearchFilters, SearchResult } from '@core/models/search.model';
import { Property } from '@features/properties/models/property';
import {MatTooltip} from '@angular/material/tooltip';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SearchForm,
    PropertyList,
    MatTooltip
  ],
  templateUrl: './search.html',
  styleUrl: './search.scss'
})
export class Search implements OnInit, OnDestroy {
  private propertyService = inject(PropertyService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private destroy$ = new Subject<void>();

  searchResult = signal<SearchResult | null>(null);
  properties = signal<Property[]>([]);
  currentFilters = signal<SearchFilters>({});
  isLoading = signal<boolean>(false);
  hasSearched = signal<boolean>(false);
  currentPage = signal<number>(1);
  totalPages = signal<number>(0);

  // Map state
  showMap = signal<boolean>(false);
  mapCenter = signal<{ lat: number; lng: number }>({ lat: 40.8359, lng: 14.2394 }); // Naples center

  ngOnInit(): void {
    // Check for filters in query params
    this.route.queryParams.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(params => {
      if (params['filters']) {
        try {
          const filters = JSON.parse(params['filters']);
          this.currentFilters.set(filters);
          this.executeSearch(filters);
        } catch (error) {
          console.error('Error parsing filters from URL:', error);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFiltersChanged(filters: Partial<SearchFilters>): void {
    // Update filters reactively but don't search immediately
    this.currentFilters.update(current => ({ ...current, ...filters }));
  }

  onSearchExecuted(filters: SearchFilters): void {
    this.currentFilters.set(filters);
    this.currentPage.set(1);
    this.executeSearch(filters);

    // Update URL with search parameters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filters: JSON.stringify(filters) },
      queryParamsHandling: 'merge'
    });
  }

  onLoadMore(): void {
    if (this.searchResult()?.hasNextPage) {
      const nextPage = this.currentPage() + 1;
      this.loadPage(nextPage);
    }
  }

  onPropertySelected(property: Property): void {
    this.router.navigate(['/properties', property.id]);
  }

  toggleMapView(): void {
    this.showMap.update(current => !current);
  }

  saveCurrentSearch(): void {
    const filters = this.currentFilters();
    if (Object.keys(filters).length === 0) {
      this.snackBar.open('Effettua prima una ricerca per salvarla', 'Chiudi', {
        duration: 3000
      });
      return;
    }

    // Generate a name for the search based on filters
    const searchName = this.generateSearchName(filters);

    // TODO: Implement save search functionality
    this.snackBar.open(`Ricerca "${searchName}" salvata con successo`, 'Chiudi', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  clearSearch(): void {
    this.currentFilters.set({});
    this.searchResult.set(null);
    this.properties.set([]);
    this.hasSearched.set(false);
    this.currentPage.set(1);

    // Clear URL params
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  private executeSearch(filters: SearchFilters): void {
    this.isLoading.set(true);
    this.hasSearched.set(true);

    this.propertyService.searchProperties(filters, 1, 20).subscribe({
      next: (result) => {
        this.searchResult.set(result);
        this.properties.set(result.properties);
        this.totalPages.set(result.totalPages);
        this.isLoading.set(false);

        // Update map center if location is specified
        if (filters.location) {
          // TODO: Geocode location and update map center
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.snackBar.open('Errore durante la ricerca', 'Chiudi', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        console.error('Search error:', error);
      }
    });
  }

  private loadPage(page: number): void {
    this.isLoading.set(true);

    this.propertyService.searchProperties(this.currentFilters(), page, 20).subscribe({
      next: (result) => {
        // Append new properties to existing ones
        this.properties.update(current => [...current, ...result.properties]);
        this.searchResult.set(result);
        this.currentPage.set(page);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.snackBar.open('Errore durante il caricamento', 'Chiudi', {
          duration: 3000
        });
      }
    });
  }

  private generateSearchName(filters: SearchFilters): string {
    const parts: string[] = [];

    if (filters.location) parts.push(filters.location);
    if (filters.propertyType) parts.push(this.getPropertyTypeLabel(filters.propertyType));
    if (filters.listingType) parts.push(this.getListingTypeLabel(filters.listingType));
    if (filters.priceMin && filters.priceMax) {
      parts.push(`€${filters.priceMin.toLocaleString()}-${filters.priceMax.toLocaleString()}`);
    }

    return parts.join(' • ') || 'Ricerca personalizzata';
  }

  private getPropertyTypeLabel(type: string): string {
    const types: Record<string, string> = {
      apartment: 'Appartamento',
      villa: 'Villa',
      house: 'Casa',
      loft: 'Loft',
      office: 'Ufficio'
    };
    return types[type] || type;
  }

  private getListingTypeLabel(type: string): string {
    return type === 'sale' ? 'Vendita' : 'Affitto';
  }
}
