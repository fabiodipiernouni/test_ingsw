import { SavedSearchFilters } from '../dto/SavedSearchFilters';

export interface SavedSearchModel {
  id: string;
  userId: string;
  name: string;
  filters: SavedSearchFilters;
  isNotificationEnabled: boolean;
  lastSearchedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
