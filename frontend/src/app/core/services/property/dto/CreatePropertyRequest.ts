import {EnergyClass, ListingType, PropertyType} from '@core/services/property/models/types';
import {Address} from '@service-shared/models/Address';
import {GeoJSONPoint} from '@service-shared/types/geojson.types';

/**
 * DTO per la creazione di una nuova proprietà
 * POST /api/properties
 */
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
