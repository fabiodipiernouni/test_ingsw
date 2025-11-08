import { UserResponse } from './UserResponse';

export type AuthResponse = {
  user: UserResponse;
  accessToken: string;
  idToken: string;
  refreshToken: string;
  tokenType: string;
};
