import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  AdminAddUserToGroupCommand,
  ChangePasswordCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  AuthFlowType,
  ChallengeNameType
} from '@aws-sdk/client-cognito-identity-provider';
import { User } from '@shared/database/models/User';
import { Agency } from '@shared/database/models/Agency';
import { UserPreferences } from '@shared/database/models/UserPreferences';
import { NotificationPreferences } from '@shared/database/models/NotificationPreferences';
import config from '@shared/config';
import logger from '@shared/utils/logger';
import { RegisterDto } from '@auth/dto/RegisterDto';
import { LoginDto } from '@auth/dto/LoginDto';
import { AuthResponse } from '@auth/dto/AuthResponse';
import { UserResponse } from '@auth/dto/UserResponse';
import { AgencyResponse } from '@auth/dto/AgencyResponse';
import {
  OAuthCallbackData,
  OAuthTokenResponse,
  OAuthUrlParams
} from '@auth/services/serviceTypes';

import { CompleteNewPasswordDto } from '../dto/CompleteNewPasswordDto';
import { RefreshTokenDto } from '../dto/RefreshTokenDto';
import { ConfirmForgotPasswordDto } from '../dto/ConfirmForgotPasswordDto';
import { ConfirmEmailDto } from '../dto/ConfirmEmailDto';
import { ResendVerificationCodeDto } from '../dto/ResendVerificationCodeDto';
import { ForgotPasswordDto } from '../dto/ForgotPasswordDto';
import { ChangePasswordDto } from '../dto/ChangePasswordDto';
import { RefreshTokenResponse } from '../dto/RefreshTokenResponse';

// Cognito Client
const cognitoClient = new CognitoIdentityProviderClient({
  region: config.cognito.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

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
  async register(registerData: RegisterDto): Promise<void> {
    try {
      // Validazione accettazione termini e privacy
      if (!registerData.acceptTerms) {
        throw new ValidationError('Terms and conditions acceptance is required');
      }

      if (!registerData.acceptPrivacy) {
        throw new ValidationError('Privacy policy acceptance is required');
      }

      // Verifica se l'utente esiste già nel DB locale
      const existingUser = await User.findOne({ where: { email: registerData.email } });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // 1. REGISTRA UTENTE IN COGNITO
      const signUpCommand = new SignUpCommand({
        ClientId: config.cognito.clientId,
        Username: registerData.email,
        Password: registerData.password,
        UserAttributes: [
          { Name: 'email', Value: registerData.email },
          { Name: 'given_name', Value: registerData.firstName },
          { Name: 'family_name', Value: registerData.lastName },
          ...(registerData.phone ? [{ Name: 'phone_number', Value: registerData.phone }] : [])
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
        Username: registerData.email,
        GroupName: config.cognito.groups.clients
      });

      await cognitoClient.send(addToGroupCommand);

      // 3. CREA UTENTE NEL DB LOCALE
      const user = await User.create({
        email: registerData.email,
        cognitoSub,
        cognitoUsername: registerData.email,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        phone: registerData.phone,
        role: 'client',
        acceptedTermsAt: registerData.acceptTerms ? new Date() : undefined,
        acceptedPrivacyAt: registerData.acceptPrivacy ? new Date() : undefined,
        isActive: true,
        isVerified: false // Sarà true dopo conferma email
      });

      // 4. CREA PREFERENZE PREDEFINITE
      await UserPreferences.create({ userId: user.id });
      await NotificationPreferences.create({ userId: user.id });

      logger.info('User registered successfully', { email: registerData.email, cognitoSub });

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
  async login(credentials: LoginDto): Promise<AuthResponse> {
    try {
      // 1. AUTENTICA CON COGNITO
      const authCommand = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: config.cognito.clientId,
        AuthParameters: {
          USERNAME: credentials.email,
          PASSWORD: credentials.password
        }
      });

      const cognitoResponse = await cognitoClient.send(authCommand);

      // 2. GESTISCI CHALLENGE (se presente)
      if (cognitoResponse.ChallengeName) {

        const authResponse: AuthResponse = {
          challenge: {
            name: cognitoResponse.ChallengeName,
            session: cognitoResponse.Session || ''
          }
        };
        return authResponse;

      }

      // 3. OTTIENI TOKEN DA COGNITO
      const { AccessToken, IdToken, RefreshToken } = cognitoResponse.AuthenticationResult || {};

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

      logger.info('User logged in successfully', { email: credentials.email, cognitoSub });

      const response: AuthResponse = {
        user: this.formatUserResponse(user),
        accessToken: AccessToken,
        idToken: IdToken,
        refreshToken: RefreshToken,
        tokenType: 'Bearer'
      };

      return response;
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
  async completeNewPasswordChallenge(data: CompleteNewPasswordDto): Promise<AuthResponse> {
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
  async refreshToken(data: RefreshTokenDto): Promise<RefreshTokenResponse> {
    try {
      const { refreshToken } = data;
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

      const refreshTokenResponse : RefreshTokenResponse = {
        accessToken: AccessToken,
        idToken: IdToken,
        refreshToken,
        tokenType: 'Bearer'
      };
      return refreshTokenResponse;
    } catch (error: any) {
      logger.error('Error in refreshToken service:', error);

      if (error.name === 'NotAuthorizedException') {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      throw error;
    }
  }

  /**
   * Cambia password utente autenticato
   */
  async changePassword(accessToken: string, data: ChangePasswordDto): Promise<void> {
    try {
      const { currentPassword, newPassword } = data;

      const changePasswordCommand = new ChangePasswordCommand({
        AccessToken: accessToken,
        PreviousPassword: currentPassword,
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
  async forgotPassword(data: ForgotPasswordDto): Promise<void> {
    try {
      const { email } = data;

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
        logger.warn('Password reset requested for non-existent user');
        return; // Silenzioso
      }

      throw error;
    }
  }

  /**
   * Conferma reset password con codice
   */
  async confirmForgotPassword(data: ConfirmForgotPasswordDto): Promise<void> {
    try {
      const { email, code, newPassword } = data;

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
   * Ottieni l'URL per iniziare il flusso OAuth con un provider social
   */
  getOAuthUrl(params: OAuthUrlParams): string {
    try {
      const { provider, state } = params;
      const { domain, callbackUrl, scope, responseType } = config.cognito.oauth;

      // Genera state casuale se non fornito (per sicurezza CSRF)
      const oauthState = state || this.generateRandomState();

      // Costruisci l'URL per l'authorization endpoint di Cognito
      const authUrl = new URL(`https://${domain}/oauth2/authorize`);
      authUrl.searchParams.append('client_id', config.cognito.clientId);
      authUrl.searchParams.append('response_type', responseType);
      authUrl.searchParams.append('scope', scope.join(' '));
      authUrl.searchParams.append('redirect_uri', callbackUrl);
      authUrl.searchParams.append('identity_provider', this.mapProviderName(provider));
      authUrl.searchParams.append('state', oauthState);

      logger.info('Generated OAuth URL', { provider });

      return authUrl.toString();
    } catch (error: any) {
      logger.error('Error generating OAuth URL:', error);
      throw error;
    }
  }

  /**
   * Gestisci il callback OAuth e scambia il codice di autorizzazione per i token
   */
  async handleOAuthCallback(data: OAuthCallbackData): Promise<AuthResponse> {
    try {
      const { code } = data;
      const { domain, callbackUrl } = config.cognito.oauth;

      // 1. SCAMBIA IL CODICE DI AUTORIZZAZIONE CON I TOKEN
      const tokenData = await this.exchangeCodeForTokens(code, callbackUrl, domain);
      const { access_token, id_token, refresh_token, token_type } = tokenData;

      // 2. DECODIFICA ID TOKEN PER OTTENERE INFO UTENTE
      const idTokenDecoded = this.decodeToken(id_token);
      const cognitoSub = idTokenDecoded.sub;
      const email = idTokenDecoded.email;

      // 3. CERCA O CREA UTENTE (con account linking)
      const user = await this.findOrCreateOAuthUser(cognitoSub, email, idTokenDecoded);

      // 4. VERIFICA CHE L'ACCOUNT SIA ATTIVO
      if (!user.isActive) {
        throw new AuthenticationError('Account is disabled');
      }

      // 5. AGGIORNA ULTIMO LOGIN
      await user.update({ lastLoginAt: new Date() });

      logger.info('OAuth login successful', { email, cognitoSub });

      return {
        user: this.formatUserResponse(user),
        accessToken: access_token,
        idToken: id_token,
        refreshToken: refresh_token,
        tokenType: token_type || 'Bearer'
      };

    } catch (error: any) {
      logger.error('Error in handleOAuthCallback:', error);

      if (error.name === 'AuthenticationError') {
        throw error;
      }

      throw new AuthenticationError('OAuth authentication failed');
    }
  }

  /**
   * Scambia authorization code per token OAuth
   */
  private async exchangeCodeForTokens(
    code: string,
    callbackUrl: string,
    domain: string
  ): Promise<OAuthTokenResponse> {
    const tokenUrl = `https://${domain}/oauth2/token`;

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', config.cognito.clientId);
    params.append('code', code);
    params.append('redirect_uri', callbackUrl);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error('Token exchange failed:', { status: response.status, error: errorData });
      throw new AuthenticationError('Failed to exchange authorization code for tokens');
    }

    const tokenData = await response.json() as OAuthTokenResponse;
    if (!tokenData.access_token || !tokenData.id_token) {
      throw new AuthenticationError('Invalid token response from OAuth provider');
    }

    return tokenData;
  }

  /**
   * Trova utente esistente o crea nuovo utente OAuth (con account linking)
   */
  private async findOrCreateOAuthUser(
    cognitoSub: string,
    email: string,
    idTokenDecoded: any
  ): Promise<User> {
    // 1. Cerca utente per cognitoSub (utente OAuth già esistente)
    const user = await User.findOne({
      where: { cognitoSub },
      include: [{ model: Agency, as: 'agency' }]
    });

    if (user) {
      // Utente OAuth già registrato - assicurati che linkedProviders sia aggiornato
      if (!user.linkedProviders || !user.linkedProviders.includes('google')) {
        const currentProviders = user.linkedProviders || [];
        await user.update({
          linkedProviders: [...currentProviders, 'google'],
          isVerified: true
        });
        logger.info('Updated linkedProviders for existing OAuth user', {
          email: user.email,
          linkedProviders: user.linkedProviders 
        });
      }
      return user;
    }

    // 2. Se non trovato per cognitoSub, cerca per email (possibile account linking)
    const existingUser = await User.findOne({
      where: { email },
      include: [{ model: Agency, as: 'agency' }]
    });

    if (existingUser) {
      // ACCOUNT LINKING: utente registrato con email/password, aggiungi OAuth
      return await this.linkOAuthToExistingUser(existingUser, cognitoSub, idTokenDecoded);
    }

    // 3. Nessun utente trovato: crea nuovo utente OAuth con findOrCreate
    const [newUser, created] = await User.findOrCreate({
      where: {
        cognitoSub: cognitoSub 
      },
      defaults: {
        email: email,
        cognitoSub: cognitoSub,
        cognitoUsername: email,
        firstName: idTokenDecoded.given_name || '',
        lastName: idTokenDecoded.family_name || '',
        phone: idTokenDecoded.phone_number || undefined,
        avatar: idTokenDecoded.picture || undefined,
        role: 'client',
        isActive: true,
        isVerified: true, // OAuth providers verificano sempre l'email
        linkedProviders: ['google'],
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date()
      }
    });

    if (created) {
      logger.info('Creating new user from OAuth login', {
        email,
        cognitoSub,
        hasAvatar: !!idTokenDecoded.picture
      });

      // Crea preferenze per nuovo utente
      await Promise.all([
        UserPreferences.create({ userId: newUser.id }),
        NotificationPreferences.create({ userId: newUser.id })
      ]);

      // Aggiungi a gruppo Cognito
      await this.addUserToGroup(cognitoSub, config.cognito.groups.clients);
    }

    // Ricarica con include per avere la struttura completa
    const userWithRelations = await User.findByPk(newUser.id, {
      include: [{ model: Agency, as: 'agency' }]
    });

    return userWithRelations!;
  }

  /**
   * Collega OAuth a un account esistente (account linking)
   */
  private async linkOAuthToExistingUser(
    existingUser: User,
    cognitoSub: string,
    idTokenDecoded: any
  ): Promise<User> {
    logger.info('Linking OAuth account to existing email/password account', {
      email: existingUser.email, 
      existingCognitoSub: existingUser.cognitoSub,
      newCognitoSub: cognitoSub,
      hasAvatar: !!idTokenDecoded.picture,
      existingProviders: existingUser.linkedProviders
    });

    // Aggiungi 'google' a linkedProviders se non è già presente
    const currentProviders = existingUser.linkedProviders || [];
    const updatedProviders = currentProviders.includes('google')
      ? currentProviders 
      : [...currentProviders, 'google'];

    await existingUser.update({
      cognitoSub: cognitoSub,
      cognitoUsername: existingUser.email,
      isVerified: true, // OAuth providers verificano l'email
      linkedProviders: updatedProviders,
      firstName: existingUser.firstName || idTokenDecoded.given_name || '',
      lastName: existingUser.lastName || idTokenDecoded.family_name || '',
      avatar: existingUser.avatar || idTokenDecoded.picture || undefined
    });

    // Aggiungi a gruppo Cognito
    await this.addUserToGroup(cognitoSub, config.cognito.groups.clients);

    return existingUser;
  }

  /**
   * Aggiunge utente a gruppo Cognito
   */
  private async addUserToGroup(username: string, groupName: string): Promise<void> {
    try {
      const addToGroupCommand = new AdminAddUserToGroupCommand({
        UserPoolId: config.cognito.userPoolId,
        Username: username,
        GroupName: groupName
      });
      await cognitoClient.send(addToGroupCommand);
    } catch (groupError) {
      logger.warn('Could not add user to Cognito group:', { username, groupName, error: groupError });
    }
  }

  /**
   * Genera uno state casuale per protezione CSRF
   */
  private generateRandomState(): string {
    return Buffer.from(Math.random().toString()).toString('base64').substring(0, 32);
  }

  /**
   * Mappa il nome del provider al formato richiesto da Cognito
   */
  private mapProviderName(provider: string): string {
    const providerMap: { [key: string]: string } = {
      'google': 'Google'
    };

    return providerMap[provider.toLowerCase()] || provider;
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
   * Conferma email con codice di verifica
   */
  async confirmEmail(data: ConfirmEmailDto): Promise<void> {
    try {
      const { email, code } = data;
      logger.info('Confirming email', { email });

      // Conferma registrazione in Cognito
      const confirmCommand = new ConfirmSignUpCommand({
        ClientId: config.cognito.clientId,
        Username: email,
        ConfirmationCode: code
      });

      await cognitoClient.send(confirmCommand);

      // Aggiorna stato verifica nel database locale
      const user = await User.findOne({ where: { email } });
      if (user) {
        await user.update({ isVerified: true });
        logger.info('User email verified in database', { userId: user.id });
      }

      logger.info('Email confirmed successfully', { email });

    } catch (error: any) {
      logger.error('Error confirming email:', error);

      if (error.name === 'CodeMismatchException') {
        throw new ValidationError('Invalid verification code. Please check and try again.');
      }

      if (error.name === 'ExpiredCodeException') {
        throw new ValidationError('Verification code has expired. Please request a new code.');
      }

      if (error.name === 'NotAuthorizedException') {
        throw new ValidationError('User is already verified.');
      }

      if (error.name === 'UserNotFoundException' ||
        (error.message && error.message.includes('Username/client id combination not found'))) {
        throw new NotFoundError('User not found. Please check your email or register first.');
      }

      throw error;
    }
  }

  /**
   * Reinvia codice di verifica email
   */
  async resendVerificationCode(data: ResendVerificationCodeDto): Promise<void> {
    try {
      const { email } = data;
      logger.info('Resending verification code', { email });

      // Reinvia codice in Cognito
      const resendCommand = new ResendConfirmationCodeCommand({
        ClientId: config.cognito.clientId,
        Username: email
      });

      await cognitoClient.send(resendCommand);

      logger.info('Verification code resent successfully', { email });

    } catch (error: any) {
      logger.error('Error resending verification code:', error);

      if (error.name === 'UserNotFoundException') {
        throw new NotFoundError('User not found.');
      }

      if (error.name === 'InvalidParameterException') {
        throw new ValidationError('User is already verified.');
      }

      if (error.name === 'LimitExceededException') {
        throw new ValidationError('Too many requests. Please try again later.');
      }

      throw error;
    }
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
      isVerified: user.isVerified,
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
        street: agency.street ?? '',
        city: agency.city ?? '',
        province: agency.province ?? '',
        zipCode: agency.zipCode ?? '',
        country: agency.country ?? ''
      },
      contacts: {
        phone: agency.phone ?? '',
        email: agency.email ?? '',
        website: agency.website ?? ''
      }
    };
  }
}

export const authService = new AuthService();
