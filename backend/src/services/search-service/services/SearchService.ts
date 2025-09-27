import { Op, Sequelize } from 'sequelize';
import { Property, SearchHistory, SavedSearch, User } from '@shared/database/models';
import { 
  SearchFilters, 
  SearchRequest, 
  SearchResult, 
  PropertyResult,
  SavedSearch as SavedSearchType,
  SavedSearchCreate,
  SavedSearchUpdate,
  SearchHistory as SearchHistoryType,
  SearchHistoryResponse,
  SearchSource
} from '../models/types';
import logger from '@shared/utils/logger';

// Custom error classes
class ValidationError extends Error {
  public details: any;
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class SearchService {
  /**
   * Esegue ricerca avanzata delle proprietà
   */
  async searchProperties(searchRequest: SearchRequest, userId?: string): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Executing property search', { 
        filters: searchRequest, 
        userId: userId || 'anonymous' 
      });

      // Validazione parametri
      this.validateSearchRequest(searchRequest);

      // Costruisce la query di ricerca
      const { whereClause, orderClause } = this.buildSearchQuery(searchRequest);
      
      // Parametri di paginazione
      const page = searchRequest.page || 1;
      const limit = Math.min(searchRequest.limit || 20, 100);
      const offset = (page - 1) * limit;

      // Esecuzione query con conteggio
      const { rows: properties, count: totalCount } = await Property.findAndCountAll({
        where: whereClause,
        include: [
          {
            association: 'agent',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          },
          {
            association: 'images',
            attributes: ['id', 'url', 'alt', 'isPrimary', 'order'],
            where: { isPrimary: true },
            required: false
          }
        ],
        order: orderClause,
        limit,
        offset,
        distinct: true // Per evitare duplicati con le JOIN
      });

      // Calcolo delle distanze se è una ricerca geografica
      const processedProperties = await this.calculateDistances(properties, searchRequest);

      // Salva la ricerca nella storia se l'utente è autenticato
      if (userId) {
        await this.saveSearchHistory(userId, searchRequest, totalCount, Date.now() - startTime);
      }

      const searchTime = Date.now() - startTime;
      const totalPages = Math.ceil(totalCount / limit);

      logger.info('Search completed', { 
        totalCount, 
        searchTime, 
        userId: userId || 'anonymous' 
      });

      return {
        properties: processedProperties,
        totalCount,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        searchTime,
        appliedFilters: this.sanitizeFilters(searchRequest)
      };

    } catch (error) {
      logger.error('Error in property search:', error);
      throw error;
    }
  }

  /**
   * Costruisce le clausole WHERE e ORDER per la query di ricerca
   */
  private buildSearchQuery(filters: SearchRequest): { whereClause: any, orderClause: any[] } {
    const whereClause: any = {
      isActive: true,
      status: 'active'
    };

    // Text search - cerca in title e description
    if (filters.query) {
      whereClause[Op.or] = [
        Sequelize.where(Sequelize.fn('UPPER', Sequelize.col('title')), 'LIKE', `%${filters.query.toUpperCase()}%`),
        Sequelize.where(Sequelize.fn('UPPER', Sequelize.col('description')), 'LIKE', `%${filters.query.toUpperCase()}%`)
      ];
    }

    // Location filters
    if (filters.city) {
      whereClause.city = Sequelize.where(Sequelize.fn('UPPER', Sequelize.col('city')), 'LIKE', `%${filters.city.toUpperCase()}%`);
    }
    if (filters.province) {
      whereClause.province = Sequelize.where(Sequelize.fn('UPPER', Sequelize.col('province')), 'LIKE', `%${filters.province.toUpperCase()}%`);
    }
    if (filters.zipCode) {
      whereClause.zipCode = filters.zipCode;
    }

    // Property type and listing
    if (filters.propertyType) {
      whereClause.propertyType = filters.propertyType;
    }
    if (filters.listingType) {
      whereClause.listingType = filters.listingType;
    }

    // Price range
    if (filters.priceMin !== undefined) {
      whereClause.price = { ...whereClause.price, [Op.gte]: filters.priceMin };
    }
    if (filters.priceMax !== undefined) {
      whereClause.price = { ...whereClause.price, [Op.lte]: filters.priceMax };
    }

    // Size filters
    if (filters.bedrooms !== undefined) {
      whereClause.bedrooms = { [Op.gte]: filters.bedrooms };
    }
    if (filters.bathrooms !== undefined) {
      whereClause.bathrooms = { [Op.gte]: filters.bathrooms };
    }
    if (filters.areaMin !== undefined) {
      whereClause.area = { ...whereClause.area, [Op.gte]: filters.areaMin };
    }
    if (filters.areaMax !== undefined) {
      whereClause.area = { ...whereClause.area, [Op.lte]: filters.areaMax };
    }

    // Property characteristics
    if (filters.energyClass) {
      whereClause.energyClass = filters.energyClass;
    }
    if (filters.hasElevator !== undefined) {
      whereClause.hasElevator = filters.hasElevator;
    }
    if (filters.hasBalcony !== undefined) {
      whereClause.hasBalcony = filters.hasBalcony;
    }
    if (filters.hasGarden !== undefined) {
      whereClause.hasGarden = filters.hasGarden;
    }
    if (filters.hasParking !== undefined) {
      whereClause.hasParking = filters.hasParking;
    }

    // Geographic search - raggio di ricerca
    if (filters.centerLat && filters.centerLng && filters.radius) {
      // Calcolo approssimativo del bounding box per performance
      const latDelta = filters.radius / 111; // ~111 km per grado di latitudine
      const lngDelta = filters.radius / (111 * Math.cos(filters.centerLat * Math.PI / 180));
      
      whereClause.latitude = {
        [Op.between]: [filters.centerLat - latDelta, filters.centerLat + latDelta]
      };
      whereClause.longitude = {
        [Op.between]: [filters.centerLng - lngDelta, filters.centerLng + lngDelta]
      };
    }

    // Features - contiene almeno una delle feature richieste
    if (filters.features && filters.features.length > 0) {
      whereClause[Op.and] = filters.features.map(feature => {
        const escapedFeature = feature.replace(/'/g, "''"); // Escape single quotes for SQL
        // Use Oracle JSON_EXISTS with proper column reference
        return Sequelize.literal(`JSON_EXISTS("Property"."features", '$[*]?(@ == "${escapedFeature}")')`);
      });
    }

    // Order clause
    const orderClause = this.buildOrderClause(filters.sortBy || 'relevance');

    return { whereClause, orderClause };
  }

  /**
   * Costruisce la clausola ORDER BY
   */
  private buildOrderClause(sortBy: string): any[] {
    switch (sortBy) {
      case 'price_asc':
        return [['price', 'ASC']];
      case 'price_desc':
        return [['price', 'DESC']];
      case 'area_asc':
        return [['area', 'ASC']];
      case 'area_desc':
        return [['area', 'DESC']];
      case 'date_desc':
        return [['createdAt', 'DESC']];
      case 'relevance':
      default:
        return [['views', 'DESC'], ['createdAt', 'DESC']];
    }
  }

  /**
   * Calcola le distanze geografiche se è una ricerca per raggio
   */
  private async calculateDistances(properties: Property[], filters: SearchRequest): Promise<PropertyResult[]> {
    return properties.map(property => {
      const propertyData = this.formatPropertyResult(property);
      
      // Calcola distanza se i parametri geografici sono presenti
      if (filters.centerLat && filters.centerLng) {
        propertyData.distance = this.calculateHaversineDistance(
          filters.centerLat,
          filters.centerLng,
          property.latitude,
          property.longitude
        );
      }

      return propertyData;
    });
  }

  /**
   * Calcola la distanza tra due punti geografici (formula di Haversine)
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raggio della Terra in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Formatta il risultato della proprietà per l'API
   */
  private formatPropertyResult(property: Property): PropertyResult {
    return {
      id: property.id,
      title: property.title,
      description: property.description,
      price: property.price,
      propertyType: property.propertyType,
      listingType: property.listingType,
      status: property.status,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      floor: property.floor,
      energyClass: property.energyClass,
      hasElevator: property.hasElevator,
      hasBalcony: property.hasBalcony,
      hasGarden: property.hasGarden,
      hasParking: property.hasParking,
      features: property.features,
      address: {
        street: property.street,
        city: property.city,
        province: property.province,
        zipCode: property.zipCode,
        country: property.country
      },
      location: {
        latitude: property.latitude,
        longitude: property.longitude
      },
      images: property.images || [],
      agentId: property.agentId,
      agent: property.agent ? {
        id: property.agent.id,
        firstName: property.agent.firstName,
        lastName: property.agent.lastName,
        email: property.agent.email,
        phone: property.agent.phone
      } : undefined,
      isActive: property.isActive,
      views: property.views,
      favorites: property.favorites,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString()
    };
  }

  /**
   * Salva la ricerca nella storia dell'utente
   */
  private async saveSearchHistory(
    userId: string, 
    filters: SearchRequest, 
    resultCount: number, 
    executionTime: number,
    source: SearchSource = 'web'
  ): Promise<void> {
    try {
      await SearchHistory.create({
        userId,
        filters: this.sanitizeFilters(filters),
        resultCount,
        executionTime,
        source,
        searchedAt: new Date()
      });
    } catch (error) {
      logger.error('Error saving search history:', error);
      // Non bloccante - la ricerca continua anche se il salvataggio fallisce
    }
  }

  /**
   * Rimuove campi di paginazione dai filtri per il salvataggio
   */
  private sanitizeFilters(filters: SearchRequest): SearchFilters {
    const { page, limit, ...searchFilters } = filters;
    return searchFilters;
  }

  /**
   * Formatta la risposta di una ricerca salvata
   */
  private formatSavedSearchResponse(savedSearch: SavedSearch): SavedSearchType {
    return {
      id: savedSearch.id,
      userId: savedSearch.userId,
      name: savedSearch.name,
      filters: savedSearch.filters as SearchFilters,
      isNotificationEnabled: savedSearch.isNotificationEnabled,
      lastResultCount: savedSearch.lastResultCount,
      hasNewResults: savedSearch.hasNewResults,
      createdAt: savedSearch.createdAt.toISOString(),
      updatedAt: savedSearch.updatedAt.toISOString()
    };
  }

  /**
   * Formatta la risposta dello storico ricerche
   */
  private formatSearchHistoryResponse(searchHistory: SearchHistory): SearchHistoryType {
    return {
      id: searchHistory.id,
      userId: searchHistory.userId,
      filters: searchHistory.filters as SearchFilters,
      resultCount: searchHistory.resultCount,
      searchedAt: searchHistory.searchedAt.toISOString(),
      source: searchHistory.source,
      executionTime: searchHistory.executionTime || 0
    };
  }

  /**
   * Validazione della richiesta di ricerca
   */
  private validateSearchRequest(request: SearchRequest): void {
    const errors: string[] = [];

    // Validazione paginazione
    if (request.page && request.page < 1) {
      errors.push('Page must be greater than 0');
    }
    if (request.limit && (request.limit < 1 || request.limit > 100)) {
      errors.push('Limit must be between 1 and 100');
    }

    // Validazione range prezzo
    if (request.priceMin && request.priceMax && request.priceMin > request.priceMax) {
      errors.push('Price minimum cannot be greater than maximum');
    }

    // Validazione range area
    if (request.areaMin && request.areaMax && request.areaMin > request.areaMax) {
      errors.push('Area minimum cannot be greater than maximum');
    }

    // Validazione search geografica
    if (request.centerLat && (request.centerLat < -90 || request.centerLat > 90)) {
      errors.push('Latitude must be between -90 and 90');
    }
    if (request.centerLng && (request.centerLng < -180 || request.centerLng > 180)) {
      errors.push('Longitude must be between -180 and 180');
    }
    if (request.radius && (request.radius < 0.1 || request.radius > 100)) {
      errors.push('Radius must be between 0.1 and 100 km');
    }

    // Geographic search richiede tutti i parametri
    const hasGeoParams = request.centerLat || request.centerLng || request.radius;
    if (hasGeoParams && (!request.centerLat || !request.centerLng || !request.radius)) {
      errors.push('Geographic search requires centerLat, centerLng, and radius');
    }

    if (errors.length > 0) {
      throw new ValidationError('Search validation failed', { errors });
    }
  }

  /**
   * Ottieni le ricerche salvate dell'utente
   */
  async getUserSavedSearches(userId: string): Promise<SavedSearchType[]> {
    try {
      const savedSearches = await SavedSearch.getUserActiveSavedSearches(userId);
      return savedSearches.map(search => this.formatSavedSearchResponse(search));
    } catch (error) {
      logger.error('Error getting user saved searches:', error);
      throw error;
    }
  }

  /**
   * Salva una nuova ricerca
   */
  async createSavedSearch(userId: string, searchData: SavedSearchCreate): Promise<SavedSearchType> {
    try {
      const savedSearch = await SavedSearch.create({
        userId,
        name: searchData.name,
        filters: searchData.filters,
        isNotificationEnabled: searchData.isNotificationEnabled ?? true,
        lastResultCount: 0,
        hasNewResults: false
      });

      return this.formatSavedSearchResponse(savedSearch);
    } catch (error) {
      logger.error('Error creating saved search:', error);
      throw error;
    }
  }

  /**
   * Aggiorna una ricerca salvata
   */
  async updateSavedSearch(userId: string, searchId: string, updateData: SavedSearchUpdate): Promise<SavedSearchType> {
    try {
      const savedSearch = await SavedSearch.findOne({
        where: {
          id: searchId,
          userId,
          isActive: true
        }
      });

      if (!savedSearch) {
        throw new NotFoundError('Saved search not found or access denied');
      }

      await savedSearch.update(updateData);
      return this.formatSavedSearchResponse(savedSearch);
    } catch (error) {
      logger.error('Error updating saved search:', error);
      throw error;
    }
  }

  /**
   * Elimina una ricerca salvata (soft delete)
   */
  async deleteSavedSearch(userId: string, searchId: string): Promise<void> {
    try {
      const savedSearch = await SavedSearch.findOne({
        where: {
          id: searchId,
          userId,
          isActive: true
        }
      });

      if (!savedSearch) {
        throw new NotFoundError('Saved search not found or access denied');
      }

      await savedSearch.update({ isActive: false });
    } catch (error) {
      logger.error('Error deleting saved search:', error);
      throw error;
    }
  }

  /**
   * Ottieni lo storico ricerche dell'utente con paginazione
   */
  async getUserSearchHistory(userId: string, page: number = 1, limit: number = 50): Promise<SearchHistoryResponse> {
    try {
      const offset = (page - 1) * limit;

      const { rows: searchHistory, count: totalCount } = await SearchHistory.findAndCountAll({
        where: { userId },
        order: [['searchedAt', 'DESC']],
        limit,
        offset
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        history: searchHistory.map(search => this.formatSearchHistoryResponse(search)),
        totalCount,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };
    } catch (error) {
      logger.error('Error getting user search history:', error);
      throw error;
    }
  }

  /**
   * Ottieni suggerimenti di ricerca
   */
  async getSearchSuggestions(query: string, type: string = 'location'): Promise<string[]> {
    if (query.length < 2) {
      return [];
    }

    try {
      let suggestions: string[] = [];

      switch (type) {
        case 'location':
          // Cerca città e province uniche
          const locations = await Property.findAll({
            attributes: [
              [Sequelize.fn('DISTINCT', Sequelize.col('city')), 'city'],
              'province'
            ],
            where: {
              [Op.or]: [
                Sequelize.where(Sequelize.fn('UPPER', Sequelize.col('city')), 'LIKE', `%${query.toUpperCase()}%`),
                Sequelize.where(Sequelize.fn('UPPER', Sequelize.col('province')), 'LIKE', `%${query.toUpperCase()}%`)
              ],
              isActive: true
            },
            limit: 10,
            raw: true
          });
          
          suggestions = locations.map((loc: any) => 
            loc.province === loc.city ? loc.city : `${loc.city}, ${loc.province}`
          );
          break;

        case 'property_type':
          const propertyTypes = ['apartment', 'villa', 'house', 'loft', 'office', 'commercial', 'land'];
          suggestions = propertyTypes.filter(type => 
            type.toLowerCase().includes(query.toLowerCase())
          );
          break;

        case 'feature':
          // Cerca nelle features più comuni
          const validFeatures = ['aria condizionata', 'balcone', 'giardino', 'piscina', 'garage', 'ascensore', 'ristrutturato'];
          suggestions = validFeatures.filter(feature => 
            feature.toLowerCase().includes(query.toLowerCase())
          );
          break;
      }

      return suggestions;
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      return [];
    }
  }
}

export const searchService = new SearchService();