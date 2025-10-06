import { User } from '@user/models/user';

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}