import { GeoJSONPoint, isValidGeoJSONPoint } from '@shared/types/geojson.types';
import { IsNotEmpty, IsNumber, IsPositive, Max, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RadiusSearch {

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Object)
  @ValidateIf((o) => isValidGeoJSONPoint(o.center), { message: 'Center must be a valid GeoJSON Point' })
  center: GeoJSONPoint;     // punto centrale della ricerca in formato GeoJSON

  @IsNumber()
  @IsPositive()
  @Max(500)
  radius: number;           // raggio in kilometers (max 500km)

}