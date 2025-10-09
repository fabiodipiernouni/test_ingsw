import { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { authService } from '../services/AuthService';
import logger from '@shared/utils/logger';
import { AuthenticatedRequest } from '@shared/types/common.types';
import { successResponse, errorResponse, validationErrorResponse, notFoundResponse } from '@shared/utils/helpers';
import { RegisterDto } from '@auth/dto/RegisterDto';
import { LoginDto } from '@auth/dto/LoginDto';

export class AuthController {
  /**
   * Registrazione nuovo utente
   */
  async register(req: Request, res: Response) {
    try {

      const registerData: RegisterDto = plainToInstance(RegisterDto, req.body);
      const errors = await validate(registerData);
      if (errors.length > 0) {
        return validationErrorResponse(res, errors.map(e => Object.values(e.constraints || {})).flat());
      }
      
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

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Registration failed', 500);
    }
  }

  /**
   * Login utente
   */
  async login(req: Request, res: Response) {
    
    try {
      const { email, password } = req.body as LoginDto;
      
      logger.info('User login request', { email });

      const result = await authService.login({ email, password });

      successResponse(
        res, 
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          tokenType: 'Bearer'
        }, 
        'Login successful'
      );

    } catch (error: any) {
      logger.error('Error in login controller:', error);

      if (error.name === 'AuthenticationError') {
        errorResponse(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Login failed', 500);
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
        refreshToken: result.refreshToken,
        tokenType: 'Bearer'
      });

    } catch (error: any) {
      logger.error('Error in refreshToken controller:', error);

      if (error.name === 'AuthenticationError') {
        errorResponse(res, 'UNAUTHORIZED', error.message, 401);
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

      await authService.changePassword(req.user.id, { currentPassword, newPassword });

      successResponse(res, { message: 'Password changed successfully' });

    } catch (error: any) {
      logger.error('Error in changePassword controller:', error);

      if (error.name === 'NotFoundError') {
        notFoundResponse(res, error.message);
        return;
      }

      if (error.name === 'AuthenticationError') {
        errorResponse(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to change password', 500);
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

      await authService.sendEmailVerification(email);

      successResponse(res, { message: 'Verification code sent to your email' });

    } catch (error: any) {
      logger.error('Error in sendEmailVerification controller:', error);

      if (error.name === 'NotFoundError') {
        notFoundResponse(res, error.message);
        return;
      }

      if (error.name === 'ConflictError') {
        errorResponse(res, 'CONFLICT', error.message, 409);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to send verification code', 500);
    }
  }

  /**
   * Verifica email con codice OTP
   */
  async verifyEmailOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Email and OTP code are required'
        });
      }

      const user = await authService.verifyEmailOtp({ email, otp });

      successResponse(res, { 
        user,
        message: 'Email verified successfully' 
      });

    } catch (error: any) {
      logger.error('Error in verifyEmailOtp controller:', error);

      if (error.name === 'NotFoundError') {
        notFoundResponse(res, error.message);
        return;
      }

      if (error.name === 'AuthenticationError') {
        errorResponse(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      if (error.name === 'ConflictError') {
        errorResponse(res, 'CONFLICT', error.message, 409);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to verify email', 500);
    }
  }

  /**
   * Verifica token JWT
   */
  async verifyToken(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        errorResponse(res, 'UNAUTHORIZED', 'No token provided', 401);
        return;
      }

      const user = await authService.verifyToken(token);
      successResponse(res, { user, valid: true });

    } catch (error: any) {
      logger.error('Error in verifyToken controller:', error);

      if (error.name === 'AuthenticationError') {
        errorResponse(res, 'UNAUTHORIZED', error.message, 401);
        return;
      }

      errorResponse(res, 'INTERNAL_SERVER_ERROR', 'Failed to verify token', 500);
    }
  }
}