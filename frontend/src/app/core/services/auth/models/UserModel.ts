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
  passwordChangeRequired: boolean;
  isActive: boolean;
  linkedProviders: Array<OAuthProvider>;
  lastLoginAt?: Date;
  agency?: Agency;
  createdAt: Date;
  updatedAt: Date;
}
