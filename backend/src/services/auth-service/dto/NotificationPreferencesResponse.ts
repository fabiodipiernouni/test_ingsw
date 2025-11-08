import { NotificationType } from '@shared/types/notification.types';

export interface NotificationPreferencesResponse {
  enabledNotificationTypes: NotificationType[];
}