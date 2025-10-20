import { Component, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { PropertyService } from '@core/services/property/property.service';

import {MatTooltip} from '@angular/material/tooltip';
import {PropertyList} from '@features/properties/property-list/property-list';
import {SearchForm} from '@features/search/search-form/search-form';
import {PropertyCardDto} from '@core/services/property/dto/PropertyCardDto';
import {PagedResult} from '@service-shared/dto/pagedResult';
import {SearchPropertiesFilter} from '@core/services/property/dto/SearchPropertiesFilter';
import {GetPropertiesCardsRequest} from '@core/services/property/dto/GetPropertiesCardsRequest';

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
export class Search implements OnDestroy {
  private readonly propertyService = inject(PropertyService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  searchResult = signal<PagedResult<PropertyCardDto> | null>(null);
  currentFilters = signal<GetPropertiesCardsRequest>({});
  isLoading = signal<boolean>(false);
  hasSearched = signal<boolean>(false);
  emptyResultMessage = signal<string>('');

  // Map state
  showMap = signal<boolean>(false);

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Gestisce l'evento searchStarted emesso da search-form.
   * Riceve i filtri e avvia la ricerca.
   */
  async onSearchStarted(searchFormData: GetPropertiesCardsRequest): Promise<void> {

    this.currentFilters.set(searchFormData!);

    await this.executeSearch(searchFormData);
  }

  onLoadMore(): void {
    if (this.searchResult()?.hasNextPage) {
      this.loadAnotherPage((this.currentFilters().pagedRequest?.page || 0) + 1);
    }
  }

  onPropertySelected(property: PropertyCardDto): void {
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
    const searchName = this.generateSearchName();

    // TODO: Implement save search functionality
    this.snackBar.open(`Ricerca "${searchName}" salvata con successo`, 'Chiudi', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  clearSearch(): void {
    this.currentFilters.set({});
    this.searchResult.set(null);
    this.hasSearched.set(false);
  }

  /**
   * Esegue la ricerca utilizzando PropertyService.
   * Gestisce i risultati, incluso il caso di nessun risultato trovato.
   */
  private async executeSearch(searchFormData: GetPropertiesCardsRequest): Promise<void> {
    this.isLoading.set(true);
    this.hasSearched.set(true);

    try {
      const result = await firstValueFrom(
        this.propertyService.searchProperties(searchFormData)
      );

      this.searchResult.set(result);

      // Gestione caso nessun risultato
      if (result.totalCount === 0) {
        this.emptyResultMessage.set(
          'Peccato! Al momento non ci sono immobili che corrispondono ai tuoi criteri di ricerca. ' +
          'Prova a modificare i filtri o riprova più tardi, aggiungiamo nuovi immobili ogni giorno!'
        );
      }

      // Update map center if location is specified
      //if ( filters.location) {
        // TODO: Geocode location and update map center
      //}
    } catch (error) {
      this.snackBar.open('Errore durante la ricerca. Riprova più tardi.', 'Chiudi', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      console.error('Search error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Carica una pagina specifica di risultati (per paginazione).
   * Aggiunge i nuovi risultati a quelli esistenti.
   */
  private async loadAnotherPage(page: number): Promise<void> {
    this.isLoading.set(true);

    try {

      const currentF = this.currentFilters();

      currentF.pagedRequest!.page = page;

      this.currentFilters.set(currentF);

      const result = await firstValueFrom(
        this.propertyService.searchProperties(this.currentFilters())
      );

      // Append new properties to existing ones
      this.searchResult.set(result);
    } catch (error) {
      this.snackBar.open('Errore durante il caricamento. Riprova.', 'Chiudi', {
        duration: 3000
      });
      console.error('Load page error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private generateSearchName(): string {
    const parts: string[] = [];

    const filters = this.currentFilters().filters || {};

    if (filters.location) parts.push(filters.location);
    if (filters.propertyType) parts.push(this.getPropertyTypeLabel(filters.propertyType));
    if (filters.listingType) parts.push(this.getListingTypeLabel(filters.listingType));
    if (filters.priceMin && filters.priceMax) {
      parts.push(`€${filters.priceMin.toLocaleString()}-${filters.priceMax.toLocaleString()}`);
    }

    return parts.join(' • ');
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
