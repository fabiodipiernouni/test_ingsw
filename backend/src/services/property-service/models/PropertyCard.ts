import { PropertyImage } from './PropertyImage';


export interface PropertyCard {
  id: string;
  title: string;
  price: number;
  propertyType: 'apartment' | 'villa' | 'house' | 'loft' | 'office' | 'commercial' | 'land';
  listingType: 'sale' | 'rent';
  status: 'active' | 'pending' | 'sold' | 'rented' | 'withdrawn';
  bedrooms: number;
  bathrooms: number;
  area: number; // in square meters
  city: string; // estratto da address.city
  province: string; // estratto da address.province
  primaryImage?: PropertyImage; // solo l'immagine principale
  energyClass?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  hasElevator: boolean;
  hasParking: boolean;
  //isFavorite?: boolean; // per mostrare l'icona del cuore
  views?: number;
}