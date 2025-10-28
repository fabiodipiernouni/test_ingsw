import { SavedSearch } from '@shared/database/models';
import { SavedSearchCreateDto } from '../dto/SavedSearchCreateDto';
import { SavedSearchResponse } from '../dto/SavedSearchResponse';
import { SavedSearchFilters } from '../dto/SavedSearchFilters';
import logger from '@shared/utils/logger';

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class SearchService {

  /**
   * Formatta la risposta di una ricerca salvata
   */
  private formatSavedSearchResponse(savedSearch: SavedSearch): SavedSearchResponse {
    const response: SavedSearchResponse = {
      id: savedSearch.id,
      userId: savedSearch.userId,
      name: savedSearch.name,
      filters: savedSearch.getFiltersObject(),
      isNotificationEnabled: savedSearch.isNotificationEnabled,
      createdAt: savedSearch.createdAt.toISOString(),
      updatedAt: savedSearch.updatedAt.toISOString()
    };

    // Aggiungi lastSearchedAt solo se presente
    if (savedSearch.lastSearchedAt) {
      response.lastSearchedAt = savedSearch.lastSearchedAt.toISOString();
    }

    return response;
  }

  /**
   * Genera automaticamente il nome per una ricerca salvata
   */
  /**
   * Ottieni le ricerche salvate dell'utente
   */
  async getUserSavedSearches(userId: string): Promise<SavedSearchResponse[]> {
    try {
      const savedSearches = await SavedSearch.getUserSavedSearches(userId);
      return savedSearches.map(search => this.formatSavedSearchResponse(search));
    } catch (error) {
      logger.error('Error getting user saved searches:', error);
      throw error;
    }
  }

  /**
   * Salva una nuova ricerca
   */
  async createSavedSearch(userId: string, searchData: SavedSearchCreateDto): Promise<SavedSearchResponse> {
    try {
      // Usa il nome ricevuto dal frontend (che include il nome dell'autocomplete)
      const name = searchData.name;
      
      const savedSearch = await SavedSearch.create({
        userId,
        name,
        // Basic filters
        location: searchData.filters.filters?.location,
        propertyType: searchData.filters.filters?.propertyType,
        listingType: searchData.filters.filters?.listingType,
        status: searchData.filters.status,
        agencyId: searchData.filters.agencyId,
        priceMin: searchData.filters.filters?.priceMin,
        priceMax: searchData.filters.filters?.priceMax,
        rooms: searchData.filters.filters?.rooms,
        bedrooms: searchData.filters.filters?.bedrooms,
        bathrooms: searchData.filters.filters?.bathrooms,
        hasElevator: searchData.filters.filters?.hasElevator,
        hasBalcony: searchData.filters.filters?.hasBalcony,
        hasGarden: searchData.filters.filters?.hasGarden,
        hasParking: searchData.filters.filters?.hasParking,
        // Geo filters
        polygon: searchData.filters.geoFilters?.polygon,
        radiusSearchCenter: searchData.filters.geoFilters?.radiusSearch?.center,
        radiusSearchRadius: searchData.filters.geoFilters?.radiusSearch?.radius,
        // Sorting
        sortBy: searchData.filters.sortBy || 'createdAt',
        sortOrder: searchData.filters.sortOrder || 'DESC',
        // Notification (always enabled by default)
        isNotificationEnabled: true,
        // Last searched date (initially equal to creation date)
        lastSearchedAt: new Date()
      });

      return this.formatSavedSearchResponse(savedSearch);
    } catch (error) {
      logger.error('Error creating saved search:', error);
      throw error;
    }
  }

  /**
   * Attiva/Disattiva le notifiche per una ricerca salvata
   */
  async toggleNotifications(userId: string, searchId: string, isNotificationEnabled: boolean): Promise<SavedSearchResponse> {
    try {
      const savedSearch = await SavedSearch.findOne({
        where: {
          id: searchId,
          userId
        }
      });

      if (!savedSearch) {
        throw new NotFoundError('Saved search not found or access denied');
      }

      await savedSearch.update({ isNotificationEnabled });
      return this.formatSavedSearchResponse(savedSearch);
    } catch (error) {
      logger.error('Error toggling notifications:', error);
      throw error;
    }
  }

  /**
   * Aggiorna il nome di una ricerca salvata
   */
  async updateSavedSearchName(userId: string, searchId: string, name: string): Promise<SavedSearchResponse> {
    try {
      const savedSearch = await SavedSearch.findOne({
        where: {
          id: searchId,
          userId
        }
      });

      if (!savedSearch) {
        throw new NotFoundError('Saved search not found or access denied');
      }

      await savedSearch.update({ name });
      return this.formatSavedSearchResponse(savedSearch);
    } catch (error) {
      logger.error('Error updating saved search name:', error);
      throw error;
    }
  }

  /**
   * Elimina una ricerca salvata (hard delete)
   */
  async deleteSavedSearch(userId: string, searchId: string): Promise<void> {
    try {
      const savedSearch = await SavedSearch.findOne({
        where: {
          id: searchId,
          userId
        }
      });

      if (!savedSearch) {
        throw new NotFoundError('Saved search not found or access denied');
      }

      await savedSearch.destroy();
    } catch (error) {
      logger.error('Error deleting saved search:', error);
      throw error;
    }
  }
}

export const searchService = new SearchService();

