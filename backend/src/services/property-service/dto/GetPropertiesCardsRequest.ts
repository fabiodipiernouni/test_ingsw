import { SearchPropertiesFilters } from '@property/dto/SearchPropertiesFilters';
import { PagedRequest } from '@shared/dto/pagedRequest';
import { PropertyStatus } from '@property/models/types';
import { IsOptional, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { GeoSearchPropertiesFilters } from '@property/dto/GeoSearchPropertiesFilters';

export class GetPropertiesCardsRequest {
  @ValidateNested()
  @Type(() => SearchPropertiesFilters)
  filters!: SearchPropertiesFilters;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeoSearchPropertiesFilters)
  geoFilters?: GeoSearchPropertiesFilters;

  @IsOptional()
  @ValidateNested()
  @Type(() => PagedRequest)
  pagedRequest?: PagedRequest;

  @IsOptional()
  status?: PropertyStatus;

  @IsOptional()
  @IsUUID('4', { message: 'Agency ID must be a valid UUID' })
  agencyId?: string;
}