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
  softDeleteNote,
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
 * Permanently delete a note and all its versions
 * DELETE /notes/:id
 */
router.delete('/:id', authenticate, validateNoteId, deleteNote);

/**
 * Soft delete a note (mark as deleted but preserve in database)
 * PUT /notes/:id/soft-delete?version=X
 */
router.put('/:id/soft-delete', authenticate, validateNoteId, validateDeleteNote, softDeleteNote);

/**
 * Resolve a version conflict
 * POST /notes/:id/resolve-conflict
 */
router.post('/:id/resolve-conflict', authenticate, validateNoteId, validateResolveConflict, resolveConflict);

export default router;
