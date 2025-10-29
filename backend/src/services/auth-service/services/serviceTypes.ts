import { OAuthProvider } from '@shared/types/auth.types';

export interface OAuthUrlParams {
  provider: OAuthProvider;
  state?: string;
}

export interface OAuthCallbackData {
  code: string;
  state?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}