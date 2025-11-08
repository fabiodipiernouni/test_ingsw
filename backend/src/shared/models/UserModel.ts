import { AgencyModel } from '@shared/models/AgencyModel';
import { UserRole } from '@shared/types/user.types';
import { OAuthProvider } from '@shared/types/auth.types';
import { NotificationType } from '@shared/types/notification.types';

export interface UserModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  isVerified: boolean;
  passwordChangeRequired: boolean;
  isActive: boolean;
  linkedProviders: Array<OAuthProvider>;
  cognitoSub?: string;
  lastLoginAt?: Date;
  agencyId?: string;
  Agency?: AgencyModel;
  createdAt: Date;
  updatedAt: Date;
  licenseNumber?: string;
  biography?: string;
  specializations?: string[];
}