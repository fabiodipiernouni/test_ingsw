import { NotificationType } from '@shared/types/notification.types';
export interface NotificationModel {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    actionUrl?: string;
    imageUrl?: string;
    readAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}