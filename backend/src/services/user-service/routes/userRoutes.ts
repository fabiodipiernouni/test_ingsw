import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticateToken } from '../../../shared/middleware/auth';

const router = Router();
const userController = new UserController();

// Profile management endpoints
router.get('/profile', authenticateToken, userController.getProfile.bind(userController));
router.put('/profile', authenticateToken, userController.updateProfile.bind(userController));

// Public profile endpoint
router.get('/:userId', userController.getUserById.bind(userController));

// User preferences endpoints
router.get('/preferences', authenticateToken, userController.getUserPreferences.bind(userController));
router.put('/preferences', authenticateToken, userController.updateUserPreferences.bind(userController));

// Notification preferences endpoint (alias)
router.put('/notification-preferences', authenticateToken, userController.updateNotificationPreferences.bind(userController));

// Avatar upload endpoint
router.post('/avatar', authenticateToken, userController.uploadAvatar.bind(userController));

// User activity endpoint
router.get('/activity', authenticateToken, userController.getUserActivity.bind(userController));

export default router;