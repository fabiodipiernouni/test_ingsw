export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'agent' | 'admin';
  avatar?: string;
  phone?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent extends User {
  role: 'agent';
  agencyName: string;
  licenseNumber: string;
  biography?: string;
  rating: number;
  reviewsCount: number;
  specializations: string[];
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
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
  role: 'client' | 'agent';
  agencyName?: string;
  licenseNumber?: string;
}
