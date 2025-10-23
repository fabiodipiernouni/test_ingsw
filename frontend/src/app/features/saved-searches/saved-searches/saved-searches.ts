import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PropertyService } from '@core/services/property/property.service';
import {SearchPropertiesFilters} from '@core/services/property/dto/SearchPropertiesFilters';


interface SavedSearch {
  id: string;
  name: string;
  filters: SearchPropertiesFilters;
  createdAt: Date;
  resultsCount: number;
  isNotificationEnabled: boolean;
  hasNewResults: boolean;
}

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
  private propertyService = inject(PropertyService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  savedSearches = signal<SavedSearch[]>([]);
  isLoading = signal(false);

  ngOnInit(): void {
    this.loadSavedSearches();
  }

  loadSavedSearches(): void {
    this.isLoading.set(true);
    // Simulate API call - replace with actual service call
    setTimeout(() => {
      this.savedSearches.set([
        {
          id: '1',
          name: 'Appartamenti Vomero',
          filters: {
            location: 'Vomero, Napoli',
            propertyType: 'apartment',
            listingType: 'sale',
            priceMin: 200000,
            priceMax: 350000,
            bedrooms: 2
          },
          createdAt: new Date('2024-01-15'),
          resultsCount: 24,
          isNotificationEnabled: true,
          hasNewResults: true
        },
        {
          id: '2',
          name: 'Villa Posillipo',
          filters: {
            location: 'Posillipo, Napoli',
            propertyType: 'villa',
            listingType: 'sale',
            priceMin: 400000,
            priceMax: 800000,
            bedrooms: 4,
            hasGarden: true
          },
          createdAt: new Date('2024-01-10'),
          resultsCount: 8,
          isNotificationEnabled: false,
          hasNewResults: false
        },
        {
          id: '3',
          name: 'Uffici Centro',
          filters: {
            location: 'Centro Storico, Napoli',
            propertyType: 'office',
            listingType: 'rent',
            priceMin: 800,
            priceMax: 2000
          },
          createdAt: new Date('2024-01-05'),
          resultsCount: 15,
          isNotificationEnabled: true,
          hasNewResults: false
        }
      ]);
      this.isLoading.set(false);
    }, 1000);
  }

  executeSearch(search: SavedSearch): void {
    this.router.navigate(['/search'], {
      queryParams: { filters: JSON.stringify(search.filters) }
    });
  }

  toggleNotifications(search: SavedSearch): void {
    search.isNotificationEnabled = !search.isNotificationEnabled;
    this.snackBar.open(
      `Notifiche ${search.isNotificationEnabled ? 'attivate' : 'disattivate'} per "${search.name}"`,
      'Chiudi',
      { duration: 3000 }
    );
  }

  editSearch(search: SavedSearch): void {
    // Navigate to search page with pre-filled filters for editing
    this.router.navigate(['/search'], {
      queryParams: {
        filters: JSON.stringify(search.filters),
        editId: search.id
      }
    });
  }

  deleteSearch(search: SavedSearch): void {
    this.savedSearches.update(current =>
      current.filter(s => s.id !== search.id)
    );
    this.snackBar.open(`Ricerca "${search.name}" eliminata`, 'Chiudi', {
      duration: 3000
    });
  }

  getFilterSummary(filters: SearchPropertiesFilters): string[] {
    const summary: string[] = [];

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

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  }
}
