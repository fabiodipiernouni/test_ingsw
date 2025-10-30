import express from 'express';
import { propertyController } from '../controllers/PropertyController';
import { authenticateToken, optionalAuth } from '@shared/middleware/auth';
import { PropertiesMiddlewareValidation } from '../middleware/validation';
import { uploadToMemory, handleMulterError } from '@shared/middleware/upload';
import { validateImageFiles, validatePropertyImageUploadPermissions } from '@property/middleware/validateImageUpload';
import { validatePropertyImageMetadata } from '@property/middleware/validatePropertyImageMetadata';

const router = express.Router();

/**
 * @swagger
 * /properties/cards:
 *   post:
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
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GetPropertiesCardsRequest'
 *     responses:
 *       200:
 *         description: Lista delle proprietà in formato card recuperata con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PropertyCardsResponse'
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
router.post('/cards', optionalAuth, PropertiesMiddlewareValidation.validatePropertySearchFilters, propertyController.getPropertiesCardsPost.bind(propertyController));

/**
 * @swagger
 * /properties/geocards:
 *   post:
 *     summary: Lista proprietà in formato card per visualizzazione geografica
 *     description: |
 *       Restituisce una lista di proprietà in formato card ottimizzate per la visualizzazione su mappa.
 *       Il comportamento varia in base al ruolo dell'utente:
 *       - **Utenti non autenticati/Clienti**: Solo proprietà pubbliche e attive
 *       - **Agenti**: Solo le proprie proprietà (tutte)
 *       - **Admin**: Proprietà degli agenti della propria agenzia
 *     tags:
 *       - Properties
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GetGeoPropertiesCardsRequest'
 *     responses:
 *       200:
 *         description: Lista delle proprietà geo recuperata con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PropertyCardDto'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       403:
 *         description: Accesso negato
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
router.post('/geocards', optionalAuth, PropertiesMiddlewareValidation.validatePropertySearchFilters, propertyController.getGeoPropertiesCardsPost.bind(propertyController));

/**
 * @swagger
 * /properties/cards/by-ids:
 *   post:
 *     summary: Ottieni proprietà specifiche per ID
 *     description: Restituisce una lista di proprietà filtrate per ID specifici
 *     tags:
 *       - Properties
 *     security:
 *       - bearerAuth: []
 *       - {}
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GetPropertiesByIdListRequest'
 *     responses:
 *       200:
 *         description: Proprietà recuperate con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PropertyCardDto'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Richiesta non valida
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
 *             $ref: '#/components/schemas/CreatePropertyRequest'
 *     responses:
 *       201:
 *         description: Proprietà creata con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreatePropertyResponse'
 *       400:
 *         description: Dati di input non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
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
router.post('/', authenticateToken, PropertiesMiddlewareValidation.validatePropertyCreate, propertyController.createProperty.bind(propertyController));

/**
 * @swagger
 * /properties/{propertyId}/images:
 *   post:
 *     summary: Upload images for a property
 *     description: Upload one or multiple images to a property. Images are validated and uploaded to S3.
 *     tags:
 *       - Properties
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *               - metadata
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Image files (max 10 files, 10MB each)
 *                 maxItems: 10
 *               metadata:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - isPrimary
 *                     - order
 *                   properties:
 *                     isPrimary:
 *                       type: boolean
 *                       description: Whether this is the primary image
 *                     order:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 99
 *                       description: Display order of the image
 *                     caption:
 *                       type: string
 *                       maxLength: 500
 *                       description: Image caption
 *                     altText:
 *                       type: string
 *                       maxLength: 255
 *                       description: Alt text for accessibility
 *                 description: Metadata for each image (must match number of images)
 *     responses:
 *       201:
 *         description: Images uploaded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/:propertyId/images',
  authenticateToken,
  validatePropertyImageUploadPermissions,
  uploadToMemory.array('images', 10),
  handleMulterError,
  validateImageFiles,
  validatePropertyImageMetadata,
  propertyController.addPropertyImagePost.bind(propertyController)
);

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
router.get('/:propertyId', PropertiesMiddlewareValidation.validatePropertyId, propertyController.getPropertyById.bind(propertyController));

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
router.post('/:propertyId/view', PropertiesMiddlewareValidation.validatePropertyId, propertyController.recordPropertyView.bind(propertyController));
//TODO: non richiesto, decidere se rimuovere o tenere, nel caso cancellare anche nel db

export default router;