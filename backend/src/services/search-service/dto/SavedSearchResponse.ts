import { SavedSearchFilters } from './SavedSearchFilters';

export class SavedSearchResponse {
  id: string;
  userId: string;
  name: string;
  filters: SavedSearchFilters;
  isNotificationEnabled: boolean;
  lastSearchedAt: string;
  createdAt: string;
  updatedAt: string;
}
