import { UserResponse } from './UserResponse';

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  idToken: string;
  refreshToken: string;
  tokenType: string;
  challenge?: {
    name: string;
    session: string;
  };
}