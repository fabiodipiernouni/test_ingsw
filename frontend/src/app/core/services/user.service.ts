import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '@core/entities/user.model';

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  biography?: string;
  specializations?: string[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserActivity {
  views: any[];
  searches: number;
  favorites: number;
  totalActivity: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3004';

  /**
   * Get current user profile
   */
  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/users/profile`);
  }

  /**
   * Update user profile
   */
  updateProfile(updates: UpdateProfileRequest): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/users/profile`, updates);
  }

  /**
   * Change user password
   */
  changePassword(request: ChangePasswordRequest): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`http://localhost:3001/auth/change-password`, request);
  }

  /**
   * Upload user avatar
   */
  uploadAvatar(file: File): Observable<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<{ avatarUrl: string }>(`${this.API_URL}/users/avatar`, formData);
  }

  /**
   * Get user activity (views, searches, favorites)
   */
  getUserActivity(type?: string, limit?: number, days?: number): Observable<UserActivity> {
    let params: any = {};
    if (type) params.type = type;
    if (limit) params.limit = limit;
    if (days) params.days = days;

    return this.http.get<UserActivity>(`${this.API_URL}/users/activity`, { params });
  }

  /**
   * Get public user profile by ID
   */
  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/users/${userId}`);
  }

  /**
   * Add property to favorites
   */
  addToFavorites(propertyId: string): Observable<{ favoriteId: string }> {
    return this.http.post<{ favoriteId: string }>(`${this.API_URL}/users/favorites`, { propertyId });
  }

  /**
   * Remove property from favorites
   */
  removeFromFavorites(favoriteId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/users/favorites/${favoriteId}`);
  }

  /**
   * Check if property is in favorites
   */
  checkFavoriteStatus(propertyId: string): Observable<{ isFavorite: boolean; favoriteId?: string }> {
    return this.http.get<{ isFavorite: boolean; favoriteId?: string }>(`${this.API_URL}/users/favorites/${propertyId}`);
  }

  /**
   * Send email verification OTP
   */
  sendEmailVerificationOtp(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`http://localhost:3001/auth/send-email-verification`, { email });
  }

  /**
   * Verify email with OTP code
   */
  verifyEmailOtp(email: string, otpCode: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`http://localhost:3001/auth/verify-email`, { email, otpCode });
  }

  /**
   * Update user notification preferences
   */
  updateNotificationPreferences(preferences: any): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${this.API_URL}/users/notification-preferences`, preferences);
  }
}
