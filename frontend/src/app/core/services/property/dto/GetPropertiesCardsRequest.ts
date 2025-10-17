import { SearchPropertyFilter } from './SearchPropertyFilter';
import { GeoSearchPropertiesFilters } from './GeoSearchPropertiesFilters';
import { PagedRequest } from '@service-shared/dto/pagedRequest';

export interface GetPropertiesCardsRequest {
  filters?: SearchPropertyFilter;
  geoFilters?: GeoSearchPropertiesFilters;
  pagedRequest?: PagedRequest;
  status?: string; // ACTIVE, INACTIVE, PENDING, etc.
  agencyId?: string;
}
