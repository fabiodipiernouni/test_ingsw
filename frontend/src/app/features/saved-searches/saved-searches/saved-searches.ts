import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { SearchService } from '@core/services/search/search.service';
import { SavedSearchModel } from '@core/services/search/models/SavedSearchModel';
import { EditSearchNameDialog } from '@features/saved-searches/edit-search-name-dialog/edit-search-name-dialog';

@Component({
  selector: 'app-saved-searches',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    RouterLink
  ],
  templateUrl: './saved-searches.html',
  styleUrl: './saved-searches.scss'
})
export class SavedSearches implements OnInit {
  private searchService = inject(SearchService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  savedSearches = this.searchService.savedSearches;
  isLoading = this.searchService.isLoading;

  ngOnInit(): void {
    this.loadSavedSearches();
  }

  loadSavedSearches(): void {
    this.searchService.getSavedSearches().subscribe({
      next: () => {
        // Dati caricati con successo, già gestiti nel service
      },
      error: (error) => {
        console.error('Errore nel caricamento delle ricerche salvate:', error);
        this.snackBar.open(
          'Errore nel caricamento delle ricerche salvate',
          'Chiudi',
          { duration: 3000 }
        );
      }
    });
  }

  executeSearch(search: SavedSearchModel): void {
    this.router.navigate(['/search'], {
      queryParams: { filters: JSON.stringify(search.filters) }
    });
  }

  toggleNotifications(search: SavedSearchModel): void {
    const newValue = !search.isNotificationEnabled;
    
    this.searchService.toggleNotifications(search.id, newValue).subscribe({
      next: () => {
        this.snackBar.open(
          `Notifiche ${newValue ? 'attivate' : 'disattivate'} per "${search.name}"`,
          'Chiudi',
          { duration: 3000 }
        );
      },
      error: (error) => {
        console.error('Errore nell\'aggiornamento delle notifiche:', error);
        this.snackBar.open(
          error.error.message || 'Errore nell\'aggiornamento delle notifiche',
          'Chiudi',
          { duration: 3000 }
        );
      }
    });
  }

  editSearch(search: SavedSearchModel): void {
    const dialogRef = this.dialog.open(EditSearchNameDialog, {
      width: '500px',
      data: { currentName: search.name }
    });

    dialogRef.afterClosed().subscribe(newName => {
      if (newName && newName.trim() && newName !== search.name) {
        this.searchService.updateSavedSearchName(search.id, newName.trim()).subscribe({
          next: () => {
            this.snackBar.open(
              `Nome aggiornato a "${newName.trim()}"`,
              'Chiudi',
              { duration: 3000 }
            );
          },
          error: (error) => {
            console.error('Errore nell\'aggiornamento del nome:', error);
            this.snackBar.open(
              'Errore nell\'aggiornamento del nome',
              'Chiudi',
              { duration: 3000 }
            );
          }
        });
      }
    });
  }

  deleteSearch(search: SavedSearchModel): void {
    this.searchService.deleteSavedSearch(search.id).subscribe({
      next: () => {
        this.snackBar.open(`Ricerca "${search.name}" eliminata`, 'Chiudi', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Errore nell\'eliminazione della ricerca:', error);
        this.snackBar.open(
          'Errore nell\'eliminazione della ricerca',
          'Chiudi',
          { duration: 3000 }
        );
      }
    });
  }

  getFilterSummary(search: SavedSearchModel): string[] {
    const summary: string[] = [];
    const filters = search.filters?.filters;

    if (!filters) return summary;

    if (filters.location) summary.push(filters.location);
    if (filters.propertyType) summary.push(this.getPropertyTypeLabel(filters.propertyType));
    if (filters.listingType) summary.push(this.getListingTypeLabel(filters.listingType));
    if (filters.priceMin && filters.priceMax) {
      summary.push(`€${filters.priceMin.toLocaleString()} - €${filters.priceMax.toLocaleString()}`);
    }
    if (filters.bedrooms) summary.push(`${filters.bedrooms}+ camere`);

    return summary;
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

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
  }
}
