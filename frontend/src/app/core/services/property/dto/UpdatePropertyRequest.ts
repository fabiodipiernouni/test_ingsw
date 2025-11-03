import { Address } from '@service-shared/models/Address';
import { GeoJSONPoint } from '@service-shared/types/geojson.types';
import { PropertyType, ListingType, PropertyStatus, EnergyClass } from '@core/services/property/models/types';

/**
 * DTO per l'aggiornamento parziale di una proprietà
 * Basato su UpdatePropertyRequest dell'OpenAPI
 * Tutti i campi sono opzionali - solo quelli presenti vengono aggiornati
 */
export interface UpdatePropertyRequest {
  title?: string;
  description?: string;
  price?: number;
  propertyType?: PropertyType;
  listingType?: ListingType;
  status?: PropertyStatus;
  rooms?: number;
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
  address?: Address;
  location?: GeoJSONPoint;
}

