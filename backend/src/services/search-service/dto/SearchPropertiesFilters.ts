import { IsOptional, IsString, IsNumber, Min, Max, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { LISTING_TYPES, ListingType, PROPERTY_TYPES, PropertyType } from '@shared/types/property.types';
import { Trim } from '@shared/decorators';

export class SearchPropertiesFilters {
  @Trim()
  @IsOptional()
  @IsString({ message: 'La località deve essere una stringa' })
  location?: string;

  @IsOptional()
  @IsIn(PROPERTY_TYPES, {
    message: 'Il tipo di immobile deve essere uno tra: ' + PROPERTY_TYPES.join(', '),
  })
  propertyType?: PropertyType;

  @IsOptional()
  @IsIn(LISTING_TYPES, { 
    message: 'Il tipo di annuncio deve essere uno tra: ' + LISTING_TYPES.join(', ')
  })
  listingType?: ListingType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Il prezzo minimo deve essere un numero' })
  @Min(0, { message: 'Il prezzo minimo non può essere negativo' })
  @Max(9990000, { message: 'Il prezzo minimo non può superare 9.990.000' })
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Il prezzo massimo deve essere un numero' })
  @Min(0, { message: 'Il prezzo massimo non può essere negativo' })
  @Max(10000000, { message: 'Il prezzo massimo non può superare 10.000.000' })
  priceMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Il numero di stanze deve essere un numero' })
  @Min(0, { message: 'Il numero di stanze non può essere negativo' })
  rooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Il numero di camere da letto deve essere un numero' })
  @Min(0, { message: 'Il numero di camere da letto non può essere negativo' })
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Il numero di bagni deve essere un numero' })
  @Min(0, { message: 'Il numero di bagni non può essere negativo' })
  bathrooms?: number;

  @IsOptional()
  @IsBoolean({ message: 'Il campo ascensore deve essere un valore booleano' })
  hasElevator?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Il campo balcone deve essere un valore booleano' })
  hasBalcony?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Il campo giardino deve essere un valore booleano' })
  hasGarden?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Il campo parcheggio deve essere un valore booleano' })
  hasParking?: boolean;
}
