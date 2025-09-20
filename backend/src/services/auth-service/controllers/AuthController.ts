import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../../../shared/database/models/User';
import { config } from '../../../config/index';
import logger from '../../../shared/utils/logger';
import { AuthenticatedRequest } from '../../../shared/types/common.types';

export class AuthController {
  /**
   * Registrazione nuovo utente
   */
  async register(req: Request, res: Response) {
    try {
      const { 
        email, 
        password, 
        firstName, 
        lastName, 
        role = 'client',
        acceptTerms,
        acceptPrivacy,
        phone,
        agencyName,
        licenseNumber
      } = req.body;

      // Validazione accettazione termini e privacy (obbligatori)
      if (!acceptTerms) {
        return res.status(400).json({
          success: false,
          message: 'Terms and conditions acceptance is required'
        });
      }

      if (!acceptPrivacy) {
        return res.status(400).json({
          success: false,
          message: 'Privacy policy acceptance is required'
        });
      }

      // Validazione campi agente (se role è 'agent')
      if (role === 'agent') {
        if (!agencyName || agencyName.trim().length < 2) {
          return res.status(400).json({
            success: false,
            message: 'Agency name is required for agents'
          });
        }
        if (!licenseNumber || licenseNumber.trim().length < 5) {
          return res.status(400).json({
            success: false,
            message: 'License number is required for agents'
          });
        }
      }

      // Verifica se l'utente esiste già
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Creazione utente (la password sarà hashata automaticamente dal modello)
      const userData: any = {
        email,
        password, // Password in chiaro - sarà hashata dal hook del modello
        firstName,
        lastName,
        role,
        isVerified: false,
        isActive: true,
        acceptedTermsAt: new Date(), // Timestamp accettazione termini
        acceptedPrivacyAt: new Date() // Timestamp accettazione privacy
      };

      // Campi opzionali
      if (phone) userData.phone = phone;
      if (role === 'agent') {
        userData.agencyName = agencyName;
        userData.licenseNumber = licenseNumber;
      }

      const user = await User.create(userData);

      // Generazione JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        config.auth.jwtSecret,
        { expiresIn: config.auth.jwtExpiration } as SignOptions
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        config.auth.jwtSecret,
        { expiresIn: config.auth.refreshTokenExpiration } as SignOptions
      );

      // Rimuovi password dalla risposta
      const userResponse = { ...user.toJSON() };
      delete (userResponse as any).password;

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: userResponse,
          token,
          refreshToken
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  }

  /**
   * Login utente
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password, rememberMe = false } = req.body;

      // Trova utente
      const user = await User.findOne({ where: { email } });
      logger.info(`Login attempt for email: ${email}, user found: ${!!user}`);
      
      if (!user || !user.password) {
        logger.warn(`Login failed - user not found or no password for: ${email}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verifica password
      logger.info(`Comparing password for user: ${email}`);
      const isValidPassword = await user.comparePassword(password);
      logger.info(`Password validation result: ${isValidPassword}`);
      
      if (!isValidPassword) {
        logger.warn(`Login failed - invalid password for: ${email}`);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verifica se l'account è attivo
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      // Aggiorna ultimo login
      await user.update({ lastLoginAt: new Date() });

      // Generazione JWT con durata basata su rememberMe
      const tokenExpiration = rememberMe 
        ? config.auth.jwtExpirationRememberMe 
        : config.auth.jwtExpiration;
      
      const refreshTokenExpiration = rememberMe 
        ? config.auth.refreshTokenExpirationRememberMe 
        : config.auth.refreshTokenExpiration;

      logger.info(`Login with rememberMe: ${rememberMe}, token expiration: ${tokenExpiration}`);

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        config.auth.jwtSecret,
        { expiresIn: tokenExpiration } as SignOptions
      );

      const refreshToken = jwt.sign(
        { userId: user.id },
        config.auth.jwtSecret,
        { expiresIn: refreshTokenExpiration } as SignOptions
      );

      // Rimuovi password dalla risposta
      const userResponse = { ...user.toJSON() };
      delete (userResponse as any).password;

      logger.info(`User logged in: ${email}`);

      // Calcola l'expiresIn in secondi per il frontend
      const getSecondsFromExpiration = (expiration: string) => {
        const match = expiration.match(/(\d+)([dhms])/);
        if (!match) return 3600; // default 1 hour
        
        const [, value, unit] = match;
        const num = parseInt(value);
        
        switch (unit) {
          case 'd': return num * 24 * 60 * 60;
          case 'h': return num * 60 * 60;
          case 'm': return num * 60;
          case 's': return num;
          default: return 3600;
        }
      };

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          token,
          refreshToken,
          expiresIn: getSecondsFromExpiration(tokenExpiration),
          rememberMe
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }

  /**
   * Logout utente
   */
  async logout(req: Request, res: Response) {
    try {
      // In futuro qui potremmo aggiungere il token a una blacklist
      logger.info('User logged out');
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token required'
        });
      }

      const decoded = jwt.verify(refreshToken, config.auth.jwtSecret) as any;
      const user = await User.findByPk(decoded.userId);

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Genera nuovo access token
      const newToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        config.auth.jwtSecret,
        { expiresIn: config.auth.jwtExpiration } as SignOptions
      );

      res.json({
        success: true,
        data: {
          token: newToken
        }
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  }

  /**
   * Verifica token
   */
  async verifyToken(req: Request, res: Response) {
    try {
      res.json({
        success: true,
        message: 'Token is valid'
      });
    } catch (error) {
      logger.error('Token verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Token verification failed'
      });
    }
  }
}