import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import passport from 'passport';
import { User } from '../../../shared/database/models/User';
import { Agency } from '../../../shared/database/models/Agency';
import { config } from '../../../config/index';
import logger from '../../../shared/utils/logger';
import { AuthenticatedRequest } from '../../../shared/types/common.types';
import { 
  findOrCreateOAuthUser, 
  linkOAuthAccount, 
  unlinkOAuthAccount, 
  generateOAuthState, 
  validateOAuthState,
  OAuthProfile 
} from '../../../shared/utils/oauthHelpers';

// Extend session types for OAuth
interface OAuthSession extends Request {
  session: Request['session'] & {
    oauthState?: string;
    customRedirectUri?: string;
  };
}

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
        acceptTerms,
        acceptPrivacy,
        phone
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
        role: 'client', // Solo client per la registrazione pubblica
        isVerified: false,
        isActive: true,
        acceptedTermsAt: new Date(), // Timestamp accettazione termini
        acceptedPrivacyAt: new Date() // Timestamp accettazione privacy
      };

      // Campi opzionali
      if (phone) userData.phone = phone;

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
          refreshToken,
          expiresIn: 3600, // Default 1 hour for registration
          tokenType: 'Bearer',
          isNewUser: true
        },
        timestamp: new Date()
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

      // Trova utente incluso agenzia
      const user = await User.findOne({ 
        where: { email },
        include: [{
          model: Agency,
          as: 'agency'
        }]
      });
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

      const isNewUser = user.lastLoginAt ? false : true;

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
          tokenType: 'Bearer',
          isNewUser: isNewUser,
          rememberMe
        },
        timestamp: new Date()
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
      // Il middleware authenticateToken ha già verificato il token e aggiunto l'utente
      const user = (req as any).user;
      const userId = user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Invalid token',
          timestamp: new Date(),
          path: req.originalUrl
        });
      }

      // TODO: In futuro, aggiungere il token a una blacklist Redis/DB
      // per invalidarlo immediatamente
      
      logger.info(`User logged out: ${userId}`);
      
      // Seguendo lo spec OpenAPI, restituiamo solo status 200 senza body
      res.status(200).send();
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Logout failed',
        timestamp: new Date(),
        path: req.originalUrl
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
      const user = await User.findByPk(decoded.userId, {
        include: [{
          model: Agency,
          as: 'agency'
        }]
      });

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

  /**
   * Redirect to OAuth provider
   */
  async oauthRedirect(req: OAuthSession, res: Response) {
    const { provider } = req.params;
    const { redirect_uri } = req.query;

    // Validate provider
    if (!['google', 'github'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PROVIDER',
        message: 'Unsupported OAuth provider',
        details: { provider },
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      });
    }

    // Generate and store state for CSRF protection
    const state = generateOAuthState();
    req.session.oauthState = state;
    
    // Store custom redirect URI if provided
    if (redirect_uri) {
      req.session.customRedirectUri = redirect_uri as string;
    }

    // Initiate OAuth flow with Passport
    const authenticateOptions: any = {
      scope: this.getOAuthScopes(provider),
      state
    };

    passport.authenticate(provider, authenticateOptions)(req, res);
  }

  /**
   * OAuth callback handler
   */
  async oauthCallback(req: OAuthSession, res: Response) {
    const { provider } = req.params;
    const { code, state, error, error_description } = req.query;

    try {
      // Check for OAuth errors
      if (error) {
        logger.error(`OAuth ${provider} error:`, { error, error_description });
        return res.status(400).json({
          success: false,
          error: 'OAUTH_ERROR',
          message: error_description || 'OAuth authentication failed',
          details: { provider, error },
          timestamp: new Date().toISOString(),
          path: req.originalUrl
        });
      }

      // Validate state parameter for CSRF protection
      if (state && req.session.oauthState && state !== req.session.oauthState) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_STATE',
          message: 'Invalid state parameter',
          timestamp: new Date().toISOString(),
          path: req.originalUrl
        });
      }

      // Use Passport to complete OAuth authentication
      passport.authenticate(provider, { session: false }, async (err: any, profile: OAuthProfile) => {
        try {
          if (err || !profile) {
            logger.error(`OAuth ${provider} authentication failed:`, err);
            return res.status(401).json({
              success: false,
              error: 'OAUTH_AUTH_FAILED',
              message: 'OAuth authentication failed',
              details: { provider },
              timestamp: new Date().toISOString(),
              path: req.originalUrl
            });
          }

          // Find or create user
          const { user, isNewUser, token, refreshToken } = await findOrCreateOAuthUser(profile);

          // Update last login
          user.lastLoginAt = new Date();
          await user.save();

          // Get custom redirect URI or use default frontend URL
          const customRedirectUri = req.session.customRedirectUri;
          const frontendUrl = customRedirectUri || config.app.cors.origins[0] || 'http://localhost:4200';

          // Clean up session
          delete req.session.oauthState;
          delete req.session.customRedirectUri;

          // Check if request expects JSON response
          if (req.headers.accept?.includes('application/json')) {
            return res.json({
              success: true,
              message: isNewUser ? 'Account created successfully' : 'Login successful',
              data: {
                user: user.toJSON(),
                token,
                refreshToken,
                expiresIn: 3600,
                tokenType: 'Bearer',
                isNewUser,
                rememberMe: false
              },
              timestamp: new Date().toISOString()
            });
          }

          // Redirect to frontend with token
          const redirectUrl = new URL('/auth/callback', frontendUrl);
          redirectUrl.searchParams.set('token', token);
          redirectUrl.searchParams.set('refreshToken', refreshToken);
          redirectUrl.searchParams.set('isNewUser', isNewUser.toString());
          redirectUrl.searchParams.set('user', encodeURIComponent(JSON.stringify(user.toJSON())));
          
          logger.info(`OAuth ${provider} success - redirecting to:`, redirectUrl.toString());
          res.redirect(redirectUrl.toString());

        } catch (error) {
          logger.error(`OAuth ${provider} callback error:`, error);
          res.status(500).json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Internal server error during OAuth callback',
            timestamp: new Date().toISOString(),
            path: req.originalUrl
          });
        }
      })(req, res);

    } catch (error) {
      logger.error(`OAuth ${provider} callback error:`, error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error during OAuth callback',
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      });
    }
  }

  /**
   * Link OAuth account to existing user
   */
  async linkOAuthAccount(req: AuthenticatedRequest, res: Response) {
    const { provider } = req.params;
    const { accessToken } = req.body;

    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          path: req.originalUrl
        });
      }

      if (!['google', 'github'].includes(provider)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PROVIDER',
          message: 'Unsupported OAuth provider',
          details: { provider },
          timestamp: new Date().toISOString(),
          path: req.originalUrl
        });
      }

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_ACCESS_TOKEN',
          message: 'Access token is required',
          timestamp: new Date().toISOString(),
          path: req.originalUrl
        });
      }

      // TODO: Validate access token with provider and get profile
      // For now, we'll implement a simplified version
      
      const result = await linkOAuthAccount(req.user.id, {
        provider: provider as 'google' | 'github',
        providerId: `temp_${Date.now()}`, // This should be fetched from provider
        accessToken
      });

      if (!result.success) {
        return res.status(409).json({
          success: false,
          error: 'LINK_FAILED',
          message: result.message,
          timestamp: new Date().toISOString(),
          path: req.originalUrl
        });
      }

      res.json({
        success: result.success,
        message: result.message,
        linkedProvider: result.linkedProvider
      });

    } catch (error) {
      logger.error(`OAuth link ${provider} error:`, error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to link OAuth account',
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      });
    }
  }

  /**
   * Unlink OAuth account
   */
  async unlinkOAuthAccount(req: AuthenticatedRequest, res: Response) {
    const { provider } = req.params;

    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          path: req.originalUrl
        });
      }

      if (!['google', 'github'].includes(provider)) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PROVIDER',
          message: 'Unsupported OAuth provider',
          details: { provider },
          timestamp: new Date().toISOString(),
          path: req.originalUrl
        });
      }

      const result = await unlinkOAuthAccount(
        req.user.id, 
        provider as 'google' | 'github'
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'UNLINK_FAILED',
          message: result.message,
          timestamp: new Date().toISOString(),
          path: req.originalUrl
        });
      }

      res.json({
        success: result.success,
        message: result.message
      });

    } catch (error) {
      logger.error(`OAuth unlink ${provider} error:`, error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to unlink OAuth account',
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      });
    }
  }

  /**
   * Cambia password dell'utente autenticato
   */
  async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      // Validazione password: almeno 8 caratteri, almeno un numero, una lettera
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long and contain at least one letter and one number'
        });
      }

      // Trova l'utente con la password per verificarla
      const user = await User.findByPk(req.user.id);
      if (!user || !user.password) {
        return res.status(404).json({
          success: false,
          message: 'User not found or no password set'
        });
      }

      // Verifica la password corrente
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Aggiorna la password (il hook beforeUpdate la crittograferà automaticamente)
      user.password = newPassword;
      user.shouldChangePassword = false;
      await user.save();

      logger.info(`Password changed for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }

  /**
   * Invia codice OTP per verifica email
   */
  async sendEmailVerification(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
      }

      // Genera un codice OTP di 6 cifre
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // Scade in 10 minuti

      // Salva l'OTP nell'utente (usando i campi per la verifica email)
      user.emailVerificationToken = otpCode;
      user.emailVerificationExpires = otpExpiry;
      await user.save();

      // TODO: Invia email con il codice OTP
      // Per ora loggiamo il codice per il testing
      logger.info(`Email verification OTP for ${email}: ${otpCode}`);

      res.json({
        success: true,
        message: 'Verification code sent to your email'
      });

    } catch (error) {
      logger.error('Send email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send verification code'
      });
    }
  }

  /**
   * Verifica email con codice OTP
   */
  async verifyEmailOtp(req: Request, res: Response) {
    try {
      const { email, otpCode } = req.body;

      if (!email || !otpCode) {
        return res.status(400).json({
          success: false,
          message: 'Email and OTP code are required'
        });
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
      }

      // Verifica il codice OTP e la scadenza
      if (user.emailVerificationToken !== otpCode) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code'
        });
      }

      if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired'
        });
      }

      // Verifica l'email
      user.isVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      logger.info(`Email verified for user: ${email}`);

      res.json({
        success: true,
        message: 'Email verified successfully'
      });

    } catch (error) {
      logger.error('Verify email error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify email'
      });
    }
  }

  /**
   * Get OAuth scopes for provider
   */
  private getOAuthScopes(provider: string): string[] {
    switch (provider) {
      case 'google':
        return ['profile', 'email'];
      case 'github':
        return ['user:email'];
      default:
        return [];
    }
  }
}