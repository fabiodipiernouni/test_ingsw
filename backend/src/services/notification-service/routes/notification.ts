import { Router } from 'express';
import { NotificationController } from '@notification/controllers/NotificationController';
import { authenticateToken } from '@shared/middleware/auth';
import {requireAdminOrOwner} from '@shared/middleware/authorization';

const router = Router();
const notificationController = new NotificationController();

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Ottieni le notifiche dell'utente
 *     description: Restituisce le notifiche dell'utente autenticato con paginazione e filtri opzionali. Permette di filtrare per stato (letta/non letta) e tipo di notifica.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Numero di pagina da recuperare
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Numero massimo di notifiche per pagina (max 100)
 *         example: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Campo per l'ordinamento
 *         example: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Ordine di ordinamento
 *         example: DESC
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Filtra per stato lettura (true = lette, false = non lette, ometti per tutte)
 *         example: false
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [new_property_match_saved_search, promotional_message, visit_status_update]
 *         description: Filtra per tipo di notifica
 *         example: new_property_match_saved_search
 *     responses:
 *       200:
 *         description: Notifiche recuperate con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PagedNotificationsResult'
 *             examples:
 *               success:
 *                 summary: Risposta con notifiche
 *                 value:
 *                   status: success
 *                   data:
 *                     data:
 *                       - id: "550e8400-e29b-41d4-a716-446655440000"
 *                         userId: "123e4567-e89b-12d3-a456-426614174000"
 *                         type: "new_property_match_saved_search"
 *                         title: "Nuova proprietà corrispondente"
 *                         message: "Abbiamo trovato un nuovo appartamento a Milano"
 *                         isRead: false
 *                         isSent: true
 *                         actionUrl: "/properties/123"
 *                         imageUrl: "https://example.com/image.jpg"
 *                         readAt: null
 *                         sentAt: "2025-10-30T09:55:00.000Z"
 *                         createdAt: "2025-10-30T10:00:00.000Z"
 *                         updatedAt: "2025-10-30T10:00:00.000Z"
 *                       - id: "660e8400-e29b-41d4-a716-446655440001"
 *                         userId: "123e4567-e89b-12d3-a456-426614174000"
 *                         type: "visit_status_update"
 *                         title: "Aggiornamento visita"
 *                         message: "La tua visita è stata confermata"
 *                         isRead: true
 *                         isSent: true
 *                         actionUrl: "/visits/456"
 *                         imageUrl: null
 *                         readAt: "2025-10-29T15:30:00.000Z"
 *                         sentAt: "2025-10-29T14:00:00.000Z"
 *                         createdAt: "2025-10-29T14:00:00.000Z"
 *                         updatedAt: "2025-10-29T15:30:00.000Z"
 *                     totalCount: 42
 *                     currentPage: 1
 *                     totalPages: 3
 *                     hasNextPage: true
 *                     hasPreviousPage: false
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: UNAUTHORIZED
 *               message: User not authenticated
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: INTERNAL_SERVER_ERROR
 *               message: Failed to get notifications
 */
router.get('/notifications', authenticateToken, notificationController.getNotifications.bind(notificationController));

/**
 * @swagger
 * /notifications/unread/count:
 *   get:
 *     summary: Ottieni il conteggio delle notifiche non lette
 *     description: Restituisce il numero totale di notifiche non lette per l'utente autenticato
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conteggio recuperato con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                           description: Numero di notifiche non lette
 *                           example: 5
 *             example:
 *               status: success
 *               data:
 *                 count: 5
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: UNAUTHORIZED
 *               message: User not authenticated
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: INTERNAL_SERVER_ERROR
 *               message: Failed to get unread notifications count
 */
router.get('/notifications/unread/count', authenticateToken, notificationController.getUnreadNotificationsCount.bind(notificationController));

/**
 * @swagger
 * /notifications/mark-as-read:
 *   post:
 *     summary: Segna tutte le notifiche come lette
 *     description: Segna tutte le notifiche dell'utente autenticato come lette
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifiche segnate come lette con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: All notifications marked as read
 *             example:
 *               status: success
 *               data:
 *                 message: All notifications marked as read
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: UNAUTHORIZED
 *               message: User not authenticated
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: INTERNAL_SERVER_ERROR
 *               message: Failed to mark all notifications as read
 */
router.post('/notifications/mark-as-read', authenticateToken, notificationController.markAllNotificationsAsRead.bind(notificationController));

/**
 * @swagger
 * /notifications/{notificationId}/mark-as-read:
 *   post:
 *     summary: Segna una notifica come letta
 *     description: Segna una specifica notifica come letta impostando il timestamp readAt
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID della notifica da segnare come letta
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Notifica segnata come letta con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Notification marked as read
 *             example:
 *               status: success
 *               data:
 *                 message: Notification marked as read
 *       400:
 *         description: Richiesta non valida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: BAD_REQUEST
 *               message: Notification ID is required
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: UNAUTHORIZED
 *               message: User not authenticated
 *       404:
 *         description: Notifica non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: NOT_FOUND
 *               message: Notification not found
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: INTERNAL_SERVER_ERROR
 *               message: Failed to mark notification as read
 */
router.post('/notifications/:notificationId/mark-as-read', authenticateToken, notificationController.markNotificationAsRead.bind(notificationController));

/**
 * @swagger
 * /notifications/{notificationId}/mark-as-unread:
 *   post:
 *     summary: Segna una notifica come non letta
 *     description: Segna una specifica notifica come non letta rimuovendo il timestamp readAt
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID della notifica da segnare come non letta
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Notifica segnata come non letta con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Notification marked as unread
 *             example:
 *               status: success
 *               data:
 *                 message: Notification marked as unread
 *       400:
 *         description: Richiesta non valida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: BAD_REQUEST
 *               message: Notification ID is required
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: UNAUTHORIZED
 *               message: User not authenticated
 *       404:
 *         description: Notifica non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: NOT_FOUND
 *               message: Notification not found
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: INTERNAL_SERVER_ERROR
 *               message: Failed to mark notification as unread
 */
router.post('/notifications/:notificationId/mark-as-unread', authenticateToken, notificationController.markNotificationAsUnread.bind(notificationController));

/**
 * @swagger
 * /notifications/{notificationId}:
 *   delete:
 *     summary: Elimina una notifica
 *     description: Elimina definitivamente una notifica dell'utente autenticato
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID della notifica da eliminare
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Notifica eliminata con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Notification deleted successfully
 *             example:
 *               status: success
 *               data:
 *                 message: Notification deleted successfully
 *       400:
 *         description: Richiesta non valida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: BAD_REQUEST
 *               message: Notification ID is required
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: UNAUTHORIZED
 *               message: User not authenticated
 *       404:
 *         description: Notifica non trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: NOT_FOUND
 *               message: Notification not found
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: INTERNAL_SERVER_ERROR
 *               message: Failed to delete notification
 */
router.delete('/notifications/:notificationId', authenticateToken, notificationController.deleteNotification.bind(notificationController));

/**
 * @swagger
 * /promotional-message:
 *   post:
 *     summary: Invia messaggio promozionale a tutti gli utenti con consenso
 *     description: Permette agli amministratori e owner di inviare messaggi promozionali a tutti gli utenti che hanno abilitato le notifiche promozionali. Richiede ruolo admin o owner.
 *     tags:
 *       - Notifications
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 description: Titolo del messaggio promozionale
 *                 example: "Offerta Speciale Estate 2025"
 *               message:
 *                 type: string
 *                 maxLength: 4000
 *                 description: Corpo del messaggio promozionale
 *                 example: "Approfitta del 20% di sconto su tutte le commissioni per le proprietà pubblicate questo mese!"
 *               actionUrl:
 *                 type: string
 *                 maxLength: 2000
 *                 description: URL opzionale per un'azione (link a una pagina specifica)
 *                 example: "/properties/upload"
 *               imageUrl:
 *                 type: string
 *                 maxLength: 2000
 *                 description: URL opzionale per un'immagine associata al messaggio
 *                 example: "https://example.com/promo-summer-2025.jpg"
 *     responses:
 *       200:
 *         description: Messaggio promozionale inviato con successo
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         sentCount:
 *                           type: integer
 *                           description: Numero di utenti a cui è stato inviato il messaggio
 *                           example: 150
 *                     message:
 *                       type: string
 *                       example: "Promotional message sent successfully to 150 users"
 *             example:
 *               status: success
 *               data:
 *                 sentCount: 150
 *               message: Promotional message sent successfully to 150 users
 *       400:
 *         description: Dati di input non validi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: VALIDATION_ERROR
 *               message: Validation failed
 *               errors:
 *                 - "Title is required"
 *                 - "Message is required"
 *       401:
 *         description: Utente non autenticato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: UNAUTHORIZED
 *               message: User not authenticated
 *       403:
 *         description: Permessi insufficienti (ruolo non autorizzato)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: FORBIDDEN
 *               message: Insufficient permissions
 *       500:
 *         description: Errore interno del server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: error
 *               code: INTERNAL_SERVER_ERROR
 *               message: Failed to send promotional message
 */
router.post('/promotional-message', authenticateToken, requireAdminOrOwner, notificationController.sendPromotionalMessage.bind(notificationController));

export default router;