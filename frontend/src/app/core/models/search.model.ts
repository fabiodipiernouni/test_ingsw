import {Property} from '@core/models/property.model';

export interface SearchFilters {
  location?: string;
  propertyType?: string;
  listingType?: string;
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  areaMin?: number;
  areaMax?: number;
  energyClass?: string;
  hasElevator?: boolean;
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasParking?: boolean;
  radius?: number;
  centerLat?: number;
  centerLng?: number;
}

export interface SearchResult {
  properties: Property[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: SearchFilters;
  isNotificationEnabled: boolean;
  lastResultCount: number;
  hasNewResults: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchHistory {
  id: string;
  userId: string;
  filters: SearchFilters;
  resultCount: number;
  searchedAt: Date;
}
