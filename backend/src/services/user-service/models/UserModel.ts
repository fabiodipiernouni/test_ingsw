import { Agency } from 'src/services/agency-service/models/Agency';
import { UserRole } from '@user/models/UserRole';

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
  linkedProviders: Array<'google' | 'github' | 'facebook'>;
  cognitoSub?: string;
  cognitoUsername?: string;
  lastLoginAt?: Date;
  agencyId?: string;
  Agency?: Agency;
  createdAt: Date;
  updatedAt: Date;
}