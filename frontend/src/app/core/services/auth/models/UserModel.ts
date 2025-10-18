import { AgencyModel } from '@service-shared/models/AgencyModel';
import { OAuthProvider } from '@core-services/auth/models/OAuthProvider';
import { UserRole } from '@core-services/auth/models/UserRole';

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
  lastLoginAt?: Date;
  linkedProviders?: Array<OAuthProvider>;
  agency?: AgencyModel;
  createdAt: Date;
  updatedAt: Date;
  licenseNumber?: string;
  biography?: string;
  specializations?: string[];
}
