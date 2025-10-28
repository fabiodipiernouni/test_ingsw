import { SavedSearchFilters } from './SavedSearchFilters';

export interface SavedSearchResponse {
  id: string;
  userId: string;
  name: string;
  filters: SavedSearchFilters;
  isNotificationEnabled: boolean;
  lastSearchedAt?: string;
  createdAt: string;
  updatedAt: string;
}
