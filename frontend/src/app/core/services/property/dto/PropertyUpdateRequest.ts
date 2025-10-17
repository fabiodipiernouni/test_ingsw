import { Address } from '@service-shared/models/address';
import { PropertyStatus, EnergyClass } from '@core-services/property/models/types';

export interface PropertyUpdateRequest {
  title?: string;
  description?: string;
  price?: number;
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
}
