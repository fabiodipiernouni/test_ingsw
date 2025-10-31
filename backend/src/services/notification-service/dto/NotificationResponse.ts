import { NotificationType } from '@shared/types/notification.types';

export interface NotificationDto {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    isSent: boolean;
    actionUrl?: string;
    imageUrl?: string;
    readAt?: string;
    sentAt?: string;
    createdAt: string;
    updatedAt: string;
}