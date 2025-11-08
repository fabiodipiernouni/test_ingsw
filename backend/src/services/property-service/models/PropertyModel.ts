import { PropertyImageModel } from './PropertyImageModel';
import { EnergyClass, ListingType, PropertyStatus, PropertyType } from '@shared/types/property.types';
import { Address } from '@shared/models/Address';
import { GeoJSONPoint } from '@shared/types/geojson.types';
import { UserModel } from '@shared/models/UserModel';


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
