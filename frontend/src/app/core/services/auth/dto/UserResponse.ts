import { AgencyResponse } from './AgencyResponse';
import { UserRole } from '../models/UserRole';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  agency?: AgencyResponse;
}