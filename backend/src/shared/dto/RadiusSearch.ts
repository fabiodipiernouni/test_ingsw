import { GeoJSONPoint } from '@shared/types/geojson.types';
import { IsNotEmpty, IsNumber, IsPositive, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RadiusSearch {

  @IsNotEmpty({ message: 'Center is required' })
  @ValidateNested()
  @Type(() => GeoJSONPoint)
  center!: GeoJSONPoint;     // punto centrale della ricerca in formato GeoJSON

  @IsNotEmpty({ message: 'Radius is required' })
  @IsNumber({}, { message: 'Radius must be a number' })
  @IsPositive({ message: 'Radius must be positive' })
  @Max(500, { message: 'Radius cannot exceed 500 km' })
  radius!: number;           // raggio in kilometers (max 500km)

}