import { AgencyResponse } from './AgencyResponse';
import { UserRole } from '@services/user-service/models/UserRole';

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
  createdAt: string;
  updatedAt: string;
  agency?: AgencyResponse;
  licenseNumber?: string;
  biography?: string;
  specializations?: string[];
}