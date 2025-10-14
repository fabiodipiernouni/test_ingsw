import { SearchPropertyFilter } from '@property/dto/SearchPropertyFilter';
import { PagedRequest } from '@shared/dto/pagedRequest';
import { PropertyStatus } from '@property/models/types';
import { IsOptional, ValidateNested, IsUUID, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class GetPropertiesCardsRequest {
  @ValidateNested()
  @Type(() => SearchPropertyFilter)
  filters!: SearchPropertyFilter;

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