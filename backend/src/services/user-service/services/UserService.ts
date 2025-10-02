import { User } from '@shared/database/models/User';
import { Agency } from '@shared/database/models/Agency';
import { UserPreferences } from '@shared/database/models/UserPreferences';
import { NotificationPreferences } from '@shared/database/models/NotificationPreferences';
import { generateSecurePassword } from '@shared/utils/passwordHelpers';
import logger from '@shared/utils/logger';

// Types
interface UserProfileResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  shouldChangePassword?: boolean;
  avatar?: string;
  // Campi specifici per agenti (opzionali per altri ruoli)
  licenseNumber?: string;
  biography?: string;
  rating?: number;
  reviewsCount?: number;
  specializations?: string[];
  // Date
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  // Relazioni
  agency?: AgencyResponse;
  userPreferences?: UserPreferencesResponse;
}

interface AgencyResponse {
  id: string;
  name: string;
  address?: {
    street?: string;
    city?: string;
    province?: string;
    zipCode?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
}

interface UserPreferencesResponse {
  id: string;
  language: string;
  currency: string;
  timezone: string;
  theme: string;
  dateFormat: string;
  measurementUnit: string;
  searchRadius: number;
  preferredLocations?: string[];
}

interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}

interface UpdatePreferencesData {
  language?: string;
  currency?: string;
  timezone?: string;
  theme?: string;
  dateFormat?: string;
  measurementUnit?: string;
  searchRadius?: number;
  preferredLocations?: string[];
}

interface UpdateNotificationPreferencesData {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  marketing?: boolean;
  propertyAlerts?: boolean;
  searchAlerts?: boolean;
  priceAlerts?: boolean;
  favoriteAlerts?: boolean;
}

interface CreateAgentData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  licenseNumber: string; // Obbligatorio per gli agenti
  biography?: string;
  specializations?: string[];
}

interface CreateAdminData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  permissions?: string[];
}

interface CreateUserResponse {
  user: UserProfileResponse;
  password: string;
}

// Custom error classes
class ValidationError extends Error {
  public details: any;
  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class UserService {
  /**
   * Ottiene il profilo utente completo
   */
  async getUserProfile(userId: string): Promise<UserProfileResponse> {
    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            model: Agency,
            as: 'agency',
            attributes: ['id', 'name', 'address', 'phone', 'email', 'website']
          },
          {
            model: UserPreferences,
            as: 'userPreferences'
          }
        ],
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return this.formatUserProfileResponse(user);
    } catch (error) {
      logger.error('Error in getUserProfile service:', error);
      throw error;
    }
  }

  /**
   * Ottiene un utente per ID (versione pubblica)
   */
  async getUserById(userId: string): Promise<Partial<UserProfileResponse>> {
    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            model: Agency,
            as: 'agency',
            attributes: ['id', 'name', 'address', 'phone', 'email', 'website']
          }
        ],
        attributes: ['id', 'firstName', 'lastName', 'avatar', 'role', 'isActive', 'createdAt']
      });

      if (!user || !user.isActive) {
        throw new NotFoundError('User not found');
      }

      return this.formatPublicUserResponse(user);
    } catch (error) {
      logger.error('Error in getUserById service:', error);
      throw error;
    }
  }

  /**
   * Aggiorna il profilo utente
   */
  async updateUserProfile(userId: string, updateData: UpdateProfileData): Promise<UserProfileResponse> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verifica email duplicata se viene cambiata
      if (updateData.firstName || updateData.lastName || updateData.phone || updateData.avatar) {
        await user.update(updateData);
      }

      // Ricarica con le associazioni
      const updatedUser = await User.findByPk(userId, {
        include: [
          {
            model: Agency,
            as: 'agency',
            attributes: ['id', 'name', 'address', 'phone', 'email', 'website']
          },
          {
            model: UserPreferences,
            as: 'userPreferences'
          }
        ],
        attributes: { exclude: ['password'] }
      });

      return this.formatUserProfileResponse(updatedUser!);
    } catch (error) {
      logger.error('Error in updateUserProfile service:', error);
      throw error;
    }
  }

  /**
   * Ottiene le preferenze utente
   */
  async getUserPreferences(userId: string): Promise<UserPreferencesResponse> {
    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            model: UserPreferences,
            as: 'userPreferences'
          }
        ]
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (!user.userPreferences || user.userPreferences.length === 0) {
        // Crea preferenze predefinite se non esistono
        const defaultPreferences = await UserPreferences.create({ userId });
        return this.formatUserPreferencesResponse(defaultPreferences);
      }

      return this.formatUserPreferencesResponse(user.userPreferences[0]);
    } catch (error) {
      logger.error('Error in getUserPreferences service:', error);
      throw error;
    }
  }

  /**
   * Aggiorna le preferenze utente
   */
  async updateUserPreferences(userId: string, updateData: UpdatePreferencesData): Promise<UserPreferencesResponse> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      let preferences = await UserPreferences.findOne({ where: { userId } });
      
      if (!preferences) {
        // Crea nuove preferenze se non esistono
        preferences = await UserPreferences.create({ userId, ...updateData });
      } else {
        // Aggiorna esistenti
        await preferences.update(updateData);
      }

      return this.formatUserPreferencesResponse(preferences);
    } catch (error) {
      logger.error('Error in updateUserPreferences service:', error);
      throw error;
    }
  }

  /**
   * Ottiene le preferenze di notifica dell'utente
   */
  async getNotificationPreferences(userId: string): Promise<any> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      let notificationPrefs = await NotificationPreferences.findOne({ where: { userId } });
      
      if (!notificationPrefs) {
        // Crea preferenze di default se non esistono
        notificationPrefs = await NotificationPreferences.create({ 
          userId,
          emailNotifications: true,
          pushNotifications: false
        });
      }

      return this.formatNotificationPreferencesResponse(notificationPrefs);
    } catch (error) {
      logger.error('Error in getNotificationPreferences service:', error);
      throw error;
    }
  }

  /**
   * Aggiorna le preferenze di notifica
   */
  async updateNotificationPreferences(userId: string, updateData: UpdateNotificationPreferencesData): Promise<any> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      let notificationPrefs = await NotificationPreferences.findOne({ where: { userId } });
      
      if (!notificationPrefs) {
        // Crea nuove preferenze se non esistono
        notificationPrefs = await NotificationPreferences.create({ userId, ...updateData });
      } else {
        // Aggiorna esistenti
        await notificationPrefs.update(updateData);
      }

      return this.formatNotificationPreferencesResponse(notificationPrefs);
    } catch (error) {
      logger.error('Error in updateNotificationPreferences service:', error);
      throw error;
    }
  }

  /**
   * Carica avatar utente
   */
  async uploadAvatar(userId: string, avatarUrl: string): Promise<UserProfileResponse> {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      await user.update({ avatar: avatarUrl });

      // Ricarica con le associazioni
      const updatedUser = await User.findByPk(userId, {
        include: [
          {
            model: Agency,
            as: 'agency',
            attributes: ['id', 'name', 'address', 'phone', 'email', 'website']
          },
          {
            model: UserPreferences,
            as: 'userPreferences'
          }
        ],
        attributes: { exclude: ['password'] }
      });

      return this.formatUserProfileResponse(updatedUser!);
    } catch (error) {
      logger.error('Error in uploadAvatar service:', error);
      throw error;
    }
  }

  /**
   * Crea un nuovo agente (solo per admin)
   */
  async createAgent(adminUserId: string, agentData: CreateAgentData): Promise<CreateUserResponse> {
    try {
      // Verifica che l'utente sia admin
      const adminUser = await User.findByPk(adminUserId);
      if (!adminUser || adminUser.role !== 'admin') {
        throw new ForbiddenError('Only administrators can create agents');
      }

      // Verifica email duplicata
      const existingUser = await User.findOne({ where: { email: agentData.email } });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Genera password sicura
      const password = generateSecurePassword(12);

      // Crea l'agente nella stessa agenzia dell'admin
      const agent = await User.create({
        ...agentData,
        role: 'agent',
        agencyId: adminUser.agencyId, // Assegna alla stessa agenzia dell'admin
        isActive: true,
        isVerified: false,
        password: password,
        shouldChangePassword: true, // sarà consigliato di cambiare al primo login
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date()
      });

      // Crea preferenze predefinite
      await UserPreferences.create({ userId: agent.id });
      await NotificationPreferences.create({ userId: agent.id });

      // Restituisce profilo con password separata
      return {
        user: this.formatUserProfileResponse(agent),
        password: password
      };
    } catch (error) {
      logger.error('Error in createAgent service:', error);
      throw error;
    }
  }

  /**
   * Crea un nuovo admin (solo per il creatore dell'agenzia)
   */
  async createAdmin(creatorUserId: string, adminData: CreateAdminData): Promise<CreateUserResponse> {
    try {
      // Verifica che l'utente sia admin
      const currentUser = await User.findByPk(creatorUserId, {
        include: [{ model: Agency, as: 'agency' }]
      });
      
      if (!currentUser || currentUser.role !== 'admin') {
        throw new ForbiddenError('Only administrators can create admins');
      }

      // Verifica che l'utente sia il creatore dell'agenzia
      if (!currentUser.agency || currentUser.agency.createdBy !== creatorUserId) {
        throw new ForbiddenError('Only the agency creator can create new admins');
      }

      // L'admin deve essere creato nella stessa agenzia del creatore
      const agencyId = currentUser.agencyId;
      if (!agencyId) {
        throw new ForbiddenError('Current user must belong to an agency');
      }

      // Verifica email duplicata
      const existingUser = await User.findOne({ where: { email: adminData.email } });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Genera password sicura
      const password = generateSecurePassword(12);

      // Crea l'admin nella stessa agenzia del creatore
      const newAdmin = await User.create({
        ...adminData,
        role: 'admin',
        agencyId: agencyId, // Assegna alla stessa agenzia del creatore
        isActive: true,
        isVerified: false,
        password: password,
        shouldChangePassword: true, // sarà consigliato di cambiare al primo login
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date()
      });

      // Crea preferenze predefinite
      await UserPreferences.create({ userId: newAdmin.id });
      await NotificationPreferences.create({ userId: newAdmin.id });

      // Restituisce profilo con password separata
      return {
        user: this.formatUserProfileResponse(newAdmin),
        password: password
      };
    } catch (error) {
      logger.error('Error in createAdmin service:', error);
      throw error;
    }
  }

  /**
   * Formatta la risposta completa del profilo utente
   */
  private formatUserProfileResponse(user: User): UserProfileResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      shouldChangePassword: user.shouldChangePassword,
      avatar: user.avatar,
      // Campi specifici per agenti
      licenseNumber: user.licenseNumber,
      biography: user.biography,
      rating: user.rating,
      reviewsCount: user.reviewsCount,
      specializations: user.specializations,
      // Date
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
      // Relazioni
      agency: user.agency ? this.formatAgencyResponse(user.agency) : undefined,
      userPreferences: user.userPreferences && user.userPreferences.length > 0 ? this.formatUserPreferencesResponse(user.userPreferences[0]) : undefined
    };
  }

  /**
   * Formatta la risposta pubblica dell'utente (informazioni limitate)
   */
  private formatPublicUserResponse(user: User): Partial<UserProfileResponse> {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      agency: user.agency ? this.formatAgencyResponse(user.agency) : undefined
    };
  }

  /**
   * Formatta la risposta dell'agenzia
   */
  private formatAgencyResponse(agency: Agency): AgencyResponse {
    return {
      id: agency.id,
      name: agency.name,
      address: {
        street: agency.street,
        city: agency.city,
        province: agency.province,
        zipCode: agency.zipCode,
        country: agency.country
      },
      phone: agency.phone,
      email: agency.email,
      website: agency.website
    };
  }

  /**
   * Formatta la risposta delle preferenze utente
   */
  private formatUserPreferencesResponse(preferences: UserPreferences): UserPreferencesResponse {
    return {
      id: preferences.id,
      language: preferences.language,
      currency: preferences.currency,
      timezone: preferences.timezone,
      theme: 'light', // Default value - could be added to model
      dateFormat: 'DD/MM/YYYY', // Default value - could be added to model
      measurementUnit: 'metric', // Default value - could be added to model
      searchRadius: preferences.searchRadius,
      preferredLocations: preferences.preferredLocations
    };
  }

  /**
   * Formatta la risposta delle preferenze di notifica
   */
  private formatNotificationPreferencesResponse(preferences: NotificationPreferences): any {
    return {
      id: preferences.id,
      emailNotifications: preferences.emailNotifications,
      pushNotifications: preferences.pushNotifications,
      marketing: false, // Not available in model
      propertyAlerts: true, // Default value
      searchAlerts: true, // Default value
      priceAlerts: true, // Default value
      favoriteAlerts: true // Default value
    };
  }
}

export const userService = new UserService();