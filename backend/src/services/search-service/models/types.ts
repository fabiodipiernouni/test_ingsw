// Types per il Search Service basati sullo schema OpenAPI

import { GeoJSONPoint } from '@shared/types/geojson.types';

export type PropertyType = 'apartment' | 'villa' | 'house' | 'loft' | 'office' | 'commercial' | 'land';
export type ListingType = 'sale' | 'rent';
export type PropertyStatus = 'active' | 'pending' | 'sold' | 'rented' | 'withdrawn';
export type EnergyClass = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
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
  
  // Geographic search - radius search (ricerca per raggio da punto centrale)
  // Cerca tutte le proprietà entro un raggio specificato da un punto centrale.
  // Non può essere usato insieme a polygon search (sono mutuamente esclusivi).
  radiusSearch?: {
    center: GeoJSONPoint;     // punto centrale della ricerca in formato GeoJSON
    radius: number;           // raggio in kilometers (max 500km)
  };
  
  // Geographic search - polygon search (ricerca per area poligonale)
  // Cerca tutte le proprietà all'interno di un'area poligonale definita da punti GeoJSON.
  // Il poligono viene chiuso automaticamente se necessario.
  // Minimo 3 punti richiesti. Non può essere usato insieme a radius search.
  polygon?: GeoJSONPoint[];
  
  // Additional filters
  features?: string[];
  sortBy?: SortBy;
}

export interface SearchRequest extends SearchFilters {
  page?: number;
  limit?: number;
}

export interface PropertyAddress {
  street: string;
  city: string;
  province: string;
  zipCode: string;
  country: string;
}

// PropertyLocation usa GeoJSONPoint condiviso
export type PropertyLocation = GeoJSONPoint;

export interface PropertyImage {
  id: string;
  // File metadata
  fileName?: string;
  contentType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  uploadDate?: Date | string;
  // Display properties
  caption?: string;
  alt?: string;
  isPrimary?: boolean;
  order?: number;
  // Pre-signed URLs (generated on-the-fly)
  urls?: {
    original?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
}

export interface Agent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  agencyName?: string;
  licenseNumber?: string;
  rating?: number;
  reviewsCount?: number;
}

export interface PropertyResult {
  id: string;
  title: string;
  description: string;
  price: number;
  propertyType: PropertyType;
  listingType: ListingType;
  status: PropertyStatus;
  bedrooms: number;
  bathrooms: number;
  area: number;
  floor?: string;
  energyClass?: EnergyClass;
  hasElevator: boolean;
  hasBalcony: boolean;
  hasGarden: boolean;
  hasParking: boolean;
  features?: string[];
  address: PropertyAddress;
  location: PropertyLocation;
  images: PropertyImage[];
  agentId: string;
  agent?: Agent;
  isActive: boolean;
  views: number;
  favorites: number;
  createdAt: string;
  updatedAt: string;
  // Search specific fields
  relevanceScore?: number;
  distance?: number; // in kilometers from search center
}

export interface SearchResult {
  properties: PropertyResult[];
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