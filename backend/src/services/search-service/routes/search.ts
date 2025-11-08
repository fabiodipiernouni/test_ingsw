import express from 'express';
import { searchController } from '../controllers/SearchController';
import { authenticateToken } from '@shared/middleware/auth';
import { commonValidations, validate } from '@shared/middleware/validation';

const router = express.Router();

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
 *     description: Salva una ricerca con i suoi filtri. Il nome viene generato automaticamente.
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
 *             filters:
 *               filters:
 *                 location: "Milano"
 *                 propertyType: "APARTMENT"
 *                 listingType: "SALE"
 *                 priceMin: 300000
 *                 priceMax: 600000
 *                 bedrooms: 3
 *               sortBy: "price_asc"
 *               sortOrder: "ASC"
 *             isNotificationEnabled: false
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
router.get('/saved', authenticateToken, searchController.getSavedSearches.bind(searchController));
router.post('/saved', authenticateToken, searchController.saveSearch.bind(searchController));

/**
 * @swagger
 * /search/saved/{searchId}:
 *   delete:
 *     summary: Elimina una ricerca salvata
 *     description: Elimina definitivamente una ricerca salvata dell'utente autenticato.
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
 *         description: ID della ricerca salvata da eliminare
 *     responses:
 *       200:
 *         description: Ricerca eliminata con successo
 *       401:
 *         description: Utente non autenticato
 *       404:
 *         description: Ricerca non trovata
 *       500:
 *         description: Errore interno del server
 */
router.delete('/saved/:searchId', authenticateToken, validate([commonValidations.uuid('searchId')]), searchController.deleteSavedSearch.bind(searchController));

/**
 * @swagger
 * /search/saved/{searchId}/notifications:
 *   patch:
 *     summary: Attiva/Disattiva le notifiche per una ricerca salvata
 *     description: Modifica lo stato delle notifiche per una ricerca salvata.
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
 *         description: ID della ricerca salvata
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isNotificationEnabled:
 *                 type: boolean
 *             required:
 *               - isNotificationEnabled
 *           example:
 *             isNotificationEnabled: true
 *     responses:
 *       200:
 *         description: Notifiche aggiornate con successo
 *       400:
 *         description: Dati non validi
 *       401:
 *         description: Utente non autenticato
 *       404:
 *         description: Ricerca non trovata
 *       500:
 *         description: Errore interno del server
 */
router.patch('/saved/:searchId/notifications', authenticateToken, validate([commonValidations.uuid('searchId')]), searchController.toggleNotifications.bind(searchController));

/**
 * @swagger
 * /search/saved/{searchId}/name:
 *   patch:
 *     summary: Aggiorna il nome di una ricerca salvata
 *     description: Aggiorna il nome personalizzato di una ricerca salvata.
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
 *         description: ID della ricerca salvata
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 description: Nuovo nome della ricerca
 *             required:
 *               - name
 *           example:
 *             name: "Appartamenti centro Milano - aggiornato"
 *     responses:
 *       200:
 *         description: Nome aggiornato con successo
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
 *       401:
 *         description: Utente non autenticato
 *       404:
 *         description: Ricerca non trovata
 *       500:
 *         description: Errore interno del server
 */
router.patch('/saved/:searchId/name', authenticateToken, validate([commonValidations.uuid('searchId')]), searchController.updateSavedSearchName.bind(searchController));

export default router;