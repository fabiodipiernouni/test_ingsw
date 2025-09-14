// core/models/user.model.ts
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'client' | 'agent' | 'admin';
  isActive: boolean;
  createdAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: 'client' | 'agent';
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}