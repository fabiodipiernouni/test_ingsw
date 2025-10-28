import { IsBoolean } from 'class-validator';

export class ToggleNotificationsDto {
  @IsBoolean({ message: 'Il campo notifiche deve essere un valore booleano' })
  isNotificationEnabled: boolean;
}
