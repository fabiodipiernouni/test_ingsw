import { NotificationType } from '@core-services/shared/types/notification.types';

export interface NotificationPreferencesResponse {
  enabledNotificationTypes: NotificationType[];
}