import { IsOptional, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PagedRequest } from '@shared/dto/pagedRequest';
import { NOTIFICATION_TYPES, NotificationType } from '@shared/types/notification.types';

export class GetNotificationsRequest {
  @IsOptional()
  @ValidateNested()
  @Type(() => PagedRequest)
  pagedRequest?: PagedRequest;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRead?: boolean;

  @IsOptional()
  @IsEnum(NOTIFICATION_TYPES)
  type?: NotificationType;

}
