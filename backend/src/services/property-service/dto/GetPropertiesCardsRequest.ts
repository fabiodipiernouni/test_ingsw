import { SearchPropertyFilter } from '@property/dto/SearchPropertyFilter';
import { PagedRequest } from '@shared/dto/pagedRequest';
import { PropertyStatus } from '@property/models/types';

export interface GetPropertiesCardsRequest {
  filters: SearchPropertyFilter;
  pagedRequest?: PagedRequest;
  status?: PropertyStatus;
  agencyId?: string; // Filtra per agenzia specifica
}