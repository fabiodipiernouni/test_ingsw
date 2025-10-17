import { EnergyClass, ListingType, PropertyStatus, PropertyType } from '@core/services/property/models/types';
import { GeoJSONPoint } from '@service-shared/types/geojson.types';
import { PropertyImageModel } from '@core/services/property/models/PropertyImageModel';
import { UserModel } from '@core/services/auth/models/UserModel';
import { Address } from '@service-shared/models/Address';

export interface PropertyModel {
  id: string;
  title: string;
  description: string;
  price: number;
  propertyType: PropertyType;
  listingType: ListingType;
  status: PropertyStatus;
  rooms: number;
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
  address: Address;
  location: GeoJSONPoint;
  images: PropertyImageModel[];
  agentId: string;
  views: number;
  favorites: number;
  createdAt: Date;
  updatedAt: Date;
  agent?: UserModel
}
