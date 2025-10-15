import { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { authService } from '../services/AuthService';
import logger from '@shared/utils/logger';
import { AuthenticatedRequest } from '@shared/dto/AuthenticatedRequest';
import { setResponseAsSuccess, setResponseAsError, setResponseAsValidationError, setResponseAsNotFound } from '@shared/utils/helpers';
import { RegisterDto } from '@auth/dto/RegisterDto';
import { LoginDto } from '@auth/dto/LoginDto';
import { CreateAgentDto } from '@auth/dto/CreateAgentDto';
import { CreateAdminDto } from '@auth/dto/CreateAdminDto';
import config from '@shared/config';
import { ConfirmForgotPasswordDto } from '../dto/ConfirmForgotPasswordDto';
import { ConfirmEmailDto } from '../dto/ConfirmEmailDto';
import { ForgotPasswordDto } from '../dto/ForgotPasswordDto';
import { ChangePasswordDto } from '../dto/ChangePasswordDto';
import { RefreshTokenDto } from '../dto/RefreshTokenDto';

export class AuthController {
  /**
   * Registrazione nuovo utente
   */
  async register(req: Request, res: Response) {
    try {

      const registerDto: RegisterDto = plainToInstance(RegisterDto, req.body);
      
      const errors = await validate(registerDto);
      if (errors.length > 0) {
        const str_errors = errors.map(err => Object.values(err.constraints || {}).join(', '));
        setResponseAsValidationError(res, str_errors);
        return;
      }

      logger.info('User registration request', { email: registerDto.email });

      await authService.register(registerDto);

      setResponseAsSuccess(
        res,
        null,
        'User registered successfully',
        201
      );

    } catch (error: any) {
      logger.error('Error in register controller:', error);

      if (error.name === 'ValidationError') {
        setResponseAsValidationError(res, [error.message]);
        return;
      }

      if (error.name === 'ConflictError') {
        setResponseAsError(res, 'CONFLICT', error.message, 409);
        return;
      }

      // Handle user already exists
      if (error.name === 'UsernameExistsException' ||
          (error.message && error.message.includes('already exists'))) {
        setResponseAsError(res, 'USER_ALREADY_EXISTS', 'An account with this email already exists.', 409);
        return;
      }

      // Handle invalid password
      if (error.name === 'InvalidPasswordException' ||
          (error.message && error.message.includes('password does not conform'))) {
        setResponseAsError(res, 'INVALID_PASSWORD', 'Password does not meet security requirements. Must be at least 8 characters with letters and numbers.', 400);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Registration failed', 500);
    }
  }

  /**
   * Login utente
   */
  async login(req: Request, res: Response) {
    try {
      const loginDto: LoginDto = plainToInstance(LoginDto, req.body);
      
      const errors = await validate(loginDto);
      if (errors.length > 0) {
        const str_errors = errors.map(err => Object.values(err.constraints || {}).join(', '));
        setResponseAsValidationError(res, str_errors);
        return;
      }

      logger.info('User login request', { email: loginDto.email });

      const result = await authService.login(loginDto);

      // Login completato con successo - ritorna sempre user e token
      setResponseAsSuccess(
        res,
        result,
        'Login successful'
      );

    } catch (error: any) {
      logger.error('Error in login controller:', error);

      if (error.name === 'AuthenticationError') {
        setResponseAsError(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      // Handle user not found
      if (error.name === 'UserNotFoundException' || error.name === 'NotFoundError') {
        setResponseAsError(res, 'UNAUTHORIZED', 'Invalid email or password', 401);
        return;
      }

      // Handle user not confirmed
      if (error.name === 'UserNotConfirmedException') {
        setResponseAsError(res, 'USER_NOT_CONFIRMED', 'User email not verified. Please verify your email first.', 403);
        return;
      }

      // Handle too many failed attempts
      if (error.name === 'TooManyRequestsException' ||
          (error.message && error.message.includes('too many'))) {
        setResponseAsError(res, 'TOO_MANY_ATTEMPTS', 'Too many failed login attempts. Please try again later.', 429);
        return;
      }

      if (error.name === 'ValidationError') {
        setResponseAsError(res, 'BAD_REQUEST', error.message, 400);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Login failed', 500);
    }
  }

  /**
   * Conferma il reset della password con il codice
   */
  async confirmForgotPassword(req: Request, res: Response) {
    try {
      const forgotPasswordDto: ConfirmForgotPasswordDto = plainToInstance(ConfirmForgotPasswordDto, req.body);
      
      const errors = await validate(forgotPasswordDto);
      if (errors.length > 0) {
        const str_errors = errors.map(err => Object.values(err.constraints || {}).join(', '));
        setResponseAsValidationError(res, str_errors);
        return;
      }

      logger.info('Confirm forgot password', { email: forgotPasswordDto.email });

      await authService.confirmForgotPassword(forgotPasswordDto);

      setResponseAsSuccess(res, { message: 'Password reset successful. You can now login with your new password.' });

    } catch (error: any) {
      logger.error('Error in confirmForgotPassword controller:', error);

      if (error.name === 'AuthenticationError') {
        setResponseAsError(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      // Handle invalid or expired verification code
      if (error.name === 'CodeMismatchException' || 
          (error.message && error.message.includes('Invalid code provided'))) {
        setResponseAsError(res, 'INVALID_CODE', 'Invalid or expired verification code. Please request a new code.', 400);
        return;
      }

      if (error.name === 'ExpiredCodeException' || 
          (error.message && error.message.includes('code has expired'))) {
        setResponseAsError(res, 'CODE_EXPIRED', 'Verification code has expired. Please request a new code.', 400);
        return;
      }

      // Handle invalid password format
      if (error.name === 'InvalidPasswordException' || 
          (error.message && error.message.includes('password does not conform'))) {
        setResponseAsError(res, 'INVALID_PASSWORD', 'Password does not meet security requirements. Must be at least 8 characters with letters and numbers.', 400);
        return;
      }

      if (error.name === 'ValidationError') {
        setResponseAsError(res, 'BAD_REQUEST', error.message, 400);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to reset password', 500);
    }
  }

  /**
   * Conferma email con codice di verifica
   */
  async confirmEmail(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        setResponseAsError(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      const confirmEmailDto: ConfirmEmailDto = plainToInstance(ConfirmEmailDto, req.body);

      const errors = await validate(confirmEmailDto);
      if (errors.length > 0) {
        const str_errors = errors.map(err => Object.values(err.constraints || {}).join(', '));
        setResponseAsValidationError(res, str_errors);
        return;
      }

      logger.info('Email confirmation request', { email: req.user.email });

      await authService.confirmEmail( req.user, confirmEmailDto);

      setResponseAsSuccess(res, null, 'Email verified successfully', 200);

    } catch (error: any) {
      logger.error('Error in confirmEmail controller:', error);

      if (error.name === 'ValidationError') {
        setResponseAsError(res, 'INVALID_CODE', error.message, 400);
        return;
      }

      if (error.name === 'CodeMismatchException') {
        setResponseAsError(res, 'INVALID_CODE', 'Invalid verification code. Please check and try again.', 400);
        return;
      }

      if (error.name === 'ExpiredCodeException') {
        setResponseAsError(res, 'CODE_EXPIRED', 'Verification code has expired. Please request a new code.', 400);
        return;
      }

      if (error.name === 'NotAuthorizedException') {
        setResponseAsError(res, 'ALREADY_VERIFIED', 'User is already verified.', 400);
        return;
      }

      if (error.name === 'NotFoundError' ||
          error.name === 'UserNotFoundException' || 
          (error.message?.includes('Username/client id combination not found')) ||
          (error.message?.includes('User not found'))) {
        setResponseAsNotFound(res, 'User not found. Please check your email or register first.');
        return;
      }

      if (error.name === 'InvalidParameterException') {
        setResponseAsError(res, 'BAD_REQUEST', error.message || 'Invalid parameters provided.', 400);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to verify email', 500);
    }
  }

  /**
   * Reinvia codice di verifica email
   */
  async resendVerificationCode(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        setResponseAsError(res, 'UNAUTHORIZED', 'Authentication required', 401);
        return;
      }

      logger.info('Resend verification code request', { email: req.user.email });

      await authService.resendVerificationCode(req.user);

      setResponseAsSuccess(res, null, 'Verification code sent', 200);

    } catch (error: any) {
      logger.error('Error in resendVerificationCode controller:', error);

      if (error.name === 'NotFoundError' || error.name === 'UserNotFoundException') {
        setResponseAsNotFound(res, 'User not found');
        return;
      }

      if (error.name === 'ValidationError') {
        setResponseAsError(res, 'BAD_REQUEST', error.message, 400);
        return;
      }

      if (error.name === 'InvalidParameterException') {
        setResponseAsError(res, 'ALREADY_VERIFIED', 'User is already verified.', 400);
        return;
      }

      if (error.name === 'LimitExceededException') {
        setResponseAsError(res, 'TOO_MANY_REQUESTS', 'Too many requests. Please try again later.', 429);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to resend verification code', 500);
    }
  }

  /**
   * Inizia il processo di recupero password
   */
  async forgotPassword(req: Request, res: Response) {
    try {
      const forgotPasswordDto = plainToInstance(ForgotPasswordDto, req.body);
      
      const errors = await validate(forgotPasswordDto);
      if (errors.length > 0) {
        const str_errors = errors.map(err => Object.values(err.constraints || {}).join(', '));
        setResponseAsValidationError(res, str_errors);
        return;
      }

      logger.info('Forgot password request', { email: forgotPasswordDto.email });

      await authService.forgotPassword(forgotPasswordDto);

      setResponseAsSuccess(res, null, 'Password reset code sent to your email', 200);

    } catch (error: any) {
      logger.error('Error in forgotPassword controller:', error);

      if (error.name === 'NotFoundError') {
        // Per sicurezza, non rivelare se l'utente esiste o meno
        setResponseAsSuccess(res, { message: 'If an account exists, a password reset code has been sent' });
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to initiate password reset', 500);
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const refreshTokenDto = plainToInstance(RefreshTokenDto, req.body);

      const errors = await validate(refreshTokenDto);
      if (errors.length > 0) {
        const str_errors = errors.map(err => Object.values(err.constraints || {}).join(', '));
        setResponseAsValidationError(res, str_errors);
        return;
      }

      if (!refreshTokenDto.refreshToken) {
        setResponseAsError(res, 'BAD_REQUEST', 'Refresh token is required', 400);
        return;
      }

      const result = await authService.refreshToken(refreshTokenDto);

      setResponseAsSuccess(res, result, 'Token refreshed successfully');

    } catch (error: any) {
      logger.error('Error in refreshToken controller:', error);

      if (error.name === 'AuthenticationError') {
        setResponseAsError(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      // Handle invalid or expired refresh token

      if (error.name === 'NotAuthorizedException' ||
        (error.message && (error.message.includes('Refresh Token has expired') ||
          error.message.includes('Invalid Refresh Token')))) {
        setResponseAsError(res, 'TOKEN_EXPIRED', 'Refresh token has expired or is invalid. Please login again.', 401);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Token refresh failed', 500);
    }
  }

  /**
   * Cambia password dell'utente autenticato
   */
  async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const accessToken = req.headers.authorization?.split(' ')[1];
      if (!accessToken) {
        setResponseAsError(res, 'UNAUTHORIZED', 'Access token is missing', 401);
        return;
      }

      const changePasswordDto: ChangePasswordDto = plainToInstance(ChangePasswordDto, req.body);

      const errors = await validate(changePasswordDto);
      if (errors.length > 0) {
        const str_errors = errors.map(err => Object.values(err.constraints || {}).join(', '));
        setResponseAsValidationError(res, str_errors);
        return;
      }

      await authService.changePassword(accessToken, changePasswordDto);

      setResponseAsSuccess(res, { message: 'Password changed successfully' });

    } catch (error: any) {
      logger.error('Error in changePassword controller:', error);

      if (error.name === 'AuthenticationError') {
        setResponseAsError(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      if (error.name === 'ValidationError') {
        setResponseAsValidationError(res, [error.message]);
        return;
      }

      // Handle incorrect current password
      if (error.name === 'NotAuthorizedException' ||
        (error.message && error.message.includes('Incorrect username or password'))) {
        setResponseAsError(res, 'INCORRECT_PASSWORD', 'Current password is incorrect.', 401);
        return;
      }

      // Handle invalid new password

      if (error.name === 'InvalidPasswordException' ||
        (error.message && error.message.includes('password does not conform'))) {
        setResponseAsError(res, 'INVALID_PASSWORD', 'New password does not meet security requirements. Must be at least 8 characters with letters and numbers.', 400);
        return;
      }

      // Handle attempt limit exceeded

      if (error.name === 'LimitExceededException' ||
        (error.message && error.message.includes('Attempt limit exceeded'))) {
        setResponseAsError(res, 'TOO_MANY_ATTEMPTS', 'Too many password change attempts. Please try again later.', 429);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to change password', 500);
    }
  }

  /**
   * Inizia il flusso OAuth con redirect diretto al provider
   */
  async getOAuthUrl(req: Request, res: Response) {
    try {
      const { provider, state } = req.query;

      logger.info('OAuth authorization request', { provider });

      // Valida provider
      if (!provider || provider !== 'google') {
        // Redirect al frontend con errore
        const errorUrl = `${config.frontendUrl}/auth/error?message=${encodeURIComponent('Invalid OAuth provider. Only Google is currently supported')}`;
        return res.redirect(errorUrl);
      }

      const authUrl = authService.getOAuthUrl({
        provider: 'google',
        state: state as string
      });

      logger.info('Redirecting to OAuth provider', { provider });
      // Redirect diretto al Cognito Hosted UI
      res.redirect(authUrl);

    } catch (error: any) {
      logger.error('Error in getOAuthUrl controller:', error);
      const errorUrl = `${config.frontendUrl}/auth/error?message=${encodeURIComponent('Failed to start OAuth authentication')}`;
      res.redirect(errorUrl);
    }
  }

  /**
   * Gestisci il callback OAuth e completa l'autenticazione
   */
  async handleOAuthCallback(req: Request, res: Response) {
    try {
      const { code, state, error, error_description } = req.query;

      // Gestisci errori dal provider OAuth
      if (error) {
        logger.error('OAuth error from provider:', { error, error_description });
        // Redirect al frontend con errore
        const errorUrl = `${config.frontendUrl}/auth/error?message=${encodeURIComponent(error_description as string || 'OAuth authentication failed')}`;
        return res.redirect(errorUrl);
      }

      if (!code) {
        const errorUrl = `${config.frontendUrl}/auth/error?message=${encodeURIComponent('Authorization code is required')}`;
        return res.redirect(errorUrl);
      }

      logger.info('OAuth callback received', { state });

      const result = await authService.handleOAuthCallback({
        code: code as string,
        state: state as string
      });

      // Redirect al frontend con token nei query params
      const callbackUrl = new URL(`${config.frontendUrl}/auth/callback`);
      callbackUrl.searchParams.append('response', JSON.stringify(result));

      logger.info('OAuth login successful, redirecting to frontend', { email: result.user.email });
      res.redirect(callbackUrl.toString());

    } catch (error: any) {
      logger.error('Error in handleOAuthCallback controller:', error);

      const errorUrl = `${config.frontendUrl}/auth/error?message=${encodeURIComponent(error.message || 'OAuth authentication failed')}`;
      res.redirect(errorUrl);
    }
  }

  /**
   * POST /users/agent
   * Crea un nuovo agente (solo per admin di agenzia)
   */
  async createAgent(req: AuthenticatedRequest, res: Response) {
    try {
      const creatorId = req.user?.id;
      if (!creatorId) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
        return;
      }

      const agentData: CreateAgentDto = plainToInstance(CreateAgentDto, req.body);
      const errors = await validate(agentData);

      if (errors.length > 0) {
        const str_errors = errors.map(err => Object.values(err.constraints || {}).join(', '));
        setResponseAsValidationError(res, str_errors);
        return;
      }

      logger.info('Create agent request', { creatorId, email: agentData.email });

      await authService.createAgent(creatorId, agentData);

      setResponseAsSuccess(res, null, 'Agent created successfully', 201);

    } catch (error: any) {
      logger.error('Error in createAgent controller:', error);

      if (error.name === 'ValidationError') {
        setResponseAsValidationError(res, error.details?.errors || [error.message]);
        return;
      }

      if (error.name === 'ForbiddenError') {
        setResponseAsError(res, 'FORBIDDEN', error.message, 403);
        return;
      }

      if (error.name === 'ConflictError') {
        setResponseAsError(res, 'CONFLICT', error.message, 409);
        return;
      }

      if (error.name === 'NotFoundError') {
        setResponseAsNotFound(res, error.message);
        return;
      }

      // Handle Cognito errors
      if (error.name === 'UsernameExistsException') {
        setResponseAsError(res, 'CONFLICT', 'User already exists in authentication system', 409);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to create agent', 500);
    }
  }

  /**
   * POST /users/admin
   * Crea un nuovo admin (solo per il creatore dell'agenzia)
   */
  async createAdmin(req: AuthenticatedRequest, res: Response) {
    try {
      const creatorId = req.user?.id;
      if (!creatorId) {
        setResponseAsError(res, 'UNAUTHORIZED', 'User not authenticated', 401);
        return;
      }

      const adminData: CreateAdminDto = plainToInstance(CreateAdminDto, req.body);
      const errors = await validate(adminData);

      if (errors.length > 0) {
        const str_errors = errors.map(err => Object.values(err.constraints || {}).join(', '));
        setResponseAsValidationError(res, str_errors);
        return;
      }

      logger.info('Create admin request', { creatorId, email: adminData.email });

      await authService.createAdmin(creatorId, adminData);

      setResponseAsSuccess(res, null, 'Admin created successfully', 201);

    } catch (error: any) {
      logger.error('Error in createAdmin controller:', error);

      if (error.name === 'ValidationError') {
        setResponseAsValidationError(res, error.details?.errors || [error.message]);
        return;
      }

      if (error.name === 'ForbiddenError') {
        setResponseAsError(res, 'FORBIDDEN', error.message, 403);
        return;
      }

      if (error.name === 'ConflictError') {
        setResponseAsError(res, 'CONFLICT', error.message, 409);
        return;
      }

      if (error.name === 'NotFoundError') {
        setResponseAsNotFound(res, error.message);
        return;
      }

      // Handle Cognito errors
      if (error.name === 'UsernameExistsException') {
        setResponseAsError(res, 'CONFLICT', 'User already exists in authentication system', 409);
        return;
      }

      setResponseAsError(res, 'INTERNAL_SERVER_ERROR', 'Failed to create admin', 500);
    }
  }

}
