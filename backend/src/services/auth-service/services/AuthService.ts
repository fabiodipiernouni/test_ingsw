import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '@shared/database/models/User';
import { Agency } from '@shared/database/models/Agency';
import { UserPreferences } from '@shared/database/models/UserPreferences';
import { NotificationPreferences } from '@shared/database/models/NotificationPreferences';
import config from '@shared/config';
import logger from '@shared/utils/logger';
import { RegisterDto } from '@auth/dto/RegisterDto';
import { LoginDto } from '@auth/dto/LoginDto';
import { AuthResponse } from '@auth/dto/AuthResponse';


interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

interface EmailVerificationData {
  email: string;
  otp: string;
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

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
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

export class AuthService {
  /**
   * Registrazione nuovo utente
   */
  async register(registerData: RegisterDto): Promise<AuthResponse> {
    try {
      const { email, password, firstName, lastName, acceptTerms, acceptPrivacy, phone } = registerData;

      // Validazione accettazione termini e privacy
      if (!acceptTerms) {
        throw new ValidationError('Terms and conditions acceptance is required');
      }

      if (!acceptPrivacy) {
        throw new ValidationError('Privacy policy acceptance is required');
      }

      // Verifica se l'utente esiste già
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Crea l'utente
      const userData = {
        email,
        password,
        firstName,
        lastName,
        phone,
        role: 'client' as const,
        acceptTerms,
        acceptPrivacy,
        acceptedTermsAt: acceptTerms ? new Date() : null,
        acceptedPrivacyAt: acceptPrivacy ? new Date() : null,
        isActive: true,
        isVerified: false
      };

      const user = await User.create(userData);

      // Crea preferenze predefinite
      await UserPreferences.create({ userId: user.id });
      await NotificationPreferences.create({ userId: user.id });

      // Genera token
      const { accessToken, refreshToken } = this.generateTokens(user);

      return {
        user: this.formatUserResponse(user),
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Error in register service:', error);
      throw error;
    }
  }

  /**
   * Login utente
   */
  async login(credentials: LoginDto): Promise<AuthResponse> {
    try {
      const { email, password } = credentials;

      // Trova l'utente con le associazioni
      const user = await User.findOne({ 
        where: { email },
        include: [
          {
            model: Agency,
            as: 'agency',
            attributes: ['id', 'name', 'address', 'phone', 'email', 'website']
          }
        ]
      });

      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Verifica la password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Verifica che l'utente sia attivo
      if (!user.isActive) {
        throw new AuthenticationError('Account is disabled');
      }

      // Genera token
      const { accessToken, refreshToken } = this.generateTokens(user);

      return {
        user: this.formatUserResponse(user),
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('Error in login service:', error);
      throw error;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verifica il refresh token
      const decoded = jwt.verify(token, config.jwt.refreshSecret) as any;
      
      // Trova l'utente
      const user = await User.findByPk(decoded.userId);
      if (!user || !user.isActive) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Genera nuovi token
      return this.generateTokens(user);
    } catch (error) {
      logger.error('Error in refreshToken service:', error);
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Verifica token
   */
  async verifyToken(token: string): Promise<UserResponse> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      
      const user = await User.findByPk(decoded.userId, {
        include: [
          {
            model: Agency,
            as: 'agency',
            attributes: ['id', 'name', 'address', 'phone', 'email', 'website']
          }
        ]
      });

      if (!user || !user.isActive) {
        throw new AuthenticationError('Invalid token');
      }

      return this.formatUserResponse(user);
    } catch (error) {
      logger.error('Error in verifyToken service:', error);
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Cambio password
   */
  async changePassword(userId: string, passwordData: ChangePasswordData): Promise<void> {
    try {
      const { currentPassword, newPassword } = passwordData;

      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verifica password corrente
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Aggiorna password (sarà hashata automaticamente dal modello)
      await user.update({ password: newPassword });
    } catch (error) {
      logger.error('Error in changePassword service:', error);
      throw error;
    }
  }

  /**
   * Invio verifica email
   */
  async sendEmailVerification(email: string): Promise<void> {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (user.isVerified) {
        throw new ConflictError('Email already verified');
      }

      // TODO: Implementare invio OTP via email
      // Per ora logghiamo soltanto
      logger.info('Email verification requested for user:', { email, userId: user.id });
    } catch (error) {
      logger.error('Error in sendEmailVerification service:', error);
      throw error;
    }
  }

  /**
   * Verifica OTP email
   */
  async verifyEmailOtp(verificationData: EmailVerificationData): Promise<UserResponse> {
    try {
      const { email, otp } = verificationData;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // TODO: Implementare verifica OTP
      // Per ora accettiamo sempre "123456" come OTP valido
      if (otp !== '123456') {
        throw new AuthenticationError('Invalid OTP');
      }

      // Marca email come verificata
      await user.update({ isVerified: true });

      return this.formatUserResponse(user);
    } catch (error) {
      logger.error('Error in verifyEmailOtp service:', error);
      throw error;
    }
  }

  /**
   * Genera token JWT
   */
  private generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessTokenOptions: SignOptions = {
      expiresIn: (config.jwt.expiresIn || '15m') as any
    };

    const refreshTokenOptions: SignOptions = {
      expiresIn: (config.jwt.refreshExpiresIn || '7d') as any
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, accessTokenOptions);
    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, refreshTokenOptions);

    return { accessToken, refreshToken };
  }

  /**
   * Formatta la risposta utente
   */
  private formatUserResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      agency: user.agency ? this.formatAgencyResponse(user.agency) : undefined
    };
  }

  /**
   * Formatta la risposta agenzia
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
}

export const authService = new AuthService();