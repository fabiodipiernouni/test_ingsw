import { Property, SavedSearch, Notification, User } from '@shared/database/models';
import { Op } from 'sequelize';
import { Helper } from '@services/property-service/utils/helper';
import { propertyMatcherWorkerOptions } from '../config/worker.config';
import logger from '@shared/utils/logger';

/**
 * Servizio per il matching tra proprietà e ricerche salvate
 * 
 * Questo servizio si occupa di:
 * 1. Recuperare le proprietà create in un determinato periodo
 * 2. Recuperare le ricerche salvate con notifiche attive
 * 3. Matchare le proprietà con le ricerche salvate
 * 4. Creare le notifiche per gli utenti
 */
export class PropertyMatcherService {
  /**
   * Trova tutte le ricerche salvate con notifiche attive
   */
  async getActiveSavedSearches(offset: number = 0, limit: number = 50): Promise<SavedSearch[]> {
    return await SavedSearch.findAll({
      where: {
        isNotificationEnabled: true
      },
      offset,
      limit,
      order: [['createdAt', 'ASC']]
    });
  }

  /**
   * Controlla se esistono proprietà che matchano una ricerca salvata
   * Più efficiente: si ferma al primo match invece di caricare tutte le proprietà
   * 
   * @param savedSearch La ricerca salvata da processare
   */
  async hasMatchingProperties(
    savedSearch: SavedSearch
  ): Promise<boolean> {

    // Costruisci la whereClause base per le date
    const whereClause: any = {
      createdAt: {
        [Op.gte]: savedSearch.lastSearchedAt
      },
      // Solo proprietà attive
      status: savedSearch.status || 'active'
    };

    // Applica i filtri della ricerca salvata usando gli helper esistenti
    const filters = savedSearch.getFiltersObject();
    
    if (filters.filters) {
      Helper.applySearchFilters(whereClause, filters.filters);
    }

    if (filters.geoFilters) {
      Helper.applyGeoSearchFilters(whereClause, filters.geoFilters);
    }

    // Filtro per agenzia se specificato
    const includeClause: any[] = [
      {
        association: 'agent',
        attributes: ['id'], // Solo l'id, tanto ci interessa solo sapere se esiste
        required: filters.agencyId ? true : false
      }
    ];

    if (filters.agencyId) {
      includeClause[0].where = { agencyId: filters.agencyId };
    }

    try {
      // Controlla se esiste almeno una proprietà (veloce: si ferma al primo match)
      const firstMatch = await Property.findOne({
        where: whereClause,
        include: includeClause,
        attributes: ['id'], // Solo l'id per performance
        raw: true
      });

      if (!firstMatch) {
        logger.debug(`No matching properties for saved search ${savedSearch.id}`);
        return false;
      }

      logger.debug(`Found matching properties for saved search ${savedSearch.id}`, {
        savedSearchId: savedSearch.id,
        userId: savedSearch.userId,
        searchCreatedAt: savedSearch.createdAt.toISOString(),
        lastSearchedAt: savedSearch.lastSearchedAt.toISOString()
      });

      return true;
    } catch (error) {
      logger.error(`Error checking matching properties for saved search ${savedSearch.id}:`, error);
      throw error;
    }
  }

  /**
   * Crea una singola notifica aggregata per una ricerca salvata con match
   */
  async createNotificationForSavedSearch(
    savedSearch: SavedSearch
  ): Promise<boolean> {

    try {
      // Verifica se esiste già una notifica recente per questa ricerca salvata
      // (per evitare di spammare l'utente se il worker viene eseguito più volte)
      const recentNotification = await Notification.findOne({
        where: {
          userId: savedSearch.userId,
          type: 'new_property_match_saved_search',
          actionUrl: {
            [Op.like]: `%/search?savedSearchId=${savedSearch.id}%`
          },
          createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Ultime 24 ore
          }
        }
      });

      if (recentNotification) {
        logger.debug(`Recent notification already exists for saved search ${savedSearch.id} and user ${savedSearch.userId}`);
        return false;
      }

      // Crea il messaggio (semplice: ci sono nuove proprietà)
      const title = `Nuove proprietà per "${savedSearch.name}"`;
      const message = `Sono state pubblicate nuove proprietà che corrispondono ai criteri della tua ricerca salvata "${savedSearch.name}". Clicca per visualizzarle.`;

      // Crea la notifica
      await Notification.create({
        userId: savedSearch.userId,
        type: 'new_property_match_saved_search',
        title,
        message,
        actionUrl: `/search?filters=${encodeURIComponent(JSON.stringify(savedSearch.getFiltersObject()))}`,
        imageUrl: undefined,
        readAt: null,
        sentAt: null // Sarà gestito dall'email-worker
      });

      logger.debug(`Created notification for saved search ${savedSearch.id}`);
      return true;
    } catch (error) {
      logger.error(`Error creating notification for saved search ${savedSearch.id}:`, error);
      return false;
    }
  }

  /**
   * Aggiorna la data dell'ultima ricerca per una saved search
   */
  async updateLastSearchedAt(savedSearchId: string): Promise<void> {
    try {
      await SavedSearch.update(
        { lastSearchedAt: new Date() },
        { where: { id: savedSearchId } }
      );
    } catch (error) {
      logger.error(`Error updating lastSearchedAt for saved search ${savedSearchId}:`, error);
      // Non lanciare errore, è solo un aggiornamento di tracking
    }
  }

  /**
   * Processa una singola ricerca salvata
   * 
   * @param savedSearch La ricerca salvata da processare
   * @param startDate Data di inizio (opzionale, default: lastSearchedAt o createdAt della ricerca)
   * @param endDate Data di fine (opzionale, default: ora)
   */
  async processSavedSearch(
    savedSearch: SavedSearch
  ): Promise<{ savedSearchId: string; hasMatches: boolean; notificationCreated: boolean }> {
    const startTime = Date.now();

    try {
      // Controlla se ci sono proprietà che matchano (efficiente: si ferma al primo match)
      const hasMatches = await this.hasMatchingProperties(
        savedSearch
      );

      let notificationCreated = false;

      // Se ci sono match, crea UNA notifica aggregata
      if (hasMatches) {
        notificationCreated = await this.createNotificationForSavedSearch(savedSearch);
      }

      // Aggiorna lastSearchedAt solo se abbiamo effettivamente processato la ricerca
      await this.updateLastSearchedAt(savedSearch.id);

      const duration = Date.now() - startTime;

      logger.info(`Processed saved search ${savedSearch.id} in ${duration}ms`, {
        savedSearchId: savedSearch.id,
        userId: savedSearch.userId,
        userName: savedSearch.user?.firstName,
        searchName: savedSearch.name,
        hasMatches,
        notificationCreated,
        durationMs: duration
      });

      return {
        savedSearchId: savedSearch.id,
        hasMatches,
        notificationCreated
      };
    } catch (error) {
      logger.error(`Error processing saved search ${savedSearch.id}:`, error);
      throw error;
    }
  }
}

export const propertyMatcherService = new PropertyMatcherService();
