import express from 'express';
import { propertyController } from '../controllers/PropertyController';
import { authenticateToken, optionalAuth } from '@shared/middleware/auth';
import { validatePropertyCreate, validatePropertyId } from '../middleware/validation';

const router = express.Router();

/**
 * @route   GET /properties
 * @desc    Lista proprietà con paginazione - comportamento basato su ruolo
 * @access  Public (con autenticazione opzionale)
 */
router.get('/', optionalAuth, propertyController.getProperties.bind(propertyController));

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
//TODO: non richiesto, decidere se rimuovere o tenere, nel caso cancellare anche nel db

export default router;