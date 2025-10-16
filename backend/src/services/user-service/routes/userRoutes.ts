import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticateToken } from '../../../shared/middleware/auth';

const router = Router();
const userController = new UserController();

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Ottieni profilo utente corrente
 *     description: Restituisce il profilo completo dell'utente autenticato
 *     tags:
 *       - User Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profilo utente recuperato con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Profilo utente non trovato
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
 *   put:
 *     summary: Aggiorna profilo utente corrente
 *     description: Modifica i dati del profilo dell'utente autenticato
 *     tags:
 *       - User Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *           example:
 *             firstName: "Mario"
 *             lastName: "Rossi"
 *             phone: "+391234567890"
 *             licenseNumber: "LIC123456"
 *     responses:
 *       200:
 *         description: Profilo aggiornato con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserProfile'
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
 *       404:
 *         description: Utente non trovato
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
router.get('/profile', authenticateToken, userController.getProfile.bind(userController));
router.put('/profile', authenticateToken, userController.updateProfile.bind(userController));

/**
 * @swagger
 * /users/preferences:
 *   get:
 *     summary: Ottieni preferenze utente
 *     description: Restituisce le preferenze dell'utente autenticato (lingua, tema, privacy, ecc.)
 *     tags:
 *       - User Preferences
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferenze utente recuperate con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserPreferences'
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Preferenze non trovate
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
 *   put:
 *     summary: Aggiorna preferenze utente
 *     description: Modifica le preferenze dell'utente autenticato
 *     tags:
 *       - User Preferences
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserPreferencesRequest'
 *           example:
 *             language: "it"
 *             currency: "EUR"
 *             theme: "dark"
 *             receiveNewsletters: true
 *             privacyLevel: "limited"
 *     responses:
 *       200:
 *         description: Preferenze aggiornate con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserPreferences'
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
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/preferences', authenticateToken, userController.getUserPreferences.bind(userController));
router.put('/preferences', authenticateToken, userController.updateUserPreferences.bind(userController));

/**
 * @swagger
 * /users/notification-preferences:
 *   get:
 *     summary: Ottieni preferenze di notifica
 *     description: Restituisce le preferenze di notifica dell'utente autenticato
 *     tags:
 *       - Notification Preferences
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferenze di notifica recuperate con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/NotificationPreferences'
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Preferenze di notifica non trovate
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
 *   put:
 *     summary: Aggiorna preferenze di notifica
 *     description: Modifica le preferenze di notifica dell'utente autenticato
 *     tags:
 *       - Notification Preferences
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateNotificationPreferencesRequest'
 *           example:
 *             emailNotifications: true
 *             pushNotifications: false
 *             newPropertyAlerts: true
 *             priceChangeAlerts: true
 *             marketingCommunications: false
 *     responses:
 *       200:
 *         description: Preferenze di notifica aggiornate con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/NotificationPreferences'
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
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/notification-preferences', authenticateToken, userController.getNotificationPreferences.bind(userController));
router.put('/notification-preferences', authenticateToken, userController.updateNotificationPreferences.bind(userController));

/**
 * @swagger
 * /users/avatar:
 *   post:
 *     summary: Carica avatar utente
 *     description: |
 *       Carica un nuovo avatar per l'utente autenticato.
 *       **Nota**: Questa funzionalità non è ancora completamente implementata.
 *     tags:
 *       - User Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: File immagine dell'avatar
 *     responses:
 *       200:
 *         description: Placeholder per upload avatar (non ancora implementato)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
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
router.post('/avatar', authenticateToken, userController.uploadAvatar.bind(userController));

/**
 * @swagger
 * /users/activity:
 *   get:
 *     summary: Ottieni attività utente
 *     description: |
 *       Restituisce un riepilogo dell'attività dell'utente autenticato incluse ricerche recenti, proprietà preferite, ecc.
 *       **Nota**: Questa funzionalità restituisce dati placeholder.
 *     tags:
 *       - User Activity
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Attività utente recuperata con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UserActivity'
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
router.get('/activity', authenticateToken, userController.getUserActivity.bind(userController));

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Ottieni profilo pubblico utente
 *     description: Restituisce il profilo pubblico di un utente specifico (informazioni limitate)
 *     tags:
 *       - User Profile
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID univoco dell'utente
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Profilo pubblico recuperato con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PublicUserProfile'
 *       400:
 *         description: ID utente non valido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Utente non trovato
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
router.get('/:userId', userController.getUserById.bind(userController));

export default router;