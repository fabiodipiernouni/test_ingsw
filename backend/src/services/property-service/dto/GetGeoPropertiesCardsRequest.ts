import { SearchPropertiesFilters } from '@property/dto/SearchPropertiesFilters';
import { PropertyStatus } from '@shared/types/property.types';
import { IsOptional, ValidateNested, IsUUID, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { GeoSearchPropertiesFilters } from '@property/dto/GeoSearchPropertiesFilters';

export class GetGeoPropertiesCardsRequest {
  @ValidateNested()
  @Type(() => SearchPropertiesFilters)
  filters?: SearchPropertiesFilters;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeoSearchPropertiesFilters)
  geoFilters?: GeoSearchPropertiesFilters;

  @IsOptional()
  status?: PropertyStatus;

  @IsOptional()
  @IsUUID('all', { message: 'Agency ID must be a valid UUID' })
  agencyId?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Agent ID must be a valid UUID' })
  agentId?: string;

  @IsString()
  sortBy: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'], { message: 'Sort order must be ASC or DESC' })
  sortOrder: 'ASC' | 'DESC';
}