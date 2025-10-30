import { Address } from '@shared/models/Address';
import { EnergyClass, ListingType, PropertyStatus, PropertyType } from '@property/models/types';
import { GeoJSONPoint } from '@shared/types/geojson.types';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsInt,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  Max,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';

export interface CreatePropertyRequestInterface {
  title: string;
  description: string;
  price: number;
  propertyType: PropertyType;
  listingType: ListingType;
  status: PropertyStatus;
  address: Address;
  rooms: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  floor?: string;
  energyClass?: EnergyClass;
  hasElevator?: boolean;
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasParking?: boolean;
  features?: string[];
  location: GeoJSONPoint;
}

export class CreatePropertyRequest implements CreatePropertyRequestInterface {
  @IsString({ message: 'Title must be a string' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  title: string;

  @IsString({ message: 'Description must be a string' })
  @MaxLength(4000, { message: 'Description must not exceed 4000 characters' })
  description: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Price must be a valid number with up to 2 decimal places' })
  @Min(0, { message: 'Price must be at least 0' })
  @Max(99999999.99, { message: 'Price must not exceed 99999999.99' })
  price: number;

  @IsEnum(['apartment', 'villa', 'house', 'loft', 'office', 'commercial', 'land'], {
    message: 'Property type must be one of: apartment, villa, house, loft, office, commercial, land'
  })
  propertyType: PropertyType;

  @IsEnum(['sale', 'rent'], {
    message: 'Listing type must be either sale or rent'
  })
  listingType: ListingType;

  @IsEnum(['active', 'pending', 'sold', 'rented', 'withdrawn'], {
    message: 'Status must be one of: active, pending, sold, rented, withdrawn'
  })
  status: PropertyStatus;

  @ValidateNested()
  @Type(() => Object)
  @IsObject({ message: 'Address must be a valid object' })
  address: Address;

  @Type(() => Number)
  @IsInt({ message: 'Rooms must be an integer' })
  @Min(0, { message: 'Rooms must be at least 0' })
  rooms: number;

  @Type(() => Number)
  @IsInt({ message: 'Bedrooms must be an integer' })
  @Min(0, { message: 'Bedrooms must be at least 0' })
  bedrooms: number;

  @Type(() => Number)
  @IsInt({ message: 'Bathrooms must be an integer' })
  @Min(0, { message: 'Bathrooms must be at least 0' })
  bathrooms: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Area must be a valid number with up to 2 decimal places' })
  @Min(0, { message: 'Area must be at least 0' })
  @Max(999999.99, { message: 'Area must not exceed 999999.99' })
  area: number;

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
  features?: string[];

  @ValidateNested()
  @Type(() => Object)
  @IsObject({ message: 'Location must be a valid GeoJSON Point object' })
  location: GeoJSONPoint;
}