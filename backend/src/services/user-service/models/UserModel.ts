import { Agency } from 'src/services/agency-service/models/Agency';

export interface UserModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'agent' | 'admin';
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