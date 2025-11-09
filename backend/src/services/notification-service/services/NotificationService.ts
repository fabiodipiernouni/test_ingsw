import { Notification } from '@shared/database/models/Notification';
import { User } from '@shared/database/models/User';
import { Agency } from '@shared/database/models/Agency';
import { PagedResult } from '@shared/dto/pagedResult';
import { NotificationDto } from '@notification/dto/NotificationResponse';
import { NotificationCountDto } from '@notification/dto/NotificationCountResponse';
import { SendPromotionalMessageDto } from '@notification/dto/SendPromotionalMessageDto';
import logger from '@shared/utils/logger';
import { GetNotificationsRequest } from '../dto/GetNotificationsRequest';
import { Op, Sequelize } from 'sequelize';
import { calculateTotalPages } from '@shared/utils/helpers';

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class NotificationService {
    private convertNotificationToDto(notification: Notification): NotificationDto {
        // Recupera l'agenzia del creatore se presente
        let agency: { id: string; name: string } | undefined;
        
        if (notification.creator?.agency) {
            agency = {
                id: notification.creator.agency.id,
                name: notification.creator.agency.name
            };
        }

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
            agency: agency,
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
                offset,
                include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['id', 'agencyId'],
                        required: false,
                        include: [
                            {
                                model: Agency,
                                as: 'agency',
                                attributes: ['id', 'name'],
                                required: false
                            }
                        ]
                    }
                ]
            });

            // Map to DTOs
            const data: NotificationDto[] = notifications.map(notification => this.convertNotificationToDto(notification));

            const totalPages = calculateTotalPages(totalCount, limit);

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

    /**
     * Invia un messaggio promozionale a tutti gli utenti che hanno attivato il consenso
     */
    async sendPromotionalMessageToAll(dto: SendPromotionalMessageDto, createdBy: string): Promise<{ sentCount: number }> {
        try {
            // Trova tutti gli utenti che hanno abilitato le notifiche promozionali
            // Usa Sequelize.literal per query Oracle JSON_TABLE
            const eligibleUsers = await User.findAll({
                where: {
                    isActive: true,
                    [Op.and]: Sequelize.literal(`
                        EXISTS (
                            SELECT 1 FROM JSON_TABLE(
                                enabled_notification_types,
                                '$[*]' COLUMNS (notification_type VARCHAR2(100) PATH '$')
                            ) jt
                            WHERE jt.notification_type = 'promotional_message'
                        )
                    `)
                },
                attributes: ['id']
            });

            logger.info(`Sending promotional message to ${eligibleUsers.length} users`, { createdBy });

            // Crea una notifica per ogni utente
            const notifications = eligibleUsers.map(user => ({
                userId: user.id,
                type: 'promotional_message' as const,
                title: dto.title,
                message: dto.message,
                actionUrl: dto.actionUrl,
                imageUrl: dto.imageUrl,
                createdBy: createdBy,
                sentAt: null as any // Sarà impostato quando l'email sarà inviata
            }));

            // Bulk insert solo se ci sono utenti eligibili
            if (notifications.length > 0) {
                await Notification.bulkCreate(notifications);
            }

            logger.info(`Successfully sent promotional message to ${eligibleUsers.length} users`);

            return { sentCount: eligibleUsers.length };
        } catch (error) {
            logger.error('Error in sendPromotionalMessageToAll NotificationService:', error);
            throw error;
        }
    }
}