import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
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

import { RefreshTokenDto } from '@auth/dto/RefreshTokenDto';
import { ConfirmForgotPasswordDto } from '@auth/dto/ConfirmForgotPasswordDto';
import { ConfirmEmailDto } from '@auth/dto/ConfirmEmailDto';
import { ForgotPasswordDto } from '@auth/dto/ForgotPasswordDto';
import { ChangePasswordDto } from '@auth/dto/ChangePasswordDto';
import { RefreshTokenResponse } from '@auth/dto/RefreshTokenResponse';
import { CreateAgentDto } from '@auth/dto/CreateAgentDto';
import { CreateAdminDto } from '@auth/dto/CreateAdminDto';
import { ResendVerificationCodeDto } from '@auth/dto/ResendVerificationCodeDto';
import { Address } from '@shared/models/Address';
import { Contacts } from '@shared/models/Contacts';
import { OAuthProvider } from '@shared/types/auth.types';
import { UpdateNotificationPreferencesDto } from '@auth/dto/UpdateNotificationPreferencesDto';
import { NotificationPreferencesResponse } from '../dto/NotificationPreferencesResponse';
import { PagedResult } from '@shared/dto/pagedResult';
import { GetAgentsRequest } from '@auth/dto/GetAgentsRequest';
import { GetAdminsRequest } from '@auth/dto/GetAdminsRequest';
import { calculateTotalPages } from '@shared/utils/helpers';

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

class UserNotConfirmedException extends AuthenticationError {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotConfirmedException';
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

class UserAlreadyExistsError extends ConflictError {
  constructor(message: string) {
    super(message);
    this.name = 'UserAlreadyExistsError';
  }
}

class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

class LimitExceededException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LimitExceededException';
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
        throw new UserAlreadyExistsError('User with this email already exists');
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
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        phone: registerData.phone,
        role: 'client',
        linkedProviders: [], // Registrazione email/password - non ha provider OAuth
        acceptedTermsAt: registerData.acceptTerms ? new Date() : undefined,
        acceptedPrivacyAt: registerData.acceptPrivacy ? new Date() : undefined,
        isActive: true,
        isVerified: false, // Sarà true dopo conferma email
        enabledNotificationTypes: registerData.enabledNotificationTypes
      });

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

      // Gestione errore parametri non validi (es. phone number non in formato E.164)
      if (error.name === 'InvalidParameterException') {
        const validationError = new Error('Invalid parameters provided') as any;
        validationError.name = 'ValidationError';
        validationError.details = {
          errors: [error.message || 'One or more parameters are invalid. Check phone number format (must be +countrycode+number)']
        };
        throw validationError;
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

      // 2. GESTISCI CHALLENGE (se presente) - Rispondi automaticamente a NEW_PASSWORD_REQUIRED
      let AccessToken: string | undefined;
      let IdToken: string | undefined;
      let RefreshToken: string | undefined;

      if (cognitoResponse.ChallengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED) {
        // L'utente ha bisogno di cambiare password, ma lo facciamo loggare comunque
        // Il middleware bloccherà le richieste successive
        logger.warn('User needs password change', { email: credentials.email });
        
        // Per ora prendiamo i token dalla risposta challenge se disponibili
        // Altrimenti dobbiamo gestire diversamente
        if (cognitoResponse.AuthenticationResult) {
          AccessToken = cognitoResponse.AuthenticationResult.AccessToken;
          IdToken = cognitoResponse.AuthenticationResult.IdToken;
          RefreshToken = cognitoResponse.AuthenticationResult.RefreshToken;
        } else {
          // Con NEW_PASSWORD_REQUIRED non ci sono token, quindi creiamo un flusso alternativo
          // Impostiamo una password temporanea uguale alla corrente per ottenere i token
          const respondCommand = new RespondToAuthChallengeCommand({
            ChallengeName: ChallengeNameType.NEW_PASSWORD_REQUIRED,
            ClientId: config.cognito.clientId,
            Session: cognitoResponse.Session,
            ChallengeResponses: {
              USERNAME: credentials.email,
              NEW_PASSWORD: credentials.password // Usiamo la stessa password temporaneamente
            }
          });

          const challengeResponse = await cognitoClient.send(respondCommand);
          AccessToken = challengeResponse.AuthenticationResult?.AccessToken;
          IdToken = challengeResponse.AuthenticationResult?.IdToken;
          RefreshToken = challengeResponse.AuthenticationResult?.RefreshToken;
        }
      } else {
        // 3. OTTIENI TOKEN DA COGNITO (flusso normale)
        AccessToken = cognitoResponse.AuthenticationResult?.AccessToken;
        IdToken = cognitoResponse.AuthenticationResult?.IdToken;
        RefreshToken = cognitoResponse.AuthenticationResult?.RefreshToken;
      }

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
            as: 'agency'
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

      // 6. Segna se l'utente necessita di cambio password
      const passwordChangeRequired = cognitoResponse.ChallengeName === ChallengeNameType.NEW_PASSWORD_REQUIRED;
      if (passwordChangeRequired && !user.passwordChangeRequired) {
        await user.update({ passwordChangeRequired: true });
      }

      logger.info('User logged in successfully', { email: credentials.email, cognitoSub });

      const response: AuthResponse = {
        user: this.formatUserResponse(user),
        accessToken: AccessToken,
        idToken: IdToken,
        refreshToken: RefreshToken,
        tokenType: 'Bearer'
      };

      // 7. AGGIORNA lastLoginAt
      await user.update({ lastLoginAt: new Date() });

      return response;
    } catch (error: any) {
      logger.error('Error in login service:', error);

      // Gestione errori Cognito
      if (error.name === 'NotAuthorizedException') {
        throw new AuthenticationError('Invalid email or password');
      }

      if (error.name === 'UserNotConfirmedException') {
        throw new UserNotConfirmedException('Email not verified. Please check your email.');
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
      
      // Decodifica il token per ottenere cognitoSub e resettare il flag passwordChangeRequired
      const idTokenDecoded = this.decodeToken(accessToken);
      const cognitoSub = idTokenDecoded.sub;
      if (!cognitoSub) {
        throw new ValidationError('Unable to determine Cognito user');
      }
      
      const user = await User.findOne({ where: { cognitoSub } });
      if (!user) {
        throw new NotFoundError('User not found in local database');
      }

      const changePasswordCommand = new ChangePasswordCommand({
        AccessToken: accessToken,
        PreviousPassword: currentPassword,
        ProposedPassword: newPassword
      });
      
      await cognitoClient.send(changePasswordCommand);
  
      
      if (user.passwordChangeRequired) {
        await user.update({ passwordChangeRequired: false });
        logger.info('Password change requirement cleared', { userId: user.id });
      }

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

      // 1. Verifica se l'utente esiste nel DB locale
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // 2. Verifica se l'utente è registrato solo con OAuth (senza email/password)
      // Se linkedProviders non è vuoto e non include 'email', allora l'utente usa solo OAuth
      if (user.linkedProviders && user.linkedProviders.length > 0) {
        // L'utente ha solo provider OAuth, non può recuperare la password
        throw new ForbiddenError('Cannot reset password for accounts registered with social login. Please use your social login provider.');
      }

      const forgotPasswordCommand = new ForgotPasswordCommand({
        ClientId: config.cognito.clientId,
        Username: email
      });

      await cognitoClient.send(forgotPasswordCommand);

      logger.info('Password reset code sent', { email });
    } catch (error: any) {
      logger.error('Error in forgotPassword service:', error, error.name);

      if (error.name === 'UserNotFoundException') {
        // Per sicurezza, non rivelare che l'utente non esiste
        logger.warn('Password reset requested for non-existent user');
        throw new NotFoundError('User not found');
      }

      if (error.name === 'LimitExceededException') {
        throw new LimitExceededException('Too many requests. Please try again later.');
      }

      if (error.name === 'InvalidParameterException' && error.toString().includes('no registered/verified email')) {
        throw new UserNotConfirmedException('Email not verified. Please check your email.');
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
      let provider: OAuthProvider | undefined = undefined;
      if (idTokenDecoded.identities && Array.isArray(idTokenDecoded.identities) && idTokenDecoded.identities.length > 0) {
        provider = idTokenDecoded.identities[0].providerName?.toLowerCase();
      }
      if (!provider) {
        throw new AuthenticationError('Unable to determine OAuth provider from token');
      }

      const cognitoSub = idTokenDecoded.sub;
      const email = idTokenDecoded.email;

      // 3. CERCA O CREA UTENTE (con account linking)
      const user = await this.findOrCreateOAuthUser(cognitoSub, email, idTokenDecoded, provider);

      // 4. VERIFICA CHE L'ACCOUNT SIA ATTIVO
      if (!user.isActive) {
        throw new AuthenticationError('Account is disabled');
      }

      logger.info('OAuth login successful', { email, cognitoSub });

      const authResponse: AuthResponse = {
        user: this.formatUserResponse(user),
        accessToken: access_token,
        idToken: id_token,
        refreshToken: refresh_token,
        tokenType: token_type || 'Bearer'
      };

      // 5. AGGIORNA ULTIMO LOGIN
      await user.update({ lastLoginAt: new Date() });

      return authResponse;

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
    idTokenDecoded: any,
    provider: OAuthProvider
  ): Promise<User> {
    // 1. Cerca utente per cognitoSub (utente OAuth già esistente)
    const user = await User.findOne({
      where: { cognitoSub },
      include: [{ model: Agency, as: 'agency' }]
    });

    if (user) {
      // Utente OAuth già registrato - assicurati che linkedProviders sia aggiornato
      if (!user.linkedProviders || !user.linkedProviders.includes(provider)) {
        const currentProviders = user.linkedProviders || [];
        await user.update({
          linkedProviders: [...currentProviders, provider],
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
      return await this.linkOAuthToExistingUser(existingUser, cognitoSub, idTokenDecoded, provider);
    }

    // 3. Nessun utente trovato: crea nuovo utente OAuth
    logger.info('Creating new user from OAuth login', {
      email,
      cognitoSub,
      hasAvatar: !!idTokenDecoded.picture
    });

    const newUser = await User.create({
      email: email,
      cognitoSub: cognitoSub,
      firstName: idTokenDecoded.given_name || '',
      lastName: idTokenDecoded.family_name || '',
      phone: idTokenDecoded.phone_number || undefined,
      avatar: idTokenDecoded.picture || undefined,
      role: 'client',
      isActive: true,
      isVerified: true, // OAuth providers verificano sempre l'email
      linkedProviders: [provider],
      acceptedTermsAt: new Date(),
      acceptedPrivacyAt: new Date(),
      enabledNotificationTypes: []
    });

    // Aggiungi a gruppo Cognito
    await this.addUserToGroup(cognitoSub, config.cognito.groups.clients);

    // Ricarica con include per avere la struttura completa
    const userWithRelations = await User.findByPk(newUser.id, {
      include: [{ model: Agency, as: 'agency' }]
    });

    return userWithRelations!;
  }

  /**
   * Collega OAuth a un account esistente (account linking)
   * 
   * NOTA: Con la Lambda Pre-Signup, Cognito gestisce già il linking delle identità.
   * Questo metodo aggiorna solo il DB locale con i linkedProviders e avatar.
   */
  private async linkOAuthToExistingUser(
    existingUser: User,
    cognitoSub: string,
    idTokenDecoded: any,
    provider: OAuthProvider
  ): Promise<User> {
    logger.info('Linking OAuth account to existing email/password account', {
      email: existingUser.email, 
      existingCognitoSub: existingUser.cognitoSub,
      oauthCognitoSub: cognitoSub,
      hasAvatar: !!idTokenDecoded.picture,
      existingProviders: existingUser.linkedProviders
    });

    // Aggiungi 'google' a linkedProviders se non è già presente
    const currentProviders = existingUser.linkedProviders || [];
    const updatedProviders = currentProviders.includes(provider)
      ? currentProviders 
      : [...currentProviders, provider];

    // NON sovrascrivo cognitoSub - la Lambda Pre-Signup ha già collegato le identità in Cognito
    // Il cognitoSub del token sarà già quello corretto (originale)
    await existingUser.update({
      isVerified: true, // OAuth providers verificano l'email
      linkedProviders: updatedProviders,
      firstName: existingUser.firstName || idTokenDecoded.given_name || '',
      lastName: existingUser.lastName || idTokenDecoded.family_name || '',
      avatar: existingUser.avatar || idTokenDecoded.picture || undefined
    });

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
  private mapProviderName(provider: OAuthProvider): string {
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

      logger.info('Confirming email', { userEmail: data.email });

      // Conferma registrazione in Cognito
      const confirmCommand = new ConfirmSignUpCommand({
        ClientId: config.cognito.clientId,
        Username: data.email,
        ConfirmationCode: data.code
      });

      await cognitoClient.send(confirmCommand);

      // Aggiorna stato verifica nel database locale
      const user = await User.findOne({ where: { email: data.email } });
      if (user) {
        await user.update({ isVerified: true });
        logger.info('User email verified in database', { userId: user.id });
      }

      logger.info('Email confirmed successfully', { userEmail: data.email });

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
      const email = data.email;
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
        throw new LimitExceededException('Too many requests. Please try again later.');
      }

      throw error;
    }
  }

    /**
   * Crea un nuovo agente (solo per admin/owner) - Cognito Version
   */
  async createAgent(adminUserId: string, agentData: CreateAgentDto): Promise<void> {
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
        firstName: agentData.firstName,
        lastName: agentData.lastName,
        phone: agentData.phone,
        role: 'agent',
        agencyId: adminUser.agencyId, // Stessa agenzia dell'admin
        licenseNumber: agentData.licenseNumber,
        isActive: true,
        isVerified: true, // Verificato dall'admin
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date(),
        enabledNotificationTypes: []
      });

      logger.info('Agent created in local DB', { userId: agent.id, email: agent.email });

    } catch (error: any) {
      logger.error('Error in createAgent service:', error);

      // Gestione errori Cognito
      if (error.name === 'UsernameExistsException') {
        throw new ConflictError('User already exists in authentication system');
      }

      // Gestione errore parametri non validi (es. phone number non in formato E.164)
      if (error.name === 'InvalidParameterException') {
        const validationError = new Error('Invalid parameters provided') as any;
        validationError.name = 'ValidationError';
        validationError.details = {
          errors: [error.message || 'One or more parameters are invalid. Check phone number format (must be +countrycode+number)']
        };
        throw validationError;
      }

      throw error;
    }
  }

  /**
   * Crea un nuovo admin (solo per owner dell'agenzia) - Cognito Version
   */
  async createAdmin(ownerUserId: string, adminData: CreateAdminDto): Promise<void> {
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
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        phone: adminData.phone,
        role: 'admin',
        agencyId: agencyId, // Stessa agenzia dell'owner
        isActive: true,
        isVerified: true,
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date(),
        enabledNotificationTypes: []
      });

      logger.info('Admin created in local DB', { userId: newAdmin.id, email: newAdmin.email });

    } catch (error: any) {
      logger.error('Error in createAdmin service:', error);

      if (error.name === 'UsernameExistsException') {
        throw new ConflictError('User already exists in authentication system');
      }

      // Gestione errore parametri non validi (es. phone number non in formato E.164)
      if (error.name === 'InvalidParameterException') {
        const validationError = new Error('Invalid parameters provided') as any;
        validationError.name = 'ValidationError';
        validationError.details = {
          errors: [error.message || 'One or more parameters are invalid. Check phone number format (must be +countrycode+number)']
        };
        throw validationError;
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
      passwordChangeRequired: user.passwordChangeRequired,
      linkedProviders: user.linkedProviders,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      agency: user.agency ? this.formatAgencyResponse(user.agency) : undefined,
      licenseNumber: user.licenseNumber,
      biography: user.biography,
      specializations: user.specializations
    };
  }

  /**
   * Formatta la risposta agenzia
   */
  private formatAgencyResponse(agency: Agency): AgencyResponse {
    let address: Address | undefined;
    if (agency.street && agency.city && agency.province && agency.zipCode && agency.country) {
      address = {
        street: agency.street,
        city: agency.city,
        province: agency.province,
        zipCode: agency.zipCode,
        country: agency.country
      };
    }

    let contacts: Contacts | undefined;
    if (agency.phone || agency.email || agency.website) {
      contacts = {
        phone: agency?.phone,
        email: agency?.email,
        website: agency?.website
      };
    }

    let agencyResponse: AgencyResponse = {
      id: agency.id,
      name: agency.name,
      description: agency.description || undefined,
      address: address,
      contacts: contacts,
      logo: agency.logo || undefined,
      licenseNumber: agency.licenseNumber || undefined,
      isActive: agency.isActive,
      createdAt: agency.createdAt,
      updatedAt: agency.updatedAt
    };

    return agencyResponse;
  }

  /**
   * Ottiene le preferenze di notifica di un utente
   */
  async getNotificationPreferences(
    userId: string
  ): Promise<NotificationPreferencesResponse> {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'enabledNotificationTypes']
    });

    if (!user) {
      throw new Error('User not found');
    }

    logger.info(`Retrieved notification preferences for user ${userId}`);

    let notificationPreferencesResponse: NotificationPreferencesResponse = {
      enabledNotificationTypes: user.enabledNotificationTypes || []
    };
    return notificationPreferencesResponse;
  }

  /**
   * Aggiorna le preferenze di notifica di un utente
   */
  async updateNotificationPreferences(
    userId: string,
    UpdateNotificationPreferencesDto: UpdateNotificationPreferencesDto
  ): Promise<void> {
    const user = await User.findByPk(userId);

    const { enabledNotificationTypes: enabledTypes } = UpdateNotificationPreferencesDto;

    if (!user) {
      throw new Error('User not found');
    }

    user.enabledNotificationTypes = enabledTypes;
    await user.save();

    logger.info(`Updated notification preferences for user ${userId}`, {
      enabledTypes
    });

  }

  /**
   * Ottiene tutti gli agenti dell'agenzia dell'utente autenticato con paginazione
   */
  async getAgentsByUserAgency(
    userId: string,
    getAgentsRequest: GetAgentsRequest
  ): Promise<PagedResult<UserResponse>> {
    // Trova l'utente e la sua agenzia
    const user = await User.findByPk(userId, {
      include: [{
        model: Agency,
        as: 'agency'
      }]
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.agencyId) {
      throw new ForbiddenError('User is not associated with an agency');
    }

    // Verifica che l'utente sia admin o owner
    if (!['admin', 'owner'].includes(user.role)) {
      throw new ForbiddenError('Only admins and owners can view agents');
    }

    // Estrai parametri di paginazione dal DTO
    const page = getAgentsRequest.pagedRequest?.page || 1;
    const limit = getAgentsRequest.pagedRequest?.limit || 20;
    const sortBy = getAgentsRequest.pagedRequest?.sortBy || 'createdAt';
    const sortOrder = getAgentsRequest.pagedRequest?.sortOrder || 'DESC';
    
    const offset = (page - 1) * limit;

    // Conta il totale degli agenti
    const totalCount = await User.count({
      where: {
        agencyId: user.agencyId,
        role: 'agent'
      }
    });

    // Trova gli agenti con paginazione
    const agents = await User.findAll({
      where: {
        agencyId: user.agencyId,
        role: 'agent'
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'isActive', 'isVerified', 'passwordChangeRequired', 'createdAt', 'updatedAt'],
      order: [[sortBy, sortOrder]],
      limit,
      offset
    });

    logger.info(`Retrieved ${agents.length} agents for agency ${user.agencyId} (page ${page})`);

    const totalPages = calculateTotalPages(totalCount, limit);

    return {
      data: agents.map(agent => ({
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        phone: agent.phone,
        role: agent.role,
        isActive: agent.isActive,
        isVerified: agent.isVerified,
        passwordChangeRequired: agent.passwordChangeRequired,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      })),
      totalCount,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  }

  /**
   * Ottiene tutti gli admin dell'agenzia dell'utente autenticato con paginazione (solo per owner)
   */
  async getAdminsByUserAgency(
    userId: string,
    getAdminsRequest: GetAdminsRequest
  ): Promise<PagedResult<UserResponse>> {
    // Trova l'utente e la sua agenzia
    const user = await User.findByPk(userId, {
      include: [{
        model: Agency,
        as: 'agency'
      }]
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.agencyId) {
      throw new ForbiddenError('User is not associated with an agency');
    }

    // Verifica che l'utente sia owner
    if (user.role !== 'owner') {
      throw new ForbiddenError('Only owners can view admins');
    }

    // Estrai parametri di paginazione dal DTO
    const page = getAdminsRequest.pagedRequest?.page || 1;
    const limit = getAdminsRequest.pagedRequest?.limit || 20;
    const sortBy = getAdminsRequest.pagedRequest?.sortBy || 'createdAt';
    const sortOrder = getAdminsRequest.pagedRequest?.sortOrder || 'DESC';
    
    const offset = (page - 1) * limit;

    // Conta il totale degli admin
    const totalCount = await User.count({
      where: {
        agencyId: user.agencyId,
        role: 'admin'
      }
    });

    // Trova gli admin con paginazione
    const admins = await User.findAll({
      where: {
        agencyId: user.agencyId,
        role: 'admin'
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'isActive', 'isVerified', 'passwordChangeRequired', 'createdAt', 'updatedAt'],
      order: [[sortBy, sortOrder]],
      limit,
      offset
    });

    logger.info(`Retrieved ${admins.length} admins for agency ${user.agencyId} (page ${page})`);

    const totalPages = calculateTotalPages(totalCount, limit);

    return {
      data: admins.map(admin => ({
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        isActive: admin.isActive,
        isVerified: admin.isVerified,
        passwordChangeRequired: admin.passwordChangeRequired,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      })),
      totalCount,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  }

  /**
   * Elimina un agente (solo per admin/owner della stessa agenzia)
   */
  async deleteAgent(userId: string, agentId: string): Promise<void> {
    // Trova l'utente che sta facendo la richiesta
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.agencyId) {
      throw new ForbiddenError('User is not associated with an agency');
    }

    // Verifica che l'utente sia admin o owner
    if (!['admin', 'owner'].includes(user.role)) {
      throw new ForbiddenError('Only admins and owners can delete agents');
    }

    // Trova l'agente da eliminare
    const agent = await User.findByPk(agentId);

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    // Verifica che l'agente appartenga alla stessa agenzia
    if (agent.agencyId !== user.agencyId) {
      throw new ForbiddenError('Cannot delete an agent from another agency');
    }

    // Verifica che sia effettivamente un agente
    if (agent.role !== 'agent') {
      throw new ForbiddenError('User is not an agent');
    }

    // Elimina l'agente da Cognito
    try {
      const deleteUserCommand = new AdminDeleteUserCommand({
        UserPoolId: config.cognito.userPoolId,
        Username: agent.email
      });
      await cognitoClient.send(deleteUserCommand);
      logger.info(`Agent ${agentId} deleted from Cognito`);
    } catch (error: any) {
      logger.error('Error deleting agent from Cognito:', error);
      throw new Error(`Failed to delete agent from Cognito`);
    }

    // Elimina l'agente dal database
    await agent.destroy();

    logger.info(`Agent ${agentId} deleted by user ${userId}`);
  }

  /**
   * Elimina un admin (solo per owner della stessa agenzia)
   */
  async deleteAdmin(userId: string, adminId: string): Promise<void> {
    // Trova l'utente che sta facendo la richiesta
    const user = await User.findByPk(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.agencyId) {
      throw new ForbiddenError('User is not associated with an agency');
    }

    // Verifica che l'utente sia owner
    if (user.role !== 'owner') {
      throw new ForbiddenError('Only owners can delete admins');
    }

    // Trova l'admin da eliminare
    const admin = await User.findByPk(adminId);

    if (!admin) {
      throw new NotFoundError('Admin not found');
    }

    // Verifica che l'admin appartenga alla stessa agenzia
    if (admin.agencyId !== user.agencyId) {
      throw new ForbiddenError('Cannot delete an admin from another agency');
    }

    // Verifica che sia effettivamente un admin
    if (admin.role !== 'admin') {
      throw new ForbiddenError('User is not an admin');
    }

    // Non permettere all'owner di eliminare se stesso
    if (admin.id === userId) {
      throw new ForbiddenError('Cannot delete yourself');
    }

    // Elimina l'admin da Cognito
    try {
      const deleteUserCommand = new AdminDeleteUserCommand({
        UserPoolId: config.cognito.userPoolId,
        Username: admin.email
      });
      await cognitoClient.send(deleteUserCommand);
      logger.info(`Admin ${adminId} deleted from Cognito`);
    } catch (error: any) {
      logger.error('Error deleting admin from Cognito:', error);
      throw new Error(`Failed to delete admin from Cognito`);
    }

    // Elimina l'admin dal database
    await admin.destroy();

    logger.info(`Admin ${adminId} deleted by user ${userId}`);
  }
}

export const authService = new AuthService();
