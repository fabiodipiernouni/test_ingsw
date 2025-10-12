import { Agency } from '../../shared/models/Agency';
import { UserRole } from './UserRole';
import { OAuthProvider } from './OAuthProvider';

export interface UserModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  isVerified: boolean;
  isActive: boolean;
  linkedProviders: Array<OAuthProvider>;
  cognitoSub?: string;
  cognitoUsername?: string;
  lastLoginAt?: Date;
  agencyId?: string;
  Agency?: Agency;
  createdAt: Date;
  updatedAt: Date;
}
