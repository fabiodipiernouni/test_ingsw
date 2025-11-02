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
 *     summary: Upload immagini per una proprietà
 *     description: |
 *       Carica una o più immagini per una proprietà. Le immagini vengono validate e caricate su S3.
 *
 *       **Flusso di validazione (7 middleware):**
 *       1. `authenticateToken` - Verifica JWT e popola req.user
 *       2. `validatePropertyImageUploadPermissions` - Verifica UUID propertyId e che utente appartenga a un'agenzia
 *       3. `uploadToMemory.array('images', 10)` - Upload file in memoria con Multer (max 10 file, 5MB ciascuno)
 *       4. `handleMulterError` - Gestisce errori Multer con messaggi user-friendly
 *       5. `validateImageFiles` - Valida formato reale con Sharp (sicurezza anti-malware, dimensioni, compression ratio)
 *       6. `validatePropertyImageMetadata` - **Combina file + metadata in DTO tipizzato, valida con class-validator**
 *       7. Controller - Business logic (upload S3 + salvataggio DB)
 *
 *       **Tipizzazione:**
 *       - Request Body: `AddPropertyImageRequest` (usato in AuthenticatedRequest)
 *         - Contiene: `PropertyImageFileRequest[]` dove ogni elemento ha `file` + `metadata`
 *       - Metadata: `PropertyImageMetadata` (validato con class-validator)
 *         - Campi: isPrimary, order, caption?, altText?
 *       - Response: `UploadImagesResponse`
 *
 *       **Vincoli validazione:**
 *       - Utente deve appartenere a un'agenzia
 *       - PropertyId deve essere UUID v4 valido
 *       - File: MIME type valido (jpeg, jpg, png, webp), dimensione ≤ 5MB, numero ≤ 10
 *       - Formato reale verificato con Sharp (non solo estensione)
 *       - Dimensioni immagine ≤ 10000x10000 pixel, risoluzione ≤ 25 megapixel
 *       - Numero di metadata deve corrispondere esattamente al numero di file
 *       - Solo una immagine può avere isPrimary = true
 *       - Ogni order deve essere univoco (0-99)
 *       - caption ≤ 500 caratteri, altText ≤ 255 caratteri
 *
 *       **Formato richiesta Postman:**
 *       - Body type: form-data
 *       - Campo `images` (File) - ripetuto per ogni file con lo stesso nome
 *       - Campo `metadata` (Text) - array JSON stringa
 *
 *       Esempio metadata: `[{"isPrimary":true,"order":0},{"isPrimary":false,"order":1}]`
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
 *         description: ID della proprietà (deve appartenere all'agente autenticato)
 *         example: '550e8400-e29b-41d4-a716-446655440000'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UploadImagesRequest'
 *           examples:
 *             singleImage:
 *               summary: Upload singola immagine
 *               value:
 *                 images: ['[binary file]']
 *                 metadata: '[{"isPrimary":true,"order":0,"caption":"Soggiorno luminoso","altText":"Vista del soggiorno"}]'
 *             multipleImages:
 *               summary: Upload multiple immagini
 *               value:
 *                 images: ['[binary file 1]', '[binary file 2]']
 *                 metadata: '[{"isPrimary":true,"order":0,"caption":"Soggiorno"},{"isPrimary":false,"order":1,"caption":"Cucina"}]'
 *     responses:
 *       201:
 *         description: Immagini caricate con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadImagesResponse'
 *             example:
 *               success: true
 *               message: 'Successfully uploaded 2 image(s)'
 *               data:
 *                 images:
 *                   - id: '550e8400-e29b-41d4-a716-446655440000'
 *                     fileName: 'image1.jpg'
 *                     isPrimary: true
 *                     order: 0
 *                     urls:
 *                       original: 'https://s3.../original.jpg'
 *                       small: 'https://s3.../small.jpg'
 *                       medium: 'https://s3.../medium.jpg'
 *                       large: 'https://s3.../large.jpg'
 *       400:
 *         description: Errore di validazione
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *             examples:
 *               invalidMetadata:
 *                 summary: Metadata non validi
 *                 value:
 *                   success: false
 *                   error: 'Validation failed'
 *                   details:
 *                     - 'metadata[0].isPrimary: isPrimary must be a boolean'
 *                     - 'metadata[1].order: order must not exceed 99'
 *               multiplePrimary:
 *                 summary: Multiple immagini primary
 *                 value:
 *                   success: false
 *                   error: 'Validation failed'
 *                   details:
 *                     - 'Only one image can be marked as primary'
 *               countMismatch:
 *                 summary: Numero metadata != numero file
 *                 value:
 *                   success: false
 *                   error: 'Metadata count mismatch'
 *                   message: 'Metadata count (2) must match files count (3)'
 *       401:
 *         description: Non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Non autorizzato (proprietà non appartiene all'agente)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: 'FORBIDDEN'
 *               message: 'You do not have permission to add images to this property'
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
 *           format: uuid
 *         description: ID univoco della proprietà (UUID v4)
 *         example: 550e8400-e29b-41d4-a716-446655440000
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

export default router;