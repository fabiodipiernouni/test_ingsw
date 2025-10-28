import { GeoJSONPoint } from '@shared/types/geojson.types';
import { IsOptional, IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RadiusSearch } from '@shared/dto/RadiusSearch';

export class GeoSearchPropertiesFilters {
  @IsOptional()
  @IsArray({ message: 'Il poligono deve essere un array' })
  @ArrayMinSize(3, { message: 'Il poligono deve contenere almeno 3 punti' })
  @ArrayMaxSize(100, { message: 'Il poligono non può contenere più di 100 punti' })
  polygon?: GeoJSONPoint[];

  @IsOptional()
  @ValidateNested({ message: 'La ricerca per raggio non è valida' })
  @Type(() => RadiusSearch)
  radiusSearch?: RadiusSearch;
}
