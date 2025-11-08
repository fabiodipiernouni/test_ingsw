import { SavedSearchFilters } from './SavedSearchFilters';

export interface SavedSearchCreateDto {
  name: string; // Nome generato dal frontend
  filters: SavedSearchFilters;
}
