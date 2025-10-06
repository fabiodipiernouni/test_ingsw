import { Address } from "@shared/models/Address";

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
  address?: Address;
  isActive?: boolean;
}
