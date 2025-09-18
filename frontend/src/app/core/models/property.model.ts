import {Agent} from '@core/models/user.model';

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  propertyType: 'apartment' | 'villa' | 'house' | 'loft' | 'office';
  listingType: 'sale' | 'rent';
  bedrooms: number;
  bathrooms: number;
  area: number;
  floor?: string;
  energyClass?: string;
  hasElevator: boolean;
  hasBalcony: boolean;
  hasGarden: boolean;
  hasParking: boolean;
  address: PropertyAddress;
  location: PropertyLocation;
  images: PropertyImage[];
  agentId: string;
  agent?: Agent;
  isActive: boolean;
  views: number;
  favorites: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyAddress {
  street: string;
  city: string;
  province: string;
  zipCode: string;
  country: string;
}

export interface PropertyLocation {
  latitude: number;
  longitude: number;
}

export interface PropertyImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface PropertyStats {
  totalProperties: number;
  propertiesForSale: number;
  propertiesForRent: number;
  averagePrice: number;
  mostViewedProperties: Property[];
}
