import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsArray,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType, ListingType, PropertyStatus, EnergyClass } from '@shared/types/property.types';
import { Address } from '@shared/models/Address';
import { GeoJSONPoint } from '@shared/types/geojson.types';

/**
 * DTO per l'aggiornamento parziale di una proprietà.
 * Tutti i campi sono opzionali - solo i campi presenti nel body vengono aggiornati.
 *
 * Esempi d'uso:
 * - Aggiorna solo status: { "status": "sold" }
 * - Aggiorna prezzo: { "price": 280000 }
 * - Aggiorna più campi: { "status": "active", "price": 250000, "hasElevator": true }
 */
export class UpdatePropertyRequest {
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(4000, { message: 'Description must not exceed 4000 characters' })
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Price must be a valid number with up to 2 decimal places' })
  @Min(0, { message: 'Price must be at least 0' })
  @Max(99999999.99, { message: 'Price must not exceed 99999999.99' })
  price?: number;

  @IsOptional()
  @IsEnum(['apartment', 'villa', 'house', 'loft', 'office', 'commercial', 'land'], {
    message: 'Property type must be one of: apartment, villa, house, loft, office, commercial, land'
  })
  propertyType?: PropertyType;

  @IsOptional()
  @IsEnum(['sale', 'rent'], {
    message: 'Listing type must be either sale or rent'
  })
  listingType?: ListingType;

  @IsOptional()
  @IsEnum(['active', 'pending', 'sold', 'rented', 'withdrawn'], {
    message: 'Status must be one of: active, pending, sold, rented, withdrawn'
  })
  status?: PropertyStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Rooms must be an integer' })
  @Min(0, { message: 'Rooms must be at least 0' })
  rooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Bedrooms must be an integer' })
  @Min(0, { message: 'Bedrooms must be at least 0' })
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Bathrooms must be an integer' })
  @Min(0, { message: 'Bathrooms must be at least 0' })
  bathrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Area must be a valid number with up to 2 decimal places' })
  @Min(0, { message: 'Area must be at least 0' })
  @Max(999999.99, { message: 'Area must not exceed 999999.99' })
  area?: number;

  @IsOptional()
  @IsString({ message: 'Floor must be a string' })
  @MaxLength(50, { message: 'Floor must not exceed 50 characters' })
  floor?: string;

  @IsOptional()
  @IsEnum(['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G'], {
    message: 'Energy class must be one of: A+, A, B, C, D, E, F, G'
  })
  energyClass?: EnergyClass;

  @IsOptional()
  @IsBoolean({ message: 'hasElevator must be a boolean' })
  hasElevator?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'hasBalcony must be a boolean' })
  hasBalcony?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'hasGarden must be a boolean' })
  hasGarden?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'hasParking must be a boolean' })
  hasParking?: boolean;

  @IsOptional()
  @IsArray({ message: 'Features must be an array' })
  @IsString({ each: true, message: 'Each feature must be a string' })
  @MaxLength(100, { each: true, message: 'Each feature must not exceed 100 characters' })
  features?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => Address)
  address?: Address;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeoJSONPoint)
  location?: GeoJSONPoint;
}

