import {Agent} from '@core/models/user.model';
import {Address} from '@core/models/address.model';

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  propertyType: 'apartment' | 'villa' | 'house' | 'loft' | 'office' | 'commercial' | 'land';
  listingType: 'sale' | 'rent';
  status: 'active' | 'pending' | 'sold' | 'rented' | 'withdrawn';
  bedrooms: number;
  bathrooms: number;
  area: number; // in square meters
  floor?: string;
  energyClass?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  hasElevator: boolean;
  hasBalcony: boolean;
  hasGarden: boolean;
  hasParking: boolean;
  address: Address;
  location: PropertyLocation; // geographical coordinates
  images: PropertyImage[];
  agentId: string;
  agent?: Agent;
  isActive: boolean;
  views: number;
  //favorites: number;
  createdAt: Date;
  updatedAt: Date;
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
