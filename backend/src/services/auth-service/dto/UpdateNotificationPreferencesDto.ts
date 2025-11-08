import { IsArray, ArrayUnique, IsEnum } from 'class-validator';
import { NotificationType, NOTIFICATION_TYPES } from '@shared/types/notification.types';

export class UpdateNotificationPreferencesDto {
  @IsArray()
  @ArrayUnique()
  @IsEnum(NOTIFICATION_TYPES, { each: true })
  enabledNotificationTypes!: NotificationType[];

}
