import { OAuthProvider } from '@shared/types/auth.types';
import { AgencyResponse } from './AgencyResponse';
import { UserRole } from '@shared/types/user.types';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  isVerified: boolean;
  passwordChangeRequired: boolean;
  linkedProviders?: Array<OAuthProvider>;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  agency?: AgencyResponse;
  licenseNumber?: string;
  biography?: string;
  specializations?: string[];
}