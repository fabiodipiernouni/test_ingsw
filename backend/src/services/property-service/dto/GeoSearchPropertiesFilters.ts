import { GeoJSONPoint } from '@shared/types/geojson.types';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  ValidateIf,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { RadiusSearch } from '@shared/dto/RadiusSearch';

export class GeoSearchPropertiesFilters {
  // Geographic search - polygon search (ricerca per area poligonale)
  // Cerca tutte le proprietà all'interno di un'area poligonale definita da punti GeoJSON.
  // Il poligono viene chiuso automaticamente se necessario.
  // Minimo 3 punti richiesti. Non può essere usato insieme a radius search.

  @ValidateIf((o) => !o.radiusSearch, { message: 'polygon and radiusSearch cannot be used together' })
  @IsOptional()
  @IsArray({ message: 'polygon must be an array of GeoJSON points' })
  @ArrayMinSize(3, { message: 'polygon must have at least 3 points' })
  @ArrayMaxSize(100, { message: 'polygon can have at most 100 points' })
  @ValidateNested({ each: true })
  @Type(() => Object)
  polygon?: GeoJSONPoint[];

  // Geographic search - radius search (ricerca per raggio da punto centrale)
  // Cerca tutte le proprietà entro un raggio specificato da un punto centrale.
  // Non può essere usato insieme a polygon search (sono mutuamente esclusivi).
  @ValidateIf((o) => !o.polygon, { message: 'polygon and radiusSearch cannot be used together' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RadiusSearch)
  radiusSearch?: RadiusSearch;
}