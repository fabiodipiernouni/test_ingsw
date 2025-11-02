import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PagedRequest } from '@shared/dto/pagedRequest';

export class GetAgentsRequest {
  @IsOptional()
  @ValidateNested()
  @Type(() => PagedRequest)
  pagedRequest?: PagedRequest;
}
