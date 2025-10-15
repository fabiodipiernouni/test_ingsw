import { AgencyResponse } from './AgencyResponse';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  passwordChangeRequired: boolean;
  createdAt: string;
  updatedAt: string;
  agency?: AgencyResponse;
}