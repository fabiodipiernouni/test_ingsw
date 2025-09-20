import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateLogin, validateRegister } from '../../../shared/middleware/validation';

const router = Router();
const authController = new AuthController();

// Registrazione e login
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/logout', authController.logout);

// Refresh token
router.post('/refresh', authController.refreshToken);

// OAuth routes (placeholder per ora)
router.get('/google', (req, res) => res.json({ message: 'Google OAuth not implemented yet' }));
router.get('/facebook', (req, res) => res.json({ message: 'Facebook OAuth not implemented yet' }));
router.get('/github', (req, res) => res.json({ message: 'GitHub OAuth not implemented yet' }));

// Verifica token
router.get('/verify', authController.verifyToken);

export default router;