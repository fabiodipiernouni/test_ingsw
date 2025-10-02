import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'agent' | 'admin';
  avatar?: string;
  phone?: string;
  isVerified: boolean;
  linkedProviders: Array<'google' | 'github'>;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: any;
  userAgency?: any;
  file?: any;
  files?: { [fieldname: string]: Express.Multer.File[]; } | Express.Multer.File[] | undefined;
}

export interface PropertyAddress {
  street: string;
  city: string;
  province: string;
  zipCode: string;
  country: string;
}

export interface PropertyLocation {
  latitude: number;
  longitude: number;
}

export interface PropertyImage {
  id: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
  order: number;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  propertyType: 'apartment' | 'villa' | 'house' | 'loft' | 'office' | 'commercial' | 'land';
  listingType: 'sale' | 'rent';
  status: 'active' | 'pending' | 'sold' | 'rented' | 'withdrawn';
  bedrooms: number;
  bathrooms: number;
  area: number;
  floor?: string;
  energyClass?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  hasElevator: boolean;
  hasBalcony: boolean;
  hasGarden: boolean;
  hasParking: boolean;
  features: string[];
  address: PropertyAddress;
  location: PropertyLocation;
  images: PropertyImage[];
  agentId: string;
  isActive: boolean;
  views: number;
  favorites: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchFilters {
  location?: string;
  propertyType?: Property['propertyType'];
  listingType?: Property['listingType'];
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  areaMin?: number;
  areaMax?: number;
  energyClass?: Property['energyClass'];
  hasElevator?: boolean;
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasParking?: boolean;
  radius?: number;
  centerLat?: number;
  centerLng?: number;
  features?: string[];
  sortBy?: 'price_asc' | 'price_desc' | 'area_asc' | 'area_desc' | 'date_desc' | 'relevance';
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResult<T> {
  data: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: Date;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
  timestamp: Date;
  path: string;
}

// TODO rivedere bene le categorie di notifiche
export type NotificationType = 
  | 'new_property_match'
  | 'price_change'
  | 'property_status_change'
  | 'saved_search_results'
  | 'account_verification'
  | 'property_view'
  | 'favorite_added'
  | 'message_received'
  | 'system_maintenance'
  | 'payment_reminder'
  | 'new_review'
  | 'property_approved'
  | 'property_expired';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  channel: 'in_app' | 'email' | 'push' | 'sms';
  actionUrl?: string;
  imageUrl?: string;
  expiresAt?: Date;
  createdAt: Date;
  readAt?: Date;
  scheduledAt?: Date;
  sentAt?: Date;
}