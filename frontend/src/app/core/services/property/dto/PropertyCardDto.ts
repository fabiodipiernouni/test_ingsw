import { PropertyImageModel } from '../models/PropertyImageModel';
import { EnergyClass, ListingType, PropertyStatus, PropertyType } from '@property/models/types';


export interface PropertyCardDto {
  id: string;
  title: string;
  description: string;
  price: number;
  propertyType: PropertyType;
  listingType: ListingType;
  status: PropertyStatus;
  bedrooms: number;
  bathrooms: number;
  area: number; // in square meters
  floor?: string; // piano dell'immobile, se applicabile
  city: string; // estratto da address.city
  province: string; // estratto da address.province
  primaryImage?: PropertyImageModel; // solo l'immagine principale
  energyClass?: EnergyClass;
  hasElevator: boolean;
  hasBalcony: boolean;
  hasGarden: boolean;
  hasParking: boolean;
  agentId?: string; // per mostrare il nome dell'agente,
  //isFavorite?: boolean; // per mostrare l'icona del cuore
  views?: number;
  createdAt: string;
  updatedAt: string;
}