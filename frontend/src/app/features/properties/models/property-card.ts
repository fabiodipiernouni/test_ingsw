import { PropertyImage, Property } from '@features/properties/models/property';

/**
 * Modello semplificato per la visualizzazione di una property card.
 * Contiene solo le informazioni essenziali da mostrare in anteprima.
 */
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
  //isFavorite?: boolean; // per mostrare l'icona del cuore //TODO
  views?: number;
}

/**
 * Utility per convertire una Property completa in PropertyCard
 */
function toPropertyCard(property: Property): PropertyCard {
  return {
    id: property.id,
    title: property.title,
    price: property.price,
    propertyType: property.propertyType,
    listingType: property.listingType,
    status: property.status || 'active',
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.area,
    city: property.address?.city || '',
    province: property.address?.province || '',
    primaryImage: property.images?.find((img: PropertyImage) => img.isPrimary) || property.images?.[0],
    energyClass: property.energyClass,
    hasElevator: property.hasElevator,
    hasParking: property.hasParking,
    //isFavorite: property.isFavorite,
    views: property.views
  };
}

export default toPropertyCard

