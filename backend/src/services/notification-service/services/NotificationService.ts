import { Notification } from '@shared/database/models/Notification';
import { PagedResult } from '@shared/dto/pagedResult';
import { NotificationDto } from '@notification/dto/NotificationResponse';
import { NotificationCountDto } from '@notification/dto/NotificationCountResponse';
import logger from '@shared/utils/logger';
import { GetNotificationsRequest } from '../dto/GetNotificationsRequest';
import { Op } from 'sequelize';

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class NotificationService {
    private convertNotificationToDto(notification: Notification): NotificationDto {
        return {
            id: notification.id,
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            isRead: notification.isRead,
            isSent: notification.isSent,
            actionUrl: notification.actionUrl,
            imageUrl: notification.imageUrl,
            readAt: notification.readAt?.toISOString(),
            sentAt: notification.sentAt?.toISOString(),
            createdAt: notification.createdAt.toISOString(),
            updatedAt: notification.updatedAt.toISOString()
        };
    }

    async getNotifications(
        userId: string,
        getNotificationsRequest: GetNotificationsRequest
    ): Promise<PagedResult<NotificationDto>> {
        try {
            const page = getNotificationsRequest.pagedRequest?.page || 1;
            const limit = getNotificationsRequest.pagedRequest?.limit || 20;
            const sortBy = getNotificationsRequest.pagedRequest?.sortBy || 'createdAt';
            const sortOrder = getNotificationsRequest.pagedRequest?.sortOrder || 'DESC';
            const isRead = getNotificationsRequest.isRead;
            const type = getNotificationsRequest.type;

            const offset = (page - 1) * limit;

            // Build where clause - include only SENT notifications
            const whereClause: any = { 
                userId,
                sentAt: { [Op.ne]: null } // Only sent notifications
            };
            
            if (isRead !== undefined) {
                whereClause.isRead = isRead;
            }
            
            if (type) {
                whereClause.type = type;
            }

            // Get notifications with pagination
            const { rows: notifications, count: totalCount } = await Notification.findAndCountAll({
                where: whereClause,
                order: [[sortBy, sortOrder]],
                limit,
                offset
            });

            // Map to DTOs
            const data: NotificationDto[] = notifications.map(notification => this.convertNotificationToDto(notification));

            const totalPages = Math.ceil(totalCount / limit);

            const result: PagedResult<NotificationDto> = {
                data,
                totalCount,
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            };
            return result;
        } catch (error) {
            logger.error('Error in getNotifications NotificationService:', error);
            throw error;
        }
    }

    async markNotificationAsRead(
        userId: string,
        notificationId: string
    ): Promise<void> {
        try {
            const notification = await Notification.findOne({
                where: {
                    id: notificationId,
                    userId,
                    sentAt: { [Op.ne]: null } // Only sent notifications
                }
            });

            if (!notification) {
                throw new NotFoundError('Notification not found');
            }

            await notification.markAsRead();
        } catch (error) {
            logger.error('Error in markNotificationAsRead NotificationService:', error);
            throw error;
        }
    }

    async markNotificationAsUnread(
        userId: string,
        notificationId: string
    ): Promise<void> {
        try {
            const notification = await Notification.findOne({
                where: {
                    id: notificationId,
                    userId,
                    sentAt: { [Op.ne]: null } // Only sent notifications
                }
            });

            if (!notification) {
                throw new NotFoundError('Notification not found');
            }

            await notification.markAsUnread();
        } catch (error) {
            logger.error('Error in markNotificationAsUnread NotificationService:', error);
            throw error;
        }
    }

    async markAllNotificationsAsRead(userId: string): Promise<void> {
        try {
            await Notification.markAllAsReadForUser(userId);
        } catch (error) {
            logger.error('Error in markAllNotificationsAsRead NotificationService:', error);
            throw error;
        }
    }

    async deleteNotification(
        userId: string,
        notificationId: string
    ): Promise<void> {
        try {
            const notification = await Notification.findOne({
                where: {
                    id: notificationId,
                    userId,
                    sentAt: { [Op.ne]: null } // Only sent notifications
                }
            });

            if (!notification) {
                throw new NotFoundError('Notification not found');
            }

            await notification.destroy();
        } catch (error) {
            logger.error('Error in deleteNotification NotificationService:', error);
            throw error;
        }
    }

    async getUnreadNotificationsCount(userId: string): Promise<NotificationCountDto> {
        try {
            const count = await Notification.getTotalUnreadCountForUser(userId);
            const dto : NotificationCountDto = { count };
            return dto;
        } catch (error) {
            logger.error('Error in getUnreadNotificationsCount NotificationService:', error);
            throw error;
        }
    }
}