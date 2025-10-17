import { Agency } from '@service-shared/models/Agency';
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
  linkedProviders: Array<OAuthProvider>;
  lastLoginAt?: Date;
  agency?: Agency;
  createdAt: Date;
  updatedAt: Date;
  licenseNumber?: string;
  biography?: string;
  specializations?: string[];
}
