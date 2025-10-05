import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  AdminGetUserCommand,
  AdminAddUserToGroupCommand,
  ChangePasswordCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GlobalSignOutCommand,
  AuthFlowType,
  ChallengeNameType
} from '@aws-sdk/client-cognito-identity-provider';
import { User } from '@shared/database/models/User';
import { Agency } from '@shared/database/models/Agency';
import { UserPreferences } from '@shared/database/models/UserPreferences';
import { NotificationPreferences } from '@shared/database/models/NotificationPreferences';
import config from '@shared/config';
import logger from '@shared/utils/logger';

// Cognito Client
const cognitoClient = new CognitoIdentityProviderClient({
  region: config.cognito.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Types
interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  phone?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  idToken: string;
  refreshToken: string;
  tokenType: string;
  challenge?: {
    name: string;
    session: string;
  };
}

interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  agency?: AgencyResponse;
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

interface CompleteNewPasswordData {
  email: string;
  newPassword: string;
  session: string;
}

interface SocialLoginData {
  authorizationCode: string;
  redirectUri: string;
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
   * Registrazione nuovo utente con Cognito
   */
  async register(registerData: RegisterData): Promise<AuthResponse> {
    try {
      const { email, password, firstName, lastName, acceptTerms, acceptPrivacy, phone } = registerData;

      // Validazione accettazione termini e privacy
      if (!acceptTerms) {
        throw new ValidationError('Terms and conditions acceptance is required');
      }

      if (!acceptPrivacy) {
        throw new ValidationError('Privacy policy acceptance is required');
      }

      // Verifica se l'utente esiste già nel DB locale
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // 1. REGISTRA UTENTE IN COGNITO
      const signUpCommand = new SignUpCommand({
        ClientId: config.cognito.clientId,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'given_name', Value: firstName },
          { Name: 'family_name', Value: lastName },
          ...(phone ? [{ Name: 'phone_number', Value: phone }] : [])
        ]
      });

      const signUpResponse = await cognitoClient.send(signUpCommand);
      const cognitoSub = signUpResponse.UserSub;

      if (!cognitoSub) {
        throw new Error('Failed to create user in Cognito');
      }

      // 2. AGGIUNGI AL GRUPPO 'clients' (ruolo default)
      const addToGroupCommand = new AdminAddUserToGroupCommand({
        UserPoolId: config.cognito.userPoolId,
        Username: email,
        GroupName: config.cognito.groups.clients
      });

      await cognitoClient.send(addToGroupCommand);

      // 3. CREA UTENTE NEL DB LOCALE
      const user = await User.create({
        email,
        cognitoSub,
        cognitoUsername: email,
        firstName,
        lastName,
        phone,
        role: 'client',
        acceptedTermsAt: acceptTerms ? new Date() : undefined,
        acceptedPrivacyAt: acceptPrivacy ? new Date() : undefined,
        isActive: true,
        isVerified: false // Sarà true dopo conferma email
      });

      // 4. CREA PREFERENZE PREDEFINITE
      await UserPreferences.create({ userId: user.id });
      await NotificationPreferences.create({ userId: user.id });

      logger.info('User registered successfully', { email, cognitoSub });

      // 5. RITORNA INFORMAZIONI (nessun token ancora - deve confermare email)
      return {
        user: this.formatUserResponse(user),
        accessToken: '',
        idToken: '',
        refreshToken: '',
        tokenType: 'Bearer',
        challenge: {
          name: 'EMAIL_VERIFICATION_REQUIRED',
          session: ''
        }
      };
    } catch (error: any) {
      logger.error('Error in register service:', error);

      // Gestione errori Cognito
      if (error.name === 'UsernameExistsException') {
        throw new ConflictError('User already exists in authentication system');
      }

      if (error.name === 'InvalidPasswordException') {
        throw new ValidationError('Password does not meet requirements');
      }

      throw error;
    }
  }

  /**
   * Login utente con Cognito
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { email, password } = credentials;

      // 1. AUTENTICA CON COGNITO
      const authCommand = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: config.cognito.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      });

      const authResponse = await cognitoClient.send(authCommand);

      // 2. GESTISCI CHALLENGE (se presente)
      if (authResponse.ChallengeName) {
        // Utente deve cambiare password (creato da admin)
        if (authResponse.ChallengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED) {
          // Recupera utente dal DB
          const user = await User.findOne({ where: { email } });
          
          return {
            user: user ? this.formatUserResponse(user) : ({} as UserResponse),
            accessToken: '',
            idToken: '',
            refreshToken: '',
            tokenType: 'Bearer',
            challenge: {
              name: authResponse.ChallengeName,
              session: authResponse.Session || ''
            }
          };
        }

        throw new AuthenticationError(`Challenge not supported: ${authResponse.ChallengeName}`);
      }

      // 3. OTTIENI TOKEN DA COGNITO
      const { AccessToken, IdToken, RefreshToken } = authResponse.AuthenticationResult || {};

      if (!AccessToken || !IdToken || !RefreshToken) {
        throw new AuthenticationError('Failed to obtain tokens from Cognito');
      }

      // 4. DECODIFICA ID TOKEN PER OTTENERE cognitoSub
      const idTokenDecoded = this.decodeToken(IdToken);
      const cognitoSub = idTokenDecoded.sub;

      // 5. TROVA UTENTE NEL DB LOCALE
      const user = await User.findOne({
        where: { cognitoSub },
        include: [
          {
            model: Agency,
            as: 'agency',
            attributes: ['id', 'name', 'street', 'city', 'province', 'zipCode', 'country', 'phone', 'email', 'website']
          }
        ]
      });

      if (!user) {
        throw new NotFoundError('User not found in local database');
      }

      // Verifica che l'utente sia attivo
      if (!user.isActive) {
        throw new AuthenticationError('Account is disabled');
      }

      // 6. AGGIORNA lastLoginAt
      await user.update({ lastLoginAt: new Date() });

      logger.info('User logged in successfully', { email, cognitoSub });

      return {
        user: this.formatUserResponse(user),
        accessToken: AccessToken,
        idToken: IdToken,
        refreshToken: RefreshToken,
        tokenType: 'Bearer'
      };
    } catch (error: any) {
      logger.error('Error in login service:', error);

      // Gestione errori Cognito
      if (error.name === 'NotAuthorizedException') {
        throw new AuthenticationError('Invalid email or password');
      }

      if (error.name === 'UserNotConfirmedException') {
        throw new AuthenticationError('Email not verified. Please check your email.');
      }

      throw error;
    }
  }

  /**
   * Completa il cambio password obbligatorio (NEW_PASSWORD_REQUIRED challenge)
   */
  async completeNewPasswordChallenge(data: CompleteNewPasswordData): Promise<AuthResponse> {
    try {
      const { email, newPassword, session } = data;

      // 1. RISPONDI AL CHALLENGE COGNITO
      const respondCommand = new RespondToAuthChallengeCommand({
        ChallengeName: ChallengeNameType.NEW_PASSWORD_REQUIRED,
        ClientId: config.cognito.clientId,
        Session: session,
        ChallengeResponses: {
          USERNAME: email,
          NEW_PASSWORD: newPassword
        }
      });

      const response = await cognitoClient.send(respondCommand);

      const { AccessToken, IdToken, RefreshToken } = response.AuthenticationResult || {};

      if (!AccessToken || !IdToken || !RefreshToken) {
        throw new AuthenticationError('Failed to complete password challenge');
      }

      // 2. DECODIFICA TOKEN E RECUPERA UTENTE
      const idTokenDecoded = this.decodeToken(IdToken);
      const cognitoSub = idTokenDecoded.sub;

      const user = await User.findOne({
        where: { cognitoSub },
        include: [{ model: Agency, as: 'agency' }]
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // 3. AGGIORNA isVerified (primo login completato)
      if (!user.isVerified) {
        await user.update({ isVerified: true });
      }

      logger.info('Password challenge completed', { email, cognitoSub });

      return {
        user: this.formatUserResponse(user),
        accessToken: AccessToken,
        idToken: IdToken,
        refreshToken: RefreshToken,
        tokenType: 'Bearer'
      };
    } catch (error: any) {
      logger.error('Error in completeNewPasswordChallenge:', error);

      if (error.name === 'InvalidPasswordException') {
        throw new ValidationError('Password does not meet requirements');
      }

      throw error;
    }
  }

  /**
   * Refresh token con Cognito
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; idToken: string }> {
    try {
      // 1. RICHIEDI NUOVI TOKEN A COGNITO
      const refreshCommand = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
        ClientId: config.cognito.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken
        }
      });

      const response = await cognitoClient.send(refreshCommand);

      const { AccessToken, IdToken } = response.AuthenticationResult || {};

      if (!AccessToken || !IdToken) {
        throw new AuthenticationError('Failed to refresh tokens');
      }

      logger.info('Tokens refreshed successfully');

      return {
        accessToken: AccessToken,
        idToken: IdToken
      };
    } catch (error: any) {
      logger.error('Error in refreshToken service:', error);

      if (error.name === 'NotAuthorizedException') {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      throw error;
    }
  }

  /**
   * Logout globale (invalida tutti i token dell'utente)
   */
  async logout(accessToken: string): Promise<void> {
    try {
      const signOutCommand = new GlobalSignOutCommand({
        AccessToken: accessToken
      });

      await cognitoClient.send(signOutCommand);

      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Error in logout service:', error);
      throw error;
    }
  }

  /**
   * Cambia password utente autenticato
   */
  async changePassword(accessToken: string, oldPassword: string, newPassword: string): Promise<void> {
    try {
      const changePasswordCommand = new ChangePasswordCommand({
        AccessToken: accessToken,
        PreviousPassword: oldPassword,
        ProposedPassword: newPassword
      });

      await cognitoClient.send(changePasswordCommand);

      logger.info('Password changed successfully');
    } catch (error: any) {
      logger.error('Error in changePassword service:', error);

      if (error.name === 'NotAuthorizedException') {
        throw new AuthenticationError('Current password is incorrect');
      }

      if (error.name === 'InvalidPasswordException') {
        throw new ValidationError('New password does not meet requirements');
      }

      if (error.name === 'LimitExceededException') {
        throw new ValidationError('Too many password change attempts. Please try again later.');
      }

      throw error;
    }
  }

  /**
   * Forgot password - Invia codice di reset via email
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      const forgotPasswordCommand = new ForgotPasswordCommand({
        ClientId: config.cognito.clientId,
        Username: email
      });

      await cognitoClient.send(forgotPasswordCommand);

      logger.info('Password reset code sent', { email });
    } catch (error: any) {
      logger.error('Error in forgotPassword service:', error);

      if (error.name === 'UserNotFoundException') {
        // Per sicurezza, non rivelare che l'utente non esiste
        logger.warn('Password reset requested for non-existent user', { email });
        return; // Silenzioso
      }

      throw error;
    }
  }

  /**
   * Conferma reset password con codice
   */
  async confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void> {
    try {
      const confirmCommand = new ConfirmForgotPasswordCommand({
        ClientId: config.cognito.clientId,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword
      });

      await cognitoClient.send(confirmCommand);

      logger.info('Password reset completed', { email });
    } catch (error: any) {
      logger.error('Error in confirmForgotPassword service:', error);

      if (error.name === 'CodeMismatchException') {
        throw new ValidationError('Invalid or expired verification code');
      }

      if (error.name === 'InvalidPasswordException') {
        throw new ValidationError('Password does not meet requirements');
      }

      throw error;
    }
  }

  /**
   * Decodifica token JWT (senza validazione - solo per lettura claims)
   */
  private decodeToken(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
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
