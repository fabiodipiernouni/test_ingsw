import { Request, Response } from 'express';
import { User } from '../../../shared/database/models/User';
import { Agency } from '../../../shared/database/models/Agency';
import { UserPreferences } from '../../../shared/database/models/UserPreferences';
import { NotificationPreferences } from '../../../shared/database/models/NotificationPreferences';
import logger from '../../../shared/utils/logger';
import { AuthenticatedRequest } from '../../../shared/types/common.types';

export class UserController {
  /**
   * GET /users/profile
   * Ottiene il profilo dell'utente corrente
   */
  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

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
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json(user);
    } catch (error) {
      logger.error('Error getting user profile:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * PUT /users/profile
   * Aggiorna il profilo dell'utente corrente
   */
  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { 
        firstName, 
        lastName, 
        phone, 
        email,
        biography, 
        specializations 
      } = req.body;

      // Trova l'utente esistente
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Validazione email unica se cambiate
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }
        
        // Se l'email viene cambiata, imposta isVerified a false
        user.isVerified = false;
      }

      // Aggiorna i campi base
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (phone !== undefined) user.phone = phone;
      if (email !== undefined) user.email = email;
      if (biography !== undefined) user.biography = biography;
      if (specializations !== undefined && user.role === 'agent') {
        user.specializations = specializations;
      }

      await user.save();

      // Ricarica l'utente con le associazioni
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

      res.json(updatedUser);
    } catch (error) {
      logger.error('Error updating user profile:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /users/{userId}
   * Ottiene il profilo pubblico di un utente
   */
  async getUserById(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId, {
        include: [
          {
            model: Agency,
            as: 'agency',
            attributes: ['id', 'name', 'address', 'phone', 'email', 'website']
          }
        ],
        attributes: [
          'id', 'firstName', 'lastName', 'role', 'avatar', 
          'isVerified', 'biography', 'rating', 'reviewsCount', 
          'specializations', 'licenseNumber', 'createdAt'
        ]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json(user);
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /users/preferences
   * Ottiene le preferenze dell'utente corrente
   */
  async getUserPreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      let preferences = await UserPreferences.findOne({ where: { userId } });
      
      // Se non esistono preferenze, creale con valori di default
      if (!preferences) {
        preferences = await UserPreferences.create({
          userId,
          language: 'it',
          currency: 'EUR'
        });
      }

      res.json(preferences);
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * PUT /users/preferences
   * Aggiorna le preferenze dell'utente corrente
   */
  async updateUserPreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { 
        language, 
        currency, 
        emailNotifications, 
        pushNotifications, 
        searchRadius,
        preferredLocations,
        marketingEmails,
        weeklyDigest,
        profileVisibility
      } = req.body;

      let preferences = await UserPreferences.findOne({ where: { userId } });
      
      if (!preferences) {
        // Crea nuove preferenze
        preferences = await UserPreferences.create({
          userId,
          language: language || 'it',
          currency: currency || 'EUR',
          emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
          pushNotifications: pushNotifications !== undefined ? pushNotifications : true,
          searchRadius: searchRadius || 10,
          preferredLocations: preferredLocations || [],
          marketingEmails: marketingEmails !== undefined ? marketingEmails : true,
          weeklyDigest: weeklyDigest !== undefined ? weeklyDigest : true,
          profileVisibility: profileVisibility !== undefined ? profileVisibility : true
        });
      } else {
        // Aggiorna preferenze esistenti
        if (language !== undefined) preferences.language = language;
        if (currency !== undefined) preferences.currency = currency;
        if (emailNotifications !== undefined) preferences.emailNotifications = emailNotifications;
        if (pushNotifications !== undefined) preferences.pushNotifications = pushNotifications;
        if (searchRadius !== undefined) preferences.searchRadius = searchRadius;
        if (preferredLocations !== undefined) preferences.preferredLocations = preferredLocations;
        if (marketingEmails !== undefined) preferences.marketingEmails = marketingEmails;
        if (weeklyDigest !== undefined) preferences.weeklyDigest = weeklyDigest;
        if (profileVisibility !== undefined) preferences.profileVisibility = profileVisibility;
        await preferences.save();
      }

      res.json(preferences);
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * PUT /users/notification-preferences
   * Aggiorna le preferenze di notifica dell'utente
   */
  async updateNotificationPreferences(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Il body contiene le preferenze strutturate dal frontend
      const notificationCategories = req.body;

      let notifPrefs = await NotificationPreferences.findOne({ where: { userId } });
      
      if (!notifPrefs) {
        // Crea nuove preferenze di notifica con valori di default
        notifPrefs = await NotificationPreferences.create({
          userId,
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          enabledTypes: []
        });
      }

      // Aggiorna le preferenze base basate sui dati ricevuti
      let hasEmailEnabled = false;
      let hasPushEnabled = false;

      // Analizza le categorie per determinare se i tipi sono abilitati
      for (const categoryId in notificationCategories) {
        const category = notificationCategories[categoryId];
        for (const prefId in category) {
          const pref = category[prefId];
          if (pref.email) hasEmailEnabled = true;
          if (pref.push) hasPushEnabled = true;
        }
      }

      notifPrefs.emailNotifications = hasEmailEnabled;
      notifPrefs.pushNotifications = hasPushEnabled;

      // Salva le preferenze dettagliate in enabledTypes come JSON
      notifPrefs.enabledTypes = notificationCategories;
      await notifPrefs.save();

      res.json({
        success: true,
        message: 'Notification preferences updated successfully'
      });
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * POST /users/avatar
   * Carica un nuovo avatar per l'utente
   */
  async uploadAvatar(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // TODO: Implementare upload file con multer
      // Per ora ritorniamo un placeholder
      
      const avatarUrl = `/uploads/avatars/${userId}-${Date.now()}.jpg`;
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      user.avatar = avatarUrl;
      await user.save();

      res.json({ avatarUrl });
    } catch (error) {
      logger.error('Error uploading avatar:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * GET /users/activity
   * Ottiene l'attività dell'utente (views, searches, favorites)
   */
  async getUserActivity(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { type, limit = 10, days = 30 } = req.query;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      // TODO: Implementare query per le varie attività
      // Per ora ritorniamo dati mock
      
      const activity = {
        views: [],
        searches: 0,
        favorites: 0,
        totalActivity: 0
      };

      res.json(activity);
    } catch (error) {
      logger.error('Error getting user activity:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * POST /users/create-agent
   * Crea un nuovo agente per l'agenzia
   */
  async createAgent(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        email,
        firstName,
        lastName,
        phone,
        licenseNumber,
        biography,
        specializations,
        shouldChangePassword = true
      } = req.body;

      // Verifica che l'utente non esista già
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'A user with this email already exists'
        });
      }

      // Genera password temporanea
      const { generateSecurePassword } = await import('../../../shared/utils/passwordHelpers');
      const password = generateSecurePassword();

      // Crea l'utente agente
      const agentData: any = {
        email,
        password: password,
        firstName,
        lastName,
        role: 'agent',
        agencyId: req.userAgency?.id,
        licenseNumber,
        shouldChangePassword,
        isVerified: false,
        isActive: true,
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date()
      };

      // Campi opzionali
      if (phone) agentData.phone = phone;
      if (biography) agentData.biography = biography;
      if (specializations && Array.isArray(specializations)) {
        agentData.specializations = specializations;
      }

      const newAgent = await User.create(agentData);

      // Risposta senza password per sicurezza
      const response = {
        success: true,
        message: 'Agent created successfully',
        user: {
          id: newAgent.id,
          email: newAgent.email,
          firstName: newAgent.firstName,
          lastName: newAgent.lastName,
          role: newAgent.role,
          shouldChangePassword: newAgent.shouldChangePassword
        },
        password,
        timestamp: new Date().toISOString()
      };

      logger.info(`Agent created successfully: ${newAgent.email} by admin: ${req.user?.email}`);
      res.status(201).json(response);

    } catch (error) {
      logger.error('Error creating agent:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * POST /users/create-admin
   * Crea un nuovo admin per l'agenzia
   */
  async createAdmin(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        email,
        firstName,
        lastName,
        phone,
        shouldChangePassword = true
      } = req.body;

      // Verifica che l'utente non esista già
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'A user with this email already exists'
        });
      }

      // Genera password temporanea
      const { generateSecurePassword } = await import('../../../shared/utils/passwordHelpers');
      const password = generateSecurePassword();

      // Crea l'utente admin
      const adminData: any = {
        email,
        password: password,
        firstName,
        lastName,
        role: 'admin',
        agencyId: req.userAgency?.id,
        shouldChangePassword,
        isVerified: false,
        isActive: true,
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date()
      };

      // Campi opzionali
      if (phone) adminData.phone = phone;

      const newAdmin = await User.create(adminData);

      // Risposta senza password per sicurezza
      const response = {
        success: true,
        message: 'Administrator created successfully',
        user: {
          id: newAdmin.id,
          email: newAdmin.email,
          firstName: newAdmin.firstName,
          lastName: newAdmin.lastName,
          role: newAdmin.role,
          shouldChangePassword: newAdmin.shouldChangePassword
        },
        password,
        timestamp: new Date().toISOString()
      };

      logger.info(`Admin created successfully: ${newAdmin.email} by creator: ${req.user?.email}`);
      res.status(201).json(response);

    } catch (error) {
      logger.error('Error creating admin:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}