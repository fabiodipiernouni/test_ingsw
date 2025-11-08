import { PagedRequest } from '@service-shared/dto/pagedRequest';
import { NotificationType } from '@core-services/shared/types/notification.types';

export interface GetNotificationsRequest {
  pagedRequest?: PagedRequest;
  isRead?: boolean;
  type?: NotificationType;
}
