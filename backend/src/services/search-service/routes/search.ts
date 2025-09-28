import express from 'express';
import { searchController } from '../controllers/SearchController';
import { authenticateToken, optionalAuth } from '@shared/middleware/auth';
import { 
  validateSearchRequest,
  validateSuggestionsRequest,
  validateUUID,
  validateSavedSearchData,
  validatePagination
} from '../middleware/validation';

const router = express.Router();

/**
 * @swagger
 * /search:
 *   post:
 *     summary: Ricerca proprietà con filtri avanzati
 *     description: |
 *       Effettua una ricerca avanzata di proprietà immobiliari utilizzando filtri multipli.
 *       Se l'utente è autenticato, la ricerca viene salvata nello storico.
 *     tags:
 *       - Search
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchRequest'
 *           examples:
 *             basic_search:
 *               summary: Ricerca base per città
 *               value:
 *                 city: "Milano"
 *                 propertyType: "apartment"
 *                 listingType: "sale"
 *                 page: 1
 *                 limit: 20
 *             advanced_search:
 *               summary: Ricerca avanzata con filtri multipli
 *               value:
 *                 query: "appartamento moderno"
 *                 city: "Milano"
 *                 propertyType: "apartment"
 *                 listingType: "sale"
 *                 priceMin: 200000
 *                 priceMax: 500000
 *                 bedrooms: 3
 *                 bathrooms: 2
 *                 areaMin: 80
 *                 areaMax: 150
 *                 hasElevator: true
 *                 hasParking: true
 *                 sortBy: "price_asc"
 *                 page: 1
 *                 limit: 20
 *             geographic_search:
 *               summary: Ricerca geografica con raggio
 *               value:
 *                 centerLat: 45.4642
 *                 centerLng: 9.1900
 *                 radius: 5
 *                 propertyType: "apartment"
 *                 listingType: "rent"
 *                 page: 1
 *                 limit: 20
 *     responses:
 *       200:
 *         description: Ricerca completata con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResult'
 *       400:
 *         description: Parametri di ricerca non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', optionalAuth, validateSearchRequest, searchController.searchProperties.bind(searchController));

/**
 * @swagger
 * /search/suggestions:
 *   get:
 *     summary: Ottieni suggerimenti di ricerca
 *     description: Restituisce suggerimenti basati su una query parziale per aiutare l'utente nella ricerca.
 *     tags:
 *       - Search Suggestions
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Testo parziale per cui ottenere suggerimenti
 *         example: "mil"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [location, property_type, feature]
 *           default: location
 *         description: Tipo di suggerimenti richiesti
 *         example: "location"
 *     responses:
 *       200:
 *         description: Suggerimenti recuperati con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SearchSuggestion'
 *       400:
 *         description: Query mancante o troppo corta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/suggestions', validateSuggestionsRequest, searchController.getSearchSuggestions.bind(searchController));

/**
 * @swagger
 * /search/saved:
 *   get:
 *     summary: Ottieni ricerche salvate dell'utente
 *     description: Restituisce tutte le ricerche salvate dall'utente autenticato.
 *     tags:
 *       - Saved Searches
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ricerche salvate recuperate con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SavedSearch'
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Salva una nuova ricerca
 *     description: Salva una ricerca con i suoi filtri per consentire all'utente di ripeterla facilmente.
 *     tags:
 *       - Saved Searches
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SavedSearchCreate'
 *           example:
 *             name: "Appartamenti Milano Centro"
 *             filters:
 *               city: "Milano"
 *               propertyType: "apartment"
 *               listingType: "sale"
 *               priceMin: 300000
 *               priceMax: 600000
 *               bedrooms: 3
 *             isNotificationEnabled: true
 *     responses:
 *       201:
 *         description: Ricerca salvata con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SavedSearch'
 *       400:
 *         description: Dati non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/saved', authenticateToken, validateSavedSearchData, searchController.saveSearch.bind(searchController));

/**
 * @swagger
 * /search/saved/{searchId}:
 *   put:
 *     summary: Aggiorna una ricerca salvata
 *     description: Modifica i parametri di una ricerca precedentemente salvata.
 *     tags:
 *       - Saved Searches
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: searchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID univoco della ricerca salvata
 *         example: 507f1f77bcf86cd799439011
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SavedSearchUpdate'
 *           example:
 *             name: "Appartamenti Milano Centro - Aggiornata"
 *             filters:
 *               city: "Milano"
 *               propertyType: "apartment"
 *               listingType: "sale"
 *               priceMin: 250000
 *               priceMax: 550000
 *               bedrooms: 2
 *             isNotificationEnabled: false
 *     responses:
 *       200:
 *         description: Ricerca aggiornata con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SavedSearch'
 *       400:
 *         description: Dati non validi o ID formato non corretto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Ricerca salvata non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Elimina una ricerca salvata
 *     description: Rimuove definitivamente una ricerca salvata.
 *     tags:
 *       - Saved Searches
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: searchId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID univoco della ricerca salvata
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Ricerca eliminata con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: ID formato non corretto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Ricerca salvata non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/saved/:searchId', authenticateToken, validateUUID('searchId'), validateSavedSearchData, searchController.updateSavedSearch.bind(searchController));
router.delete('/saved/:searchId', authenticateToken, validateUUID('searchId'), searchController.deleteSavedSearch.bind(searchController));

/**
 * @swagger
 * /search/history:
 *   get:
 *     summary: Ottieni storico ricerche dell'utente
 *     description: Restituisce lo storico paginato delle ricerche effettuate dall'utente autenticato.
 *     tags:
 *       - Search History
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Numero di pagina
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Numero di elementi per pagina (max 100)
 *     responses:
 *       200:
 *         description: Storico ricerche recuperato con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchHistoryResponse'
 *       400:
 *         description: Parametri di paginazione non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/history', authenticateToken, validatePagination, searchController.getSearchHistory.bind(searchController));

export default router;