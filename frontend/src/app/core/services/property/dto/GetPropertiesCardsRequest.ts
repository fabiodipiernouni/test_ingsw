import { GeoSearchPropertiesFilters } from './GeoSearchPropertiesFilters';
import { PagedRequest } from '@service-shared/dto/pagedRequest';
import {SearchPropertiesFilters} from '@core/services/property/dto/SearchPropertiesFilters';
import {PropertyStatus} from '@core/services/property/models/types';

export interface GetPropertiesCardsRequest {
  filters?: SearchPropertiesFilters;
  geoFilters?: GeoSearchPropertiesFilters;
  pagedRequest?: PagedRequest;
  status?: PropertyStatus;
  agencyId?: string;
  agentId?: string;
}
