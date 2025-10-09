import { Agency } from './agency.model';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'agent' | 'admin';
  avatar?: string;
  phone?: string;
  isVerified: boolean;
  isActive: boolean;
  linkedProviders?: ('google' | 'github' | 'facebook')[];
  lastLoginAt?: Date;
  acceptedTermsAt?: Date;
  acceptedPrivacyAt?: Date;
  shouldChangePassword?: boolean;

  // Agent-specific fields
  licenseNumber?: string;
  biography?: string;
  rating?: number;
  reviewsCount?: number;
  specializations?: string[];

  // Agency association
  agency?: Agency;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent extends User {
  role: 'agent';
  agency?: Agency;
  biography?: string;
  rating: number;
  reviewsCount: number;
}

//TODO: interface Admin

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType?: string;
  isNewUser?: boolean;
  rememberMe?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LinkOAuthRequest {
  accessToken: string;
}

export interface ErrorResponse {
  success: boolean;
  error: string;
  message: string;
  timestamp: string;
  path: string;
}

export interface OAuthLinkResponse {
  success: boolean;
  message: string;
  linkedProvider: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  biography?: string;
  specializations?: string[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface UserActivity {
  views: any[];
  searches: number;
  favorites: number;
  totalActivity: number;
}

export interface UserPreferences {
  currency: 'EUR' | 'USD';
  language: 'it' | 'en';
  timezone: string;
  marketingEmails: boolean;
  weeklyDigest: boolean;
  profileVisibility: boolean;
}

export type OAuthProvider = 'google' | 'github';
