import { Agency } from 'src/services/agency-service/models/Agency';
import { UserRole } from '@user/models/UserRole';
import { OAuthProvider } from '@services/auth-service/models/OAuthProvider';

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
  cognitoUsername?: string;
  lastLoginAt?: Date;
  agencyId?: string;
  Agency?: Agency;
  createdAt: Date;
  updatedAt?: Date;
}