import {ListingType, PropertyType} from '@core/services/property/models/types';
import {PrimaryImageGeoResultSmallDto} from '@core/services/property/dto/PrimaryImageGeoResultSmallDto';
import {GeoJSONPoint} from '@service-shared/types/geojson.types';


export interface GeoPropertyCardDto {
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
