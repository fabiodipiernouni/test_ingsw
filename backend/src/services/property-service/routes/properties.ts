import express from 'express';
import { propertyController } from '../controllers/PropertyController';
import { authenticateToken } from '@shared/middleware/auth';
import { validatePropertyCreate, validatePropertyId } from '../middleware/validation';

const router = express.Router();

/**
 * @route   GET /properties
 * @desc    Lista proprietà con paginazione
 * @access  Public
 */
router.get('/', propertyController.getProperties.bind(propertyController));

/**
 * @route   POST /properties
 * @desc    Crea nuova proprietà
 * @access  Private (Agent only)
 */
router.post(
  '/',
  authenticateToken,
  validatePropertyCreate,
  propertyController.createProperty.bind(propertyController)
);

/**
 * @route   GET /properties/:propertyId
 * @desc    Ottieni dettagli proprietà
 * @access  Public
 */
router.get('/:propertyId', validatePropertyId, propertyController.getPropertyById.bind(propertyController));

/**
 * @route   POST /properties/:propertyId/view
 * @desc    Registra visualizzazione proprietà
 * @access  Public
 */
router.post('/:propertyId/view', validatePropertyId, propertyController.recordPropertyView.bind(propertyController));

export default router;