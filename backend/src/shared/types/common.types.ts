import { Request } from 'express';
import { UserModel } from '@user/models/UserModel';
import { EnergyClass, ListingType, PropertyType } from '@property/models/types';
import { Agency } from '@shared/database/models';



export interface AuthenticatedRequest extends Request {
  user?: UserModel;
  userAgency?: Agency;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
  path?: string;
}


export interface SearchFilters {
  location?: string;
  propertyType?: PropertyType;
  listingType?: ListingType;
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  areaMin?: number;
  areaMax?: number;
  energyClass?: EnergyClass;
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