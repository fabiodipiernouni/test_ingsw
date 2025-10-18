import {UserRole} from '@core-services/auth/models/UserRole';
import {AgencyResponse} from '@core-services/auth/dto/AgencyResponse';
import {OAuthProvider} from '@core-services/auth/models/OAuthProvider';

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
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  agency?: AgencyResponse;
  licenseNumber?: string;
  biography?: string;
  specializations?: string[];
}
