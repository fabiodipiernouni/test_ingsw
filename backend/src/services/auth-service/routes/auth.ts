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

// Refresh token
router.post('/refresh', authController.refreshToken);

// OAuth routes
router.get('/oauth/:provider', authController.oauthRedirect.bind(authController) as any);
router.get('/oauth/:provider/callback', authController.oauthCallback.bind(authController) as any);
router.post('/oauth/:provider/link', authenticateToken as any, authController.linkOAuthAccount.bind(authController) as any);
router.delete('/oauth/:provider/unlink', authenticateToken as any, authController.unlinkOAuthAccount.bind(authController) as any);

// Verifica token
router.get('/verify', authController.verifyToken);

export default router;