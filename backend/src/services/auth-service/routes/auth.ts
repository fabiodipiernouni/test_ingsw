import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validate, authValidations } from '@shared/middleware/validation';
import { authenticateToken } from '@shared/middleware/auth';
import { requireAdminOrOwner, requireAgencyOwner } from '../../../shared/middleware/authorization';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registrazione nuovo utente
 *     description: Crea un nuovo account utente nel sistema con validazione completa dei dati
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Utente registrato con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Dati di input non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email già esistente
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
router.post('/register', validate(authValidations.register), authController.register);

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login utente
 *     description: Autentica un utente esistente con email e password
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login effettuato con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Dati di login non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Credenziali non valide
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
router.post('/login', validate(authValidations.login), authController.login);

/**
 * @swagger
 * /refresh-token:
 *   post:
 *     summary: Refresh del token di accesso
 *     description: Genera un nuovo access token utilizzando il refresh token
 *     tags:
 *       - Token Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token rinnovato con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshTokenResponse'
 *       400:
 *         description: Refresh token mancante
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Refresh token non valido o scaduto
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
router.post('/refresh-token', authController.refreshToken);

/**
 * @swagger
 * /forgot-password:
 *   post:
 *     summary: Inizia il processo di recupero password
 *     description: Invia un codice di verifica via email per il reset della password
 *     tags:
 *       - Password Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Codice di reset inviato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Email mancante
 *       500:
 *         description: Errore interno del server
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /confirm-forgot-password:
 *   post:
 *     summary: Conferma il reset della password
 *     description: Completa il processo di recupero password con il codice ricevuto via email
 *     tags:
 *       - Password Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               code:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset completato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Dati mancanti
 *       401:
 *         description: Codice non valido o scaduto
 *       500:
 *         description: Errore interno del server
 */
router.post('/confirm-forgot-password', authController.confirmForgotPassword);

/**
 * @swagger
 * /confirm-email:
 *   post:
 *     summary: Conferma email con codice di verifica
 *     description: Verifica l'indirizzo email dell'utente autenticato utilizzando il codice ricevuto via email dopo la registrazione
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Codice di verifica ricevuto via email
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verificata con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Codice non valido o scaduto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Errore interno del server
 */
router.post('/confirm-email', authController.confirmEmail);

/**
 * @swagger
 * /resend-verification-code:
 *   post:
 *     summary: Reinvia codice di verifica email
 *     description: Reinvia il codice di verifica via email all'utente autenticato se non l'ha ricevuto o è scaduto
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Codice di verifica inviato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Utente già verificato o troppi tentativi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Utente non trovato
 *       429:
 *         description: Troppi tentativi, riprova più tardi
 *       500:
 *         description: Errore interno del server
 */
router.post('/resend-verification-code', authController.resendVerificationCode);

/**
 * @swagger
 * /change-password:
 *   post:
 *     summary: Cambia password utente autenticato
 *     description: Permette all'utente autenticato di cambiare la propria password fornendo quella attuale
 *     tags:
 *       - Password Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password cambiata con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Dati mancanti o password non valida
 *       401:
 *         description: Password attuale errata o token non valido
 *       500:
 *         description: Errore interno del server
 */
router.post('/change-password', authenticateToken, validate(authValidations.changePassword), authController.changePassword);

/**
 * @swagger
 * /oauth/authorize:
 *   get:
 *     summary: Inizia autenticazione OAuth
 *     description: |
 *       Reindirizza l'utente direttamente al Cognito Hosted UI per l'autenticazione con Google.
 *       
 *       **Questo endpoint NON restituisce JSON**, ma effettua un redirect HTTP 302.
 *       
 *       Il frontend può semplicemente usare un link diretto:
 *       ```html
 *       <a href="http://localhost:3001/api/oauth/authorize?provider=google">Login con Google</a>
 *       ```
 *       
 *       O programmaticamente:
 *       ```typescript
 *       window.location.href = 'http://localhost:3001/api/oauth/authorize?provider=google';
 *       ```
 *     tags:
 *       - Authentication
 *       - OAuth
 *     parameters:
 *       - in: query
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google]
 *         description: Provider OAuth da utilizzare (attualmente solo "google")
 *       - in: query
 *         name: state
 *         required: false
 *         schema:
 *           type: string
 *         description: State parameter opzionale per prevenire CSRF attacks
 *     responses:
 *       302:
 *         description: |
 *           Redirect al Cognito Hosted UI per l'autenticazione.
 *           
 *           L'utente verrà reindirizzato a:
 *           `https://dietiestates25.auth.eu-central-1.amazoncognito.com/oauth2/authorize?...`
 *           
 *           Dopo il login, Cognito reindirizza a `/api/oauth/callback?code=...`
 *         headers:
 *           Location:
 *             description: URL del Cognito Hosted UI
 *             schema:
 *               type: string
 *               example: https://dietiestates25.auth.eu-central-1.amazoncognito.com/oauth2/authorize?client_id=xxx&response_type=code&scope=openid+email+profile&redirect_uri=http://localhost:3001/api/oauth/callback&identity_provider=Google
 */
router.get('/oauth/authorize', authController.getOAuthUrl);

/**
 * @swagger
 * /oauth/callback:
 *   get:
 *     summary: Gestisci callback OAuth
 *     description: |
 *       Endpoint di callback per completare l'autenticazione OAuth. 
 *       Cognito reindirizza qui dopo il login social.
 *       
 *       **Questo endpoint NON restituisce JSON**, ma effettua un redirect al frontend con i token nei query params.
 *       
 *       Il frontend deve gestire il redirect alla pagina `/auth/callback` per estrarre i token dall'URL e salvarli in localStorage.
 *     tags:
 *       - Authentication
 *       - OAuth
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code ricevuto da Cognito
 *       - in: query
 *         name: state
 *         required: false
 *         schema:
 *           type: string
 *         description: State parameter per verifica CSRF
 *       - in: query
 *         name: error
 *         required: false
 *         schema:
 *           type: string
 *         description: Codice errore se l'autenticazione OAuth è fallita
 *       - in: query
 *         name: error_description
 *         required: false
 *         schema:
 *           type: string
 *         description: Descrizione dell'errore OAuth
 *     responses:
 *       302:
 *         description: |
 *           Redirect al frontend con i token nei query params.
 *           
 *           **Successo**: Redirect a `{FRONTEND_URL}/auth/callback?access_token=xxx&id_token=xxx&refresh_token=xxx&token_type=Bearer&email=user@example.com&is_new_user=false`
 *           
 *           **Errore**: Redirect a `{FRONTEND_URL}/auth/error?message=Error+description`
 *         headers:
 *           Location:
 *             description: URL del frontend con token o messaggio di errore
 *             schema:
 *               type: string
 *               example: http://localhost:3000/auth/callback?access_token=eyJra...&refresh_token=eyJra...
 */
router.get('/oauth/callback', authController.handleOAuthCallback);

/**
 * @swagger
 * /create-agent:
 *   post:
 *     summary: Crea nuovo agente
 *     description: |
 *       Crea un nuovo account agente per l'agenzia. 
 *       L'agente sarà associato automaticamente all'agenzia dell'admin che lo crea.
 *       Cognito invierà una email con le credenziali temporanee all'agente.
 *       Accessibile solo agli admin di agenzia autenticati.
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - firstName
 *               - lastName
 *               - licenseNumber
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email dell'agente (deve essere valida e univoca)
 *                 example: "agent@example.com"
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Nome dell'agente
 *                 example: "Marco"
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Cognome dell'agente
 *                 example: "Bianchi"
 *               phone:
 *                 type: string
 *                 pattern: '^[\d\s()+-]+$'
 *                 description: Numero di telefono (opzionale)
 *                 example: "+39 345 678 9012"
 *               licenseNumber:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 description: Numero di licenza dell'agente immobiliare (obbligatorio)
 *                 example: "LIC789012"
 *               biography:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Biografia dell'agente (opzionale)
 *                 example: "Esperto in immobili residenziali con 10 anni di esperienza"
 *               specializations:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specializzazioni dell'agente (opzionale)
 *                 example: ["residential", "commercial"]
 *     responses:
 *       201:
 *         description: Agente creato con successo. Le credenziali sono state inviate via email.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Agent created successfully"
 *                 data:
 *                   type: null
 *                   example: null
 *       400:
 *         description: Errori di validazione nei dati di input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "VALIDATION_ERROR"
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Email non valida", "Il numero di licenza deve contenere almeno 3 caratteri"]
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Permessi insufficienti (solo admin di agenzia)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Risorsa non trovata (es. agenzia non trovata)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email già esistente nel sistema
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "CONFLICT"
 *                 message:
 *                   type: string
 *                   example: "User with this email already exists"
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/create-agent', 
  authenticateToken,
  requireAdminOrOwner, 
  authController.createAgent.bind(authController)
);

/**
 * @swagger
 * /create-admin:
 *   post:
 *     summary: Crea nuovo admin di agenzia
 *     description: |
 *       Crea un nuovo account admin per l'agenzia.
 *       L'admin sarà associato automaticamente all'agenzia del creatore.
 *       Cognito invierà una email con le credenziali temporanee all'admin.
 *       Accessibile solo al creatore (owner) dell'agenzia.
 *     tags:
 *       - User Management
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email dell'admin (deve essere valida e univoca)
 *                 example: "admin@example.com"
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Nome dell'admin
 *                 example: "Giulia"
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Cognome dell'admin
 *                 example: "Verdi"
 *               phone:
 *                 type: string
 *                 pattern: '^[\d\s()+-]+$'
 *                 description: Numero di telefono (opzionale)
 *                 example: "+39 345 678 9012"
 *     responses:
 *       201:
 *         description: Admin creato con successo. Le credenziali sono state inviate via email.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Admin created successfully"
 *                 data:
 *                   type: null
 *                   example: null
 *       400:
 *         description: Errori di validazione nei dati di input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "VALIDATION_ERROR"
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Email non valida", "Il nome deve contenere almeno 2 caratteri"]
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Permessi insufficienti (solo creatore dell'agenzia)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "FORBIDDEN"
 *                 message:
 *                   type: string
 *                   example: "Only agency owners can create administrators"
 *       404:
 *         description: Risorsa non trovata (es. agenzia non trovata)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email già esistente nel sistema
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "CONFLICT"
 *                 message:
 *                   type: string
 *                   example: "User with this email already exists"
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/create-admin', 
  authenticateToken,
  requireAgencyOwner, 
  authController.createAdmin.bind(authController)
);

/**
 * @swagger
 * /notification-preferences:
 *   put:
 *     summary: Aggiorna le preferenze di notifica dell'utente
 *     description: Permette all'utente autenticato di configurare quali categorie di notifiche desidera ricevere. L'utente può scegliere tra notifiche per nuove proprietà corrispondenti, messaggi promozionali e aggiornamenti sullo stato delle visite.
 *     tags:
 *       - User Preferences
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabledNotificationTypes
 *             properties:
 *               enabledNotificationTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum:
 *                     - new_property_match_saved_search
 *                     - promotional_message
 *                     - visit_status_update
 *                 uniqueItems: true
 *                 example: ["new_property_match_saved_search", "visit_status_update"]
 *                 description: |
 *                   Array di categorie di notifiche che l'utente desidera ricevere.
 *                   - `new_property_match_saved_search`: Notifiche quando nuove proprietà corrispondono alle ricerche salvate
 *                   - `promotional_message`: Messaggi promozionali e offerte speciali
 *                   - `visit_status_update`: Aggiornamenti sullo stato delle visite programmate
 *           examples:
 *             allEnabled:
 *               summary: Tutte le notifiche abilitate
 *               value:
 *                 enabledNotificationTypes: ["new_property_match_saved_search", "promotional_message", "visit_status_update"]
 *             onlyPropertyMatches:
 *               summary: Solo notifiche proprietà corrispondenti
 *               value:
 *                 enabledNotificationTypes: ["new_property_match_saved_search"]
 *             allDisabled:
 *               summary: Tutte le notifiche disabilitate
 *               value:
 *                 enabledNotificationTypes: []
 *     responses:
 *       200:
 *         description: Preferenze di notifica aggiornate con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabledNotificationTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["new_property_match_saved_search", "visit_status_update"]
 *                 message:
 *                   type: string
 *                   example: "Notification preferences updated successfully"
 *       400:
 *         description: Richiesta non valida - formato dati errato o tipi di notifica non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidType:
 *                 summary: Tipo di notifica non valido
 *                 value:
 *                   success: false
 *                   error: "VALIDATION_ERROR"
 *                   message: "Invalid notification types. Allowed values are: new_property_match_saved_search, promotional_message, visit_status_update"
 *               missingField:
 *                 summary: Campo obbligatorio mancante
 *                 value:
 *                   success: false
 *                   error: "VALIDATION_ERROR"
 *                   message: "enabledNotificationTypes is required"
 *       401:
 *         description: Non autenticato - token mancante o non valido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "UNAUTHORIZED"
 *               message: "Authentication required"
 *       404:
 *         description: Utente non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "NOT_FOUND"
 *               message: "User not found"
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "INTERNAL_SERVER_ERROR"
 *               message: "Failed to update notification preferences"
 */
router.put('/notification-preferences',
  authenticateToken,
  authController.updateNotificationPreferences.bind(authController)
);

/**
 * @swagger
 * /notification-preferences:
 *   get:
 *     summary: Ottiene le preferenze di notifica dell'utente
 *     description: Recupera le categorie di notifiche attualmente abilitate per l'utente autenticato
 *     tags:
 *       - User Preferences
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferenze di notifica recuperate con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabledNotificationTypes:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum:
 *                           - new_property_match_saved_search
 *                           - promotional_message
 *                           - visit_status_update
 *                       example: ["new_property_match_saved_search", "visit_status_update"]
 *                       description: Lista delle categorie di notifiche attualmente abilitate per l'utente
 *                 message:
 *                   type: string
 *                   example: "Notification preferences retrieved successfully"
 *             examples:
 *               someEnabled:
 *                 summary: Alcune notifiche abilitate
 *                 value:
 *                   success: true
 *                   data:
 *                     enabledNotificationTypes: ["new_property_match_saved_search", "visit_status_update"]
 *                   message: "Notification preferences retrieved successfully"
 *               allDisabled:
 *                 summary: Nessuna notifica abilitata
 *                 value:
 *                   success: true
 *                   data:
 *                     enabledNotificationTypes: []
 *                   message: "Notification preferences retrieved successfully"
 *       401:
 *         description: Non autenticato - token mancante o non valido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "UNAUTHORIZED"
 *               message: "Authentication required"
 *       404:
 *         description: Utente non trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "NOT_FOUND"
 *               message: "User not found"
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: "INTERNAL_SERVER_ERROR"
 *               message: "Failed to retrieve notification preferences"
 */
router.get('/notification-preferences',
  authenticateToken,
  authController.getNotificationPreferences.bind(authController)
);

/**
 * @swagger
 * /agents:
 *   get:
 *     summary: Ottiene tutti gli agenti dell'agenzia
 *     description: Recupera la lista paginata di tutti gli agenti dell'agenzia (solo per admin/owner)
 *     tags:
 *       - Agency Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Numero di pagina
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Numero di risultati per pagina
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Campo per ordinamento
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Ordine di ordinamento
 *     responses:
 *       200:
 *         description: Lista agenti recuperata con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserResponse'
 *                     totalCount:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Non autorizzato - solo admin/owner
 *       500:
 *         description: Errore interno del server
 */
router.get('/agents',
  authenticateToken,
  requireAdminOrOwner,
  authController.getAgents.bind(authController)
);

/**
 * @swagger
 * /admins:
 *   get:
 *     summary: Ottiene tutti gli admin dell'agenzia
 *     description: Recupera la lista paginata di tutti gli admin dell'agenzia (solo per owner)
 *     tags:
 *       - Agency Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Numero di pagina
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Numero di risultati per pagina
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Campo per ordinamento
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Ordine di ordinamento
 *     responses:
 *       200:
 *         description: Lista admin recuperata con successo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserResponse'
 *                     totalCount:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Non autorizzato - solo owner
 *       500:
 *         description: Errore interno del server
 */
router.get('/admins',
  authenticateToken,
  requireAgencyOwner,
  authController.getAdmins.bind(authController)
);

/**
 * @swagger
 * /agents/{id}:
 *   delete:
 *     summary: Elimina un agente
 *     description: Elimina un agente dall'agenzia (solo per admin/owner)
 *     tags:
 *       - Agency Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID dell'agente da eliminare
 *     responses:
 *       200:
 *         description: Agente eliminato con successo
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Non autorizzato - solo admin/owner
 *       404:
 *         description: Agente non trovato
 *       500:
 *         description: Errore interno del server
 */
router.delete('/agents/:id',
  authenticateToken,
  requireAdminOrOwner,
  authController.deleteAgent.bind(authController)
);

/**
 * @swagger
 * /admins/{id}:
 *   delete:
 *     summary: Elimina un admin
 *     description: Elimina un admin dall'agenzia (solo per owner)
 *     tags:
 *       - Agency Management
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID dell'admin da eliminare
 *     responses:
 *       200:
 *         description: Admin eliminato con successo
 *       401:
 *         description: Non autenticato
 *       403:
 *         description: Non autorizzato - solo owner
 *       404:
 *         description: Admin non trovato
 *       500:
 *         description: Errore interno del server
 */
router.delete('/admins/:id',
  authenticateToken,
  requireAgencyOwner,
  authController.deleteAdmin.bind(authController)
);

export default router;