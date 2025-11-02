import {GeoSearchPropertiesFilters} from '@core/services/property/dto/GeoSearchPropertiesFilters';
import {PropertyStatus} from '@core/services/property/models/types';
import {SearchPropertiesFilters} from '@core/services/property/dto/SearchPropertiesFilters';

export interface GetGeoPropertiesCardsRequest {
  filters?: SearchPropertiesFilters;
  geoFilters?: GeoSearchPropertiesFilters;
  status?: PropertyStatus;
  agencyId?: string;
  agentId?: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}
