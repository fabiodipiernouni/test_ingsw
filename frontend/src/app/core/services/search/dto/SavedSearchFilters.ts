import { SearchPropertiesFilters } from '@core/services/property/dto/SearchPropertiesFilters';
import { GeoSearchPropertiesFilters } from '@core/services/property/dto/GeoSearchPropertiesFilters';
import { PropertyStatus } from '@core/services/property/models/types';

export interface SavedSearchFilters {
  filters?: SearchPropertiesFilters;
  geoFilters?: GeoSearchPropertiesFilters;
  status?: PropertyStatus;
  agencyId?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
