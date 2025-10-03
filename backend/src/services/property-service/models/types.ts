// Types per il Property Service basati sullo schema OpenAPI

import { GeoJSONPoint } from '@shared/types/geojson.types';

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
  id?: string;
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

export type PropertyType = 'apartment' | 'villa' | 'house' | 'loft' | 'office' | 'commercial' | 'land';
export type ListingType = 'sale' | 'rent';
export type PropertyStatus = 'active' | 'pending' | 'sold' | 'rented' | 'withdrawn';
export type EnergyClass = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface PropertyCreateRequest {
  title: string;
  description: string;
  price: number;
  propertyType: PropertyType;
  listingType: ListingType;
  bedrooms: number;
  bathrooms: number;
  area: number;
  floor?: string;
  energyClass?: EnergyClass;
  hasElevator?: boolean;
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasParking?: boolean;
  features?: string[];
  address: PropertyAddress;
  location: PropertyLocation;
}

export interface PropertyUpdateRequest {
  title?: string;
  description?: string;
  price?: number;
  status?: PropertyStatus;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  floor?: string;
  energyClass?: EnergyClass;
  hasElevator?: boolean;
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasParking?: boolean;
  features?: string[];
  address?: PropertyAddress;
  isActive?: boolean;
}

export interface PropertyResponse {
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
}

export interface SearchResult {
  properties: PropertyResponse[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CreatePropertyResponse {
  success: boolean;
  data: PropertyResponse;
  message?: string;
}

export interface PropertiesListResponse {
  success: boolean;
  data: SearchResult;
  message?: string;
  timestamp: Date;
}