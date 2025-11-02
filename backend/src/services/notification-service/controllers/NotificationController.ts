import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@shared/dto/AuthenticatedRequest';
import { NotificationService } from '@notification/services/NotificationService';
import { GetNotificationsRequest } from '@notification/dto/GetNotificationsRequest';
import { SendPromotionalMessageDto } from '@notification/dto/SendPromotionalMessageDto';
import { setResponseAsSuccess, setResponseAsError, setResponseAsValidationError } from '@shared/utils/helpers';
import logger from '@shared/utils/logger';
import { NotificationType } from '@shared/types/notification.types';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { formatValidationErrors } from '@shared/utils/helpers';

const notificationService = new NotificationService();

export class NotificationController {
    /**
     * Get notifications with pagination and filters
     * GET /notifications
     */
    async getNotifications(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
        const userId = req.user?.id;

        if (!userId) {
            setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
            return;
        }

        try {
            const getNotificationsRequest: GetNotificationsRequest = {
                pagedRequest: {
                    page: req.query.page ? parseInt(req.query.page as string) : 1,
                    limit: Math.min(req.query.limit ? parseInt(req.query.limit as string) : 20, 100),
                    sortBy: (req.query.sortBy as string) || 'createdAt',
                    sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC'
                },
                isRead: req.query.isRead !== undefined 
                    ? req.query.isRead === 'true' 
                    : undefined,
                type: req.query.type as NotificationType | undefined
            };
            const result = await notificationService.getNotifications(
                userId,
                getNotificationsRequest
            );

            setResponseAsSuccess(res, result);
        } catch (error: any) {
            logger.error('Error in getNotifications NotificationController:', error);
            setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get notifications', 500);
        }
    }

    /**
     * Mark notification as read
     * POST /notifications/:notificationId/mark-as-read
     */
    async markNotificationAsRead(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
        const userId = req.user?.id;
        const notificationId = req.params.notificationId;

        if (!userId) {
            setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
            return;
        }

        if (!notificationId) {
            setResponseAsError(res, 'BAD_REQUEST', 'Notification ID is required', 400);
            return;
        }

        try {
            await notificationService.markNotificationAsRead(userId, notificationId);
            setResponseAsSuccess(res, { message: 'Notification marked as read' });
        } catch (error: any) {
            logger.error('Error in markNotificationAsRead NotificationController:', error);
            
            if (error.name === 'NotFoundError') {
                setResponseAsError(res, 'NOT_FOUND', error.message, 404);
                return;
            }

            setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to mark notification as read', 500);
        }
    }

    /**
     * Mark notification as unread
     * POST /notifications/:notificationId/mark-as-unread
     */
    async markNotificationAsUnread(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
        const userId = req.user?.id;
        const notificationId = req.params.notificationId;

        if (!userId) {
            setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
            return;
        }

        if (!notificationId) {
            setResponseAsError(res, 'BAD_REQUEST', 'Notification ID is required', 400);
            return;
        }

        try {
            await notificationService.markNotificationAsUnread(userId, notificationId);
            setResponseAsSuccess(res, { message: 'Notification marked as unread' });
        } catch (error: any) {
            logger.error('Error in markNotificationAsUnread NotificationController:', error);
            
            if (error.name === 'NotFoundError') {
                setResponseAsError(res, 'NOT_FOUND', error.message, 404);
                return;
            }

            setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to mark notification as unread', 500);
        }
    }

    /**
     * Mark all notifications as read
     * POST /notifications/mark-as-read
     */
    async markAllNotificationsAsRead(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
        const userId = req.user?.id;

        if (!userId) {
            setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
            return;
        }

        try {
            await notificationService.markAllNotificationsAsRead(userId);
            setResponseAsSuccess(res, { message: 'All notifications marked as read' });
        } catch (error: any) {
            logger.error('Error in markAllNotificationsAsRead NotificationController:', error);
            setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to mark all notifications as read', 500);
        }
    }

    /**
     * Delete notification
     * DELETE /notifications/:notificationId
     */
    async deleteNotification(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
        const userId = req.user?.id;
        const notificationId = req.params.notificationId;

        if (!userId) {
            setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
            return;
        }

        if (!notificationId) {
            setResponseAsError(res, 'BAD_REQUEST', 'Notification ID is required', 400);
            return;
        }

        try {
            await notificationService.deleteNotification(userId, notificationId);
            setResponseAsSuccess(res, { message: 'Notification deleted successfully' });
        } catch (error: any) {
            logger.error('Error in deleteNotification NotificationController:', error);
            
            if (error.name === 'NotFoundError') {
                setResponseAsError(res, 'NOT_FOUND', error.message, 404);
                return;
            }

            setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to delete notification', 500);
        }
    }

    /**
     * Get unread notifications count
     * GET /notifications/unread/count
     */
    async getUnreadNotificationsCount(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
        const userId = req.user?.id;

        if (!userId) {
            setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
            return;
        }

        try {
            const result = await notificationService.getUnreadNotificationsCount(userId);
            setResponseAsSuccess(res, result);
        } catch (error: any) {
            logger.error('Error in getUnreadNotificationsCount NotificationController:', error);
            setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to get unread notifications count', 500);
        }
    }

    /**
     * Send promotional message to all users with consent
     * POST /promotional-message
     */
    async sendPromotionalMessage(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
        try {
            const dto = plainToInstance(SendPromotionalMessageDto, req.body);

            const errors = await validate(dto);
            if (errors.length > 0) {
                const strErrors = formatValidationErrors(errors);
                setResponseAsValidationError(res, strErrors);
                return;
            }

            logger.info('Admin/Owner sending promotional message', {
                userId: req.user?.id,
                userRole: req.user?.role,
                title: dto.title
            });

            const createdBy = req.user?.id;
            if (!createdBy) {
                setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
                return;
            }

            const result = await notificationService.sendPromotionalMessageToAll(dto, createdBy);

            setResponseAsSuccess(
                res,
                result,
                `Promotional message sent successfully to ${result.sentCount} users`,
                200
            );
        } catch (error: any) {
            logger.error('Error in sendPromotionalMessage NotificationController:', error);
            setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to send promotional message', 500);
        }
    }
}