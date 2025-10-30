import { NotificationType } from "@core-services/shared/types/notification.types";

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  phone?: string;
  enabledNotificationTypes: NotificationType[];
}