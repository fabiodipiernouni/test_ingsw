import { SearchPropertiesFilters } from '@property/dto/SearchPropertiesFilters';
import { PagedRequest } from '@shared/dto/pagedRequest';
import { PropertyStatus } from '@shared/types/property.types';
import { IsOptional, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { GeoSearchPropertiesFilters } from '@property/dto/GeoSearchPropertiesFilters';

export class GetPropertiesCardsRequest {
  @ValidateNested()
  @Type(() => SearchPropertiesFilters)
  filters?: SearchPropertiesFilters;

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
  @IsUUID('all', { message: 'Agency ID must be a valid UUID' })
  agencyId?: string;

  @IsOptional()
  @IsUUID('all', { message: 'Agent ID must be a valid UUID' })
  agentId?: string;
}