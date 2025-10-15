import { IsOptional, IsString, IsNumber, Min, Max  } from 'class-validator';
import { Type } from 'class-transformer';
import { ListingType, PropertyType } from '@property/models/types';

export class SearchPropertiesFilters {
  @IsOptional()
  @IsString()
  location?: string;           // Città o CAP

  @IsOptional()
  propertyType?: PropertyType;        // APARTMENT, HOUSE, VILLA, OFFICE, COMMERCIAL, GARAGE, LAND

  @IsOptional()
  listingType?: ListingType;         // SALE, RENT

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(9990000)
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10000000)
  priceMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rooms?: number;               // numero minimo di stanze

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bedrooms?: number;            // numero minimo di camere

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bathrooms?: number;           // numero minimo di bagni

  @IsOptional()
  hasElevator?: boolean;

  @IsOptional()
  hasBalcony?: boolean;

  @IsOptional()
  hasGarden?: boolean;

  @IsOptional()
  hasParking?: boolean;
}