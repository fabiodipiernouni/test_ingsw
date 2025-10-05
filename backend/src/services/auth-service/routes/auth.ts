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

export default router;