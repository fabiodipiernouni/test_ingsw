import { Address } from '@service-shared/models/address';
import { EnergyClass, ListingType, PropertyType } from '@core-services/property/models/types';
import { GeoJSONPoint } from '@service-shared/types/geojson.types';

export interface CreatePropertyRequest {
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
  address: Address;
  location: GeoJSONPoint;
}
