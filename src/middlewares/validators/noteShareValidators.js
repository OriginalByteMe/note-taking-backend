import { body, param } from 'express-validator';
import { validateResults } from './validatorUtils.js';

/**
 * Validate note ID parameter
 */
export const validateNoteId = [
  param('noteId')
    .isInt({ min: 1 })
    .withMessage('Note ID must be a positive integer'),
  validateResults
];

/**
 * Validate share note request body
 */
export const validateShareNote = [
  param('noteId')
    .isInt({ min: 1 })
    .withMessage('Note ID must be a positive integer'),
  body('sharedWithId')
    .isInt({ min: 1 })
    .withMessage('User ID to share with must be a positive integer'),
  body('permission')
    .optional()
    .isIn(['read', 'write'])
    .withMessage('Permission must be either "read" or "write"'),
  validateResults
];

/**
 * Validate share ID parameter
 */
export const validateShareId = [
  param('shareId')
    .isInt({ min: 1 })
    .withMessage('Share ID must be a positive integer'),
  validateResults
];

/**
 * Validate getting shares for a note
 */
export const validateGetNoteShares = [
  param('noteId')
    .isInt({ min: 1 })
    .withMessage('Note ID must be a positive integer'),
  validateResults
];

/**
 * Validate removing a share
 */
export const validateRemoveShare = [
  param('noteId')
    .isInt({ min: 1 })
    .withMessage('Note ID must be a positive integer'),
  param('shareId')
    .isInt({ min: 1 })
    .withMessage('Share ID must be a positive integer'),
  validateResults
];
