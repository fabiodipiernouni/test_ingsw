import { NotificationType } from '@core-services/shared/types/notification.types';

export class UpdateNotificationPreferencesDto {
  enabledNotificationTypes!: NotificationType[];
}
