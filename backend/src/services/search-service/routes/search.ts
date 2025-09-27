import express from 'express';
import { searchController } from '../controllers/SearchController';
import { authenticateToken, optionalAuth } from '@shared/middleware/auth';
import { 
  validateSearchRequest,
  validateSuggestionsRequest,
  validateUUID,
  validateSavedSearchData,
  validatePagination
} from '../middleware/validation';

const router = express.Router();

/**
 * @route   POST /search
 * @desc    Ricerca proprietà con filtri avanzati
 * @access  Public (autenticazione opzionale per salvare nello storico)
 */
router.post('/', optionalAuth, validateSearchRequest, searchController.searchProperties.bind(searchController));

/**
 * @route   GET /search/suggestions
 * @desc    Ottieni suggerimenti di ricerca
 * @access  Public
 */
router.get('/suggestions', validateSuggestionsRequest, searchController.getSearchSuggestions.bind(searchController));

/**
 * @route   GET /search/saved
 * @desc    Ottieni ricerche salvate dell'utente
 * @access  Private
 */
router.get('/saved', authenticateToken, searchController.getSavedSearches.bind(searchController));

/**
 * @route   POST /search/saved
 * @desc    Salva una ricerca
 * @access  Private
 */
router.post('/saved', authenticateToken, validateSavedSearchData, searchController.saveSearch.bind(searchController));

/**
 * @route   PUT /search/saved/:searchId
 * @desc    Aggiorna ricerca salvata
 * @access  Private
 */
router.put('/saved/:searchId', authenticateToken, validateUUID('searchId'), validateSavedSearchData, searchController.updateSavedSearch.bind(searchController));

/**
 * @route   DELETE /search/saved/:searchId
 * @desc    Elimina ricerca salvata
 * @access  Private
 */
router.delete('/saved/:searchId', authenticateToken, validateUUID('searchId'), searchController.deleteSavedSearch.bind(searchController));

/**
 * @route   GET /search/history
 * @desc    Ottieni storico ricerche dell'utente
 * @access  Private
 */
router.get('/history', authenticateToken, validatePagination, searchController.getSearchHistory.bind(searchController));

export default router;