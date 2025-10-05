import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validate, authValidations } from '../../../shared/middleware/validation';
import { authenticateToken } from '../../../shared/middleware/auth';

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
 * /logout:
 *   post:
 *     summary: Logout utente
 *     description: Effettua il logout dell'utente autenticato
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout effettuato con successo
 *       401:
 *         description: Token non valido o mancante
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
router.post('/logout', authenticateToken as any, authController.logout);

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
 * /complete-new-password:
 *   post:
 *     summary: Completa la challenge NEW_PASSWORD_REQUIRED
 *     description: Imposta una nuova password quando richiesto da Cognito al primo login
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *               - session
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *               session:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password impostata con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Dati mancanti
 *       401:
 *         description: Session non valida
 *       500:
 *         description: Errore interno del server
 */
router.post('/complete-new-password', authController.completeNewPassword);

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
router.post('/change-password', authenticateToken as any, validate(authValidations.changePassword), authController.changePassword);

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

export default router;