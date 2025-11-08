import { GeoJSONPoint } from '@shared/types/geojson.types';
import { ListingType, PropertyType } from '@shared/types/property.types';
import { PrimaryImageGeoResultSmallDto } from '@property/dto/PrimaryImageGeoResultSmallDto';

export class GeoPropertyCardDto {
  id: string;
  title: string;
  description: string;
  price: number;
  propertyType: PropertyType;
  listingType: ListingType;
  city: string; // estratto da address.city
  province: string; // estratto da address.province
  rooms: number;
  area: number; // in square meters
  primaryImage?: PrimaryImageGeoResultSmallDto; // solo l'immagine principale
  location: GeoJSONPoint;
}