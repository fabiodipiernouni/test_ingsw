import { UserResponse } from './UserResponse';

export interface TokenVerificationData {
  user: UserResponse;
  valid: boolean;
}