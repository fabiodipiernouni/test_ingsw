import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticateToken } from '../../../shared/middleware/auth';
import { requireAgencyAdmin, requireAgencyCreator } from '../../../shared/middleware/authorization';
import { validateCreateAgent, validateCreateAdmin } from '../../../shared/middleware/validation';

const router = Router();
const userController = new UserController();

// Profile management endpoints
router.get('/profile', authenticateToken, userController.getProfile.bind(userController));
router.put('/profile', authenticateToken, userController.updateProfile.bind(userController));

// User preferences endpoints (PRIMA di /:userId per evitare conflitti)
router.get('/preferences', authenticateToken, userController.getUserPreferences.bind(userController));
router.put('/preferences', authenticateToken, userController.updateUserPreferences.bind(userController));

// Notification preferences endpoint (alias)
router.get('/notification-preferences', authenticateToken, userController.getNotificationPreferences.bind(userController));
router.put('/notification-preferences', authenticateToken, userController.updateNotificationPreferences.bind(userController));

// Avatar upload endpoint
router.post('/avatar', authenticateToken, userController.uploadAvatar.bind(userController));

// User activity endpoint
router.get('/activity', authenticateToken, userController.getUserActivity.bind(userController));

// Public profile endpoint (DOPO le rotte specifiche)
router.get('/:userId', userController.getUserById.bind(userController));

// User creation endpoints - require special permissions
router.post('/create-agent', 
  authenticateToken, 
  requireAgencyAdmin, 
  validateCreateAgent, 
  userController.createAgent.bind(userController)
);

router.post('/create-admin', 
  authenticateToken, 
  requireAgencyCreator, 
  validateCreateAdmin, 
  userController.createAdmin.bind(userController)
);

export default router;