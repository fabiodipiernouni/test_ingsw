export interface CompleteNewPasswordData {
  email: string;
  newPassword: string;
  session: string;
}

export interface OAuthUrlParams {
  provider: 'google' | 'facebook' | 'apple';
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