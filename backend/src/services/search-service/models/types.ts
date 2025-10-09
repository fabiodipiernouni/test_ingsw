// Types per il Search Service basati sullo schema OpenAPI

import { EnergyClass, ListingType, PropertyStatus, PropertyType } from '@property/models/types';
import { PropertyCard } from '@property/models/PropertyCard';

export type SortBy = 'price_asc' | 'price_desc' | 'area_asc' | 'area_desc' | 'date_desc' | 'relevance';
export type SearchSource = 'web' | 'mobile' | 'api';
export type SuggestionType = 'location' | 'property_type' | 'feature';

export interface SearchFilters {
  // Text search
  query?: string;
  
  // Location filters
  city?: string;
  province?: string;
  zipCode?: string;
  
  // Property type and listing
  propertyType?: PropertyType;
  listingType?: ListingType;
  status?: PropertyStatus;
  
  // Price range
  priceMin?: number;
  priceMax?: number;
  
  // Size filters
  bedrooms?: number;
  bathrooms?: number;
  areaMin?: number;
  areaMax?: number;
  
  // Property characteristics
  energyClass?: EnergyClass;
  hasElevator?: boolean;
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasParking?: boolean;
  
  // Geographic search
  radius?: number; // in kilometers
  centerLat?: number;
  centerLng?: number;
  
  // Additional filters
  features?: string[];
  sortBy?: SortBy;
}

export interface SearchRequest extends SearchFilters {
  page?: number;
  limit?: number;
}




export interface SearchResult {
  properties: PropertyCard[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  searchTime: number; // in milliseconds
  appliedFilters: SearchFilters;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: SearchFilters;
  isNotificationEnabled: boolean;
  lastResultCount: number;
  hasNewResults: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedSearchCreate {
  name: string;
  filters: SearchFilters;
  isNotificationEnabled?: boolean;
}

export interface SavedSearchUpdate {
  name?: string;
  filters?: SearchFilters;
  isNotificationEnabled?: boolean;
}

export interface SearchHistory {
  id: string;
  userId: string;
  filters: SearchFilters;
  resultCount: number;
  searchedAt: string;
  source: SearchSource;
  executionTime: number; // in milliseconds
}

export interface SearchHistoryResponse {
  history: SearchHistory[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SearchSuggestionsRequest {
  query: string;
  type?: SuggestionType;
}

export interface SearchResponse {
  success: boolean;
  data: SearchResult;
  message?: string;
}

export interface SavedSearchResponse {
  success: boolean;
  data: SavedSearch;
  message?: string;
}

export interface SearchHistoryPagination {
  page?: number;
  limit?: number;
}