import express from 'express';
import { propertyController } from '../controllers/PropertyController';
import { authenticateToken, optionalAuth } from '@shared/middleware/auth';
import { validatePropertyCreate, validatePropertyId } from '../middleware/validation';
import { validatePropertySearchFilters } from '@shared/middleware/validation';

const router = express.Router();

/**
 * @swagger
 * /properties/card:
 *   get:
 *     summary: Lista proprietà in formato card con paginazione
 *     description: |
 *       Restituisce una lista paginata di proprietà in formato card. Il comportamento varia in base al ruolo dell'utente:
 *       - **Utenti non autenticati/Clienti**: Solo proprietà pubbliche e attive
 *       - **Agenti**: Solo le proprie proprietà (tutte)
 *       - **Admin**: Proprietà degli agenti della propria agenzia
 *     tags:
 *       - Properties
 *     security:
 *       - bearerAuth: []
 *       - {}
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, pending, sold, rented, withdrawn]
 *         description: Filtra per stato (solo per agenti e admin)
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: string
 *         description: Filtra per agente specifico (solo per admin)
 *     responses:
 *       200:
 *         description: Lista delle proprietà in formato card recuperata con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PropertiesListResponse'
 *       403:
 *         description: Accesso negato (ruolo non valido)
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
router.post('/cards', optionalAuth, validatePropertySearchFilters, propertyController.getPropertiesCardsPost.bind(propertyController));

router.post('/geocards', optionalAuth, validatePropertySearchFilters, propertyController.getGeoPropertiesCardsPost.bind(propertyController));

router.post('/cards/by-ids', optionalAuth, propertyController.getPropertiesByIdList.bind(propertyController));
/**
 * @swagger
 * /properties:
 *   get:
 *     summary: Lista proprietà con paginazione
 *     description: |
 *       Restituisce una lista paginata di proprietà. Il comportamento varia in base al ruolo dell'utente:
 *       - **Utenti non autenticati/Clienti**: Solo proprietà pubbliche e attive
 *       - **Agenti**: Solo le proprie proprietà (tutte)
 *       - **Admin**: Proprietà degli agenti della propria agenzia
 *     tags:
 *       - Properties
 *     security:
 *       - bearerAuth: []
 *       - {}
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, pending, sold, rented, withdrawn]
 *         description: Filtra per stato (solo per agenti e admin)
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: string
 *         description: Filtra per agente specifico (solo per admin)
 *     responses:
 *       200:
 *         description: Lista delle proprietà recuperata con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PropertiesListResponse'
 *       403:
 *         description: Accesso negato (ruolo non valido)
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
//router.get('/', optionalAuth, propertyController.getProperties.bind(propertyController));

/**
 * @swagger
 * /properties:
 *   post:
 *     summary: Crea una nuova proprietà
 *     description: Crea una nuova proprietà immobiliare. Accessibile solo agli agenti autenticati.
 *     tags:
 *       - Properties
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PropertyCreateRequest'
 *     responses:
 *       201:
 *         description: Proprietà creata con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PropertyResponse'
 *       400:
 *         description: Dati di input non validi
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
 *       403:
 *         description: Solo gli agenti possono creare proprietà
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
router.post('/', authenticateToken, validatePropertyCreate, propertyController.createProperty.bind(propertyController));



/**
 * @swagger
 * /properties/{propertyId}:
 *   get:
 *     summary: Ottieni dettagli di una proprietà
 *     description: Restituisce i dettagli completi di una specifica proprietà tramite il suo ID.
 *     tags:
 *       - Properties
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID univoco della proprietà
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Dettagli della proprietà recuperati con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PropertyResponse'
 *       400:
 *         description: ID proprietà non valido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Proprietà non trovata
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
router.get('/:propertyId', validatePropertyId, propertyController.getPropertyById.bind(propertyController));

/**
 * @swagger
 * /properties/{propertyId}/view:
 *   post:
 *     summary: Registra visualizzazione proprietà
 *     description: Registra una visualizzazione per una specifica proprietà per scopi di tracking e statistiche.
 *     tags:
 *       - Property Views
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID univoco della proprietà
 *         example: 507f1f77bcf86cd799439011
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PropertyViewRequest'
 *     responses:
 *       200:
 *         description: Visualizzazione registrata con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: ID proprietà non valido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Proprietà non trovata
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
router.post('/:propertyId/view', validatePropertyId, propertyController.recordPropertyView.bind(propertyController));
//TODO: non richiesto, decidere se rimuovere o tenere, nel caso cancellare anche nel db

export default router;