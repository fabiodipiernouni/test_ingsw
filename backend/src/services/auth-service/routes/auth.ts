import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validate, authValidations } from '../../../shared/middleware/validation';
import { authenticateToken } from '../../../shared/middleware/auth';

const router = Router();
const authController = new AuthController();

// Registrazione e login
router.post('/register', validate(authValidations.register), authController.register);
router.post('/login', validate(authValidations.login), authController.login);
router.post('/logout', authenticateToken as any, authController.logout);

// Gestione token
router.post('/refresh-token', authController.refreshToken);
router.get('/verify-token', authController.verifyToken);

// Gestione password
router.post('/change-password', authenticateToken as any, validate(authValidations.changePassword), authController.changePassword);

// Verifica email
router.post('/send-email-verification', validate(authValidations.sendEmailVerification), authController.sendEmailVerification);
router.post('/verify-email-otp', validate(authValidations.verifyEmailOtp), authController.verifyEmailOtp);

export default router;