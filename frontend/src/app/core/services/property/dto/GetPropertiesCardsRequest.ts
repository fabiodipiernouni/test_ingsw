import { GeoSearchPropertiesFilters } from './GeoSearchPropertiesFilters';
import { PagedRequest } from '@service-shared/dto/pagedRequest';
import {SearchPropertiesFilter} from '@core/services/property/dto/SearchPropertiesFilter';

export interface GetPropertiesCardsRequest {
  filters?: SearchPropertiesFilter;
  geoFilters?: GeoSearchPropertiesFilters;
  pagedRequest?: PagedRequest;
  status?: string; // ACTIVE, INACTIVE, PENDING, etc.
  agencyId?: string;
}
