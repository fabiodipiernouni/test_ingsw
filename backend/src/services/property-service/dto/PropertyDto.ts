import {
  Agent,
  EnergyClass,
  ListingType,
  PropertyAddress,
  PropertyImage,
  PropertyLocation,
  PropertyStatus,
  PropertyType
} from '@search/models/types';

export interface PropertyDto {
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