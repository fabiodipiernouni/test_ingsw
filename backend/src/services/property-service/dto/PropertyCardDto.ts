import { PropertyImageModel } from '../models/PropertyImageModel';
import { EnergyClass, ListingType, PropertyStatus, PropertyType } from '@shared/types/property.types';
import { GeoJSONPoint } from '@shared/types/geojson.types';


export interface PropertyCardDto {
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
  area: number; // in square meters
  floor?: string; // piano dell'immobile, se applicabile
  city: string; // estratto da address.city
  province: string; // estratto da address.province
  location: GeoJSONPoint; // coordinate geografiche dell'immobile
  primaryImage?: PropertyImageModel; // solo l'immagine principale
  energyClass?: EnergyClass;
  hasElevator: boolean;
  hasBalcony: boolean;
  hasGarden: boolean;
  hasParking: boolean;
  agentId?: string; // per mostrare il nome dell'agente,
  views?: number;
  createdAt: Date;
  updatedAt: Date;
}