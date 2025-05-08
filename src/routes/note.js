import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  createNote,
  getAllNotes,
  getNoteById,
  getNoteVersions,
  revertToVersion,
  updateNote,
  searchNotes,
  deleteNote,
  resolveConflict
} from '../controllers/noteController.js';
import {
  validateCreateNote,
  validateNoteId,
  validateUpdateNote,
  validateRevertNote,
  validateSearchNote,
  validateDeleteNote,
  validateResolveConflict
} from '../middlewares/validators/noteValidators.js';

const router = express.Router();

/**
 * Create a new note
 * POST /notes
 */
router.post('/', authenticate, validateCreateNote, createNote);

/**
 * Get all notes for authenticated user
 * GET /notes
 */
router.get('/', authenticate, getAllNotes);

/**
 * Search notes by keywords
 * GET /notes/search?q=keyword
 */
router.get('/search', authenticate, validateSearchNote, searchNotes);

/**
 * Get a specific note by ID
 * GET /notes/:id
 */
router.get('/:id', authenticate, validateNoteId, getNoteById);

/**
 * Get note versions
 * GET /notes/:id/versions
 */
router.get('/:id/versions', authenticate, validateNoteId, getNoteVersions);

/**
 * Revert to a specific version
 * POST /notes/:id/revert/:version
 */
router.post('/:id/revert/:version', authenticate, validateNoteId, validateRevertNote, revertToVersion);

/**
 * Update a note
 * PUT /notes/:id
 */
router.put('/:id', authenticate, validateNoteId, validateUpdateNote, updateNote);

/**
 * Soft delete a note
 * DELETE /notes/:id?version=X
 */
router.delete('/:id', authenticate, validateNoteId, validateDeleteNote, deleteNote);

/**
 * Resolve a version conflict
 * POST /notes/:id/resolve-conflict
 */
router.post('/:id/resolve-conflict', authenticate, validateNoteId, validateResolveConflict, resolveConflict);

export default router;
