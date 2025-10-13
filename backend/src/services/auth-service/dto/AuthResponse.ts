import { UserResponse } from './UserResponse';

export type AuthResponseUser = {
  user: UserResponse;
  accessToken: string;
  idToken: string;
  refreshToken: string;
  tokenType: string;
};

export type AuthResponseChallenge = {
  challenge: {
    name: string;
    session: string;
  };
};

export type AuthResponse = 
  | AuthResponseUser
  | AuthResponseChallenge;
