import { User } from '@shared/database/models/User';
import { Agency } from '@shared/database/models/Agency';
import { UserPreferences } from '@shared/database/models/UserPreferences';
import { NotificationPreferences } from '@shared/database/models/NotificationPreferences';
import logger from '@shared/utils/logger';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand
} from '@aws-sdk/client-cognito-identity-provider';
import config from '@shared/config';

// Cognito Client
const cognitoClient = new CognitoIdentityProviderClient({
  region: config.cognito.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

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
  message: string;
}

// Custom error classes

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
            attributes: ['id', 'name', 'street', 'city', 'province', 'zipCode', 'country', 'phone', 'email', 'website']
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
            attributes: ['id', 'name', 'street', 'city', 'province', 'zipCode', 'country', 'phone', 'email', 'website']
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
   * Crea un nuovo agente (solo per admin/owner) - Cognito Version
   */
  async createAgent(adminUserId: string, agentData: CreateAgentData): Promise<CreateUserResponse> {
    try {
      // 1. VERIFICA PERMESSI ADMIN/OWNER
      const adminUser = await User.findByPk(adminUserId);
      if (!adminUser || !['admin', 'owner'].includes(adminUser.role)) {
        throw new ForbiddenError('Only administrators can create agents');
      }

      if (!adminUser.agencyId) {
        throw new ForbiddenError('Admin must be associated with an agency');
      }

      // 2. VERIFICA EMAIL DUPLICATA NEL DB LOCALE
      const existingUser = await User.findOne({ where: { email: agentData.email } });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // 3. CREA UTENTE IN COGNITO CON AdminCreateUser
      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: config.cognito.userPoolId,
        Username: agentData.email,
        UserAttributes: [
          { Name: 'email', Value: agentData.email },
          { Name: 'email_verified', Value: 'true' }, // Email già verificata dall'admin
          { Name: 'given_name', Value: agentData.firstName },
          { Name: 'family_name', Value: agentData.lastName },
          ...(agentData.phone ? [{ Name: 'phone_number', Value: agentData.phone }] : [])
        ],
        DesiredDeliveryMediums: ['EMAIL'] // 📧 Cognito invia email con password temporanea
      });

      const cognitoResponse = await cognitoClient.send(createUserCommand);
      
      // Estrai cognitoSub dalla risposta
      const cognitoSub = cognitoResponse.User?.Attributes?.find(attr => attr.Name === 'sub')?.Value;

      if (!cognitoSub) {
        throw new Error('Failed to create user in Cognito');
      }

      logger.info('Agent created in Cognito', { email: agentData.email, cognitoSub });

      // 4. AGGIUNGI AL GRUPPO 'agents'
      const addToGroupCommand = new AdminAddUserToGroupCommand({
        UserPoolId: config.cognito.userPoolId,
        Username: agentData.email,
        GroupName: config.cognito.groups.agents
      });

      await cognitoClient.send(addToGroupCommand);

      logger.info('Agent added to Cognito group', { email: agentData.email, group: 'agents' });

      // 5. CREA RECORD NEL DB LOCALE
      const agent = await User.create({
        email: agentData.email,
        cognitoSub: cognitoSub,
        cognitoUsername: agentData.email,
        firstName: agentData.firstName,
        lastName: agentData.lastName,
        phone: agentData.phone,
        role: 'agent',
        agencyId: adminUser.agencyId, // Stessa agenzia dell'admin
        licenseNumber: agentData.licenseNumber,
        isActive: true,
        isVerified: true, // Verificato dall'admin
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date()
      });

      // 6. CREA PREFERENZE PREDEFINITE
      await UserPreferences.create({ userId: agent.id });
      await NotificationPreferences.create({ userId: agent.id });

      logger.info('Agent created in local DB', { userId: agent.id, email: agent.email });

      // 7. RESTITUISCE RISPOSTA (senza password - Cognito ha inviato email)
      return {
        user: this.formatUserProfileResponse(agent),
        message: 'Agent created successfully. Login credentials have been sent to their email.'
      };
    } catch (error: any) {
      logger.error('Error in createAgent service:', error);

      // Gestione errori Cognito
      if (error.name === 'UsernameExistsException') {
        throw new ConflictError('User already exists in authentication system');
      }

      throw error;
    }
  }

  /**
   * Crea un nuovo admin (solo per owner dell'agenzia) - Cognito Version
   */
  async createAdmin(ownerUserId: string, adminData: CreateAdminData): Promise<CreateUserResponse> {
    try {
      // 1. VERIFICA CHE L'UTENTE SIA OWNER
      const ownerUser = await User.findByPk(ownerUserId, {
        include: [{ model: Agency, as: 'agency' }]
      });

      if (!ownerUser || ownerUser.role !== 'owner') {
        throw new ForbiddenError('Only agency owners can create administrators');
      }

      if (!ownerUser.agency) {
        throw new ForbiddenError('Owner must be associated with an agency');
      }

      // Verifica che sia il creator dell'agenzia
      if (ownerUser.agency.createdBy !== ownerUserId) {
        throw new ForbiddenError('Only the agency owner can create new admins');
      }

      const agencyId = ownerUser.agencyId;

      if (!agencyId) {
        throw new ForbiddenError('Owner must belong to an agency');
      }

      // 2. VERIFICA EMAIL DUPLICATA
      const existingUser = await User.findOne({ where: { email: adminData.email } });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // 3. CREA ADMIN IN COGNITO
      const createUserCommand = new AdminCreateUserCommand({
        UserPoolId: config.cognito.userPoolId,
        Username: adminData.email,
        UserAttributes: [
          { Name: 'email', Value: adminData.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'given_name', Value: adminData.firstName },
          { Name: 'family_name', Value: adminData.lastName },
          ...(adminData.phone ? [{ Name: 'phone_number', Value: adminData.phone }] : [])
        ],
        DesiredDeliveryMediums: ['EMAIL'] // 📧 Email con credenziali temporanee
      });

      const cognitoResponse = await cognitoClient.send(createUserCommand);

      const cognitoSub = cognitoResponse.User?.Attributes?.find(attr => attr.Name === 'sub')?.Value;

      if (!cognitoSub) {
        throw new Error('Failed to create admin in Cognito');
      }

      logger.info('Admin created in Cognito', { email: adminData.email, cognitoSub });

      // 4. AGGIUNGI AL GRUPPO 'admins'
      const addToGroupCommand = new AdminAddUserToGroupCommand({
        UserPoolId: config.cognito.userPoolId,
        Username: adminData.email,
        GroupName: config.cognito.groups.admins
      });

      await cognitoClient.send(addToGroupCommand);

      logger.info('Admin added to Cognito group', { email: adminData.email, group: 'admins' });

      // 5. CREA ADMIN NEL DB LOCALE
      const newAdmin = await User.create({
        email: adminData.email,
        cognitoSub: cognitoSub,
        cognitoUsername: adminData.email,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        phone: adminData.phone,
        role: 'admin',
        agencyId: agencyId, // Stessa agenzia dell'owner
        isActive: true,
        isVerified: true,
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date()
      });

      // 6. CREA PREFERENZE
      await UserPreferences.create({ userId: newAdmin.id });
      await NotificationPreferences.create({ userId: newAdmin.id });

      logger.info('Admin created in local DB', { userId: newAdmin.id, email: newAdmin.email });

      return {
        user: this.formatUserProfileResponse(newAdmin),
        message: 'Admin created successfully. Login credentials have been sent to their email.'
      };
    } catch (error: any) {
      logger.error('Error in createAdmin service:', error);

      if (error.name === 'UsernameExistsException') {
        throw new ConflictError('User already exists in authentication system');
      }

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