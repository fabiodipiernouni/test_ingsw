import { Request, Response } from 'express';
import { authService } from '../services/AuthService';
import logger from '@shared/utils/logger';
import { AuthenticatedRequest } from '@shared/types/common.types';
import { successResponse, errorResponse, validationErrorResponse, notFoundResponse } from '@shared/utils/helpers';
import config from '@shared/config';

export class AuthController {
  /**
   * Registrazione nuovo utente
   */
  async register(req: Request, res: Response) {
    try {
      const registerData = req.body;
      
      logger.info('User registration request', { email: registerData.email });

      const result = await authService.register(registerData);

      successResponse(
        res, 
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          tokenType: 'Bearer',
          isNewUser: true
        }, 
        'User registered successfully',
        201
      );

    } catch (error: any) {
      logger.error('Error in register controller:', error);

      if (error.name === 'ValidationError') {
        validationErrorResponse(res, [error.message]);
        return;
      }

      if (error.name === 'ConflictError') {
        errorResponse(res, 'CONFLICT', error.message, 409);
        return;
      }

      // Handle user already exists
      if (error.name === 'UsernameExistsException' || 
          (error.message && error.message.includes('already exists'))) {
        errorResponse(res, 'USER_ALREADY_EXISTS', 'An account with this email already exists.', 409);
        return;
      }

      // Handle invalid password
      if (error.name === 'InvalidPasswordException' || 
          (error.message && error.message.includes('password does not conform'))) {
        errorResponse(res, 'INVALID_PASSWORD', 'Password does not meet security requirements. Must be at least 8 characters with letters and numbers.', 400);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Registration failed', 500);
    }
  }

  /**
   * Login utente
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      logger.info('User login request', { email });

      const result = await authService.login({ email, password });

      // Se c'è una challenge (es. NEW_PASSWORD_REQUIRED)
      if (result.challenge) {
        return successResponse(
          res,
          {
            challengeName: result.challenge.name,
            session: result.challenge.session,
            message: 'Challenge required'
          },
          'Additional authentication step required'
        );
      }

      // Login normale completato
      successResponse(
        res, 
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          idToken: result.idToken,
          tokenType: result.tokenType || 'Bearer'
        }, 
        'Login successful'
      );

    } catch (error: any) {
      logger.error('Error in login controller:', error);

      if (error.name === 'AuthenticationError') {
        errorResponse(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      // Handle user not found
      if (error.name === 'UserNotFoundException' || error.name === 'NotFoundError') {
        errorResponse(res, 'UNAUTHORIZED', 'Invalid email or password', 401);
        return;
      }

      // Handle user not confirmed
      if (error.name === 'UserNotConfirmedException') {
        errorResponse(res, 'USER_NOT_CONFIRMED', 'User email not verified. Please verify your email first.', 403);
        return;
      }

      // Handle too many failed attempts
      if (error.name === 'TooManyRequestsException' || 
          (error.message && error.message.includes('too many'))) {
        errorResponse(res, 'TOO_MANY_ATTEMPTS', 'Too many failed login attempts. Please try again later.', 429);
        return;
      }

      if (error.name === 'ValidationError') {
        errorResponse(res, 'BAD_REQUEST', error.message, 400);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Login failed', 500);
    }
  }

  /**
   * Completa la challenge NEW_PASSWORD_REQUIRED
   */
  async completeNewPassword(req: Request, res: Response) {
    try {
      const { email, newPassword, session } = req.body;

      if (!email || !newPassword || !session) {
        errorResponse(res, 'BAD_REQUEST', 'Email, new password and session are required', 400);
        return;
      }

      logger.info('Complete new password challenge', { email });

      const result = await authService.completeNewPasswordChallenge({ email, newPassword, session });

      successResponse(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          idToken: result.idToken,
          tokenType: result.tokenType || 'Bearer'
        },
        'Password updated successfully'
      );

    } catch (error: any) {
      logger.error('Error in completeNewPassword controller:', error);

      if (error.name === 'AuthenticationError') {
        errorResponse(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      // Check for session expired or invalid session errors from Cognito
      if (error.name === 'NotAuthorizedException' || 
          (error.message && (
            error.message.includes('session is expired') || 
            error.message.includes('Invalid session')
          ))) {
        errorResponse(res, 'SESSION_EXPIRED', 'Session has expired. Please login again to get a new session.', 401);
        return;
      }

      if (error.name === 'ValidationError') {
        errorResponse(res, 'BAD_REQUEST', error.message, 400);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to complete password challenge', 500);
    }
  }

  /**
   * Inizia il processo di recupero password
   */
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        errorResponse(res, 'BAD_REQUEST', 'Email is required', 400);
        return;
      }

      logger.info('Forgot password request', { email });

      await authService.forgotPassword(email);

      successResponse(res, { message: 'Password reset code sent to your email' });

    } catch (error: any) {
      logger.error('Error in forgotPassword controller:', error);

      if (error.name === 'NotFoundError') {
        // Per sicurezza, non rivelare se l'utente esiste o meno
        successResponse(res, { message: 'If an account exists, a password reset code has been sent' });
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to initiate password reset', 500);
    }
  }

  /**
   * Conferma il reset della password con il codice
   */
  async confirmForgotPassword(req: Request, res: Response) {
    try {
      const { email, code, newPassword } = req.body;

      if (!email || !code || !newPassword) {
        errorResponse(res, 'BAD_REQUEST', 'Email, code and new password are required', 400);
        return;
      }

      logger.info('Confirm forgot password', { email });

      await authService.confirmForgotPassword(email, code, newPassword);

      successResponse(res, { message: 'Password reset successful. You can now login with your new password.' });

    } catch (error: any) {
      logger.error('Error in confirmForgotPassword controller:', error);

      if (error.name === 'AuthenticationError') {
        errorResponse(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      // Handle invalid or expired verification code
      if (error.name === 'CodeMismatchException' || 
          (error.message && error.message.includes('Invalid code provided'))) {
        errorResponse(res, 'INVALID_CODE', 'Invalid or expired verification code. Please request a new code.', 400);
        return;
      }

      if (error.name === 'ExpiredCodeException' || 
          (error.message && error.message.includes('code has expired'))) {
        errorResponse(res, 'CODE_EXPIRED', 'Verification code has expired. Please request a new code.', 400);
        return;
      }

      // Handle invalid password format
      if (error.name === 'InvalidPasswordException' || 
          (error.message && error.message.includes('password does not conform'))) {
        errorResponse(res, 'INVALID_PASSWORD', 'Password does not meet security requirements. Must be at least 8 characters with letters and numbers.', 400);
        return;
      }

      if (error.name === 'ValidationError') {
        errorResponse(res, 'BAD_REQUEST', error.message, 400);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to reset password', 500);
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
      
      logger.info(`User logged out: ${userId}`);
      
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
        errorResponse(res, 'BAD_REQUEST', 'Refresh token is required', 400);
        return;
      }

      const result = await authService.refreshToken(refreshToken);

      successResponse(res, {
        accessToken: result.accessToken,
        idToken: result.idToken,
        tokenType: 'Bearer'
      });

    } catch (error: any) {
      logger.error('Error in refreshToken controller:', error);

      if (error.name === 'AuthenticationError') {
        errorResponse(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      // Handle invalid or expired refresh token
      if (error.name === 'NotAuthorizedException' || 
          (error.message && (error.message.includes('Refresh Token has expired') || 
                            error.message.includes('Invalid Refresh Token')))) {
        errorResponse(res, 'TOKEN_EXPIRED', 'Refresh token has expired or is invalid. Please login again.', 401);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Token refresh failed', 500);
    }
  }

  /**
   * Cambia password dell'utente autenticato
   */
  async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(' ')[1];

      if (!accessToken) {
        errorResponse(res, 'UNAUTHORIZED', 'Access token is required', 401);
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        validationErrorResponse(res, ['Current password and new password are required']);
        return;
      }

      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        validationErrorResponse(res, ['New password must be at least 8 characters long and contain at least one letter and one number']);
        return;
      }

      await authService.changePassword(accessToken, currentPassword, newPassword);

      successResponse(res, { message: 'Password changed successfully' });

    } catch (error: any) {
      logger.error('Error in changePassword controller:', error);

      if (error.name === 'AuthenticationError') {
        errorResponse(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      if (error.name === 'ValidationError') {
        validationErrorResponse(res, [error.message]);
        return;
      }

      // Handle incorrect current password
      if (error.name === 'NotAuthorizedException' || 
          (error.message && error.message.includes('Incorrect username or password'))) {
        errorResponse(res, 'INCORRECT_PASSWORD', 'Current password is incorrect.', 401);
        return;
      }

      // Handle invalid new password
      if (error.name === 'InvalidPasswordException' || 
          (error.message && error.message.includes('password does not conform'))) {
        errorResponse(res, 'INVALID_PASSWORD', 'New password does not meet security requirements. Must be at least 8 characters with letters and numbers.', 400);
        return;
      }

      // Handle attempt limit exceeded
      if (error.name === 'LimitExceededException' || 
          (error.message && error.message.includes('Attempt limit exceeded'))) {
        errorResponse(res, 'TOO_MANY_ATTEMPTS', 'Too many password change attempts. Please try again later.', 429);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to change password', 500);
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
      callbackUrl.searchParams.append('access_token', result.accessToken);
      callbackUrl.searchParams.append('id_token', result.idToken);
      callbackUrl.searchParams.append('refresh_token', result.refreshToken);
      callbackUrl.searchParams.append('token_type', result.tokenType);
      callbackUrl.searchParams.append('email', result.user.email);
      callbackUrl.searchParams.append('is_new_user', (!result.user.emailVerified).toString());

      logger.info('OAuth login successful, redirecting to frontend', { email: result.user.email });
      
      res.redirect(callbackUrl.toString());

    } catch (error: any) {
      logger.error('Error in handleOAuthCallback controller:', error);

      const errorUrl = `${config.frontendUrl}/auth/error?message=${encodeURIComponent(error.message || 'OAuth authentication failed')}`;
      res.redirect(errorUrl);
    }
  }
}
