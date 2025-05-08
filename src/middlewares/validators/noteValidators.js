import { body, param, query } from 'express-validator';
import { validate } from './validationMiddleware.js';

/**
 * Validates note creation input
 */
export const validateCreateNote = validate([
  body('title')
    .notEmpty().withMessage('Title is required')
    .isString().withMessage('Title must be a string')
    .trim()
    .notEmpty().withMessage('Title must not be empty'),
  
  body('content')
    .notEmpty().withMessage('Content is required')
    .isString().withMessage('Content must be a string')
    .trim()
    .notEmpty().withMessage('Content must not be empty')
]);

/**
 * Validates note ID parameter
 */
export const validateNoteId = validate([
  param('id')
    .notEmpty().withMessage('Note ID is required')
    .isInt().withMessage('Note ID must be a number')
]);

/**
 * Validates note update input
 */
export const validateUpdateNote = validate([
  body('title')
    .notEmpty().withMessage('Title is required')
    .isString().withMessage('Title must be a string')
    .trim()
    .notEmpty().withMessage('Title must not be empty'),
  
  body('content')
    .notEmpty().withMessage('Content is required')
    .isString().withMessage('Content must be a string')
    .trim()
    .notEmpty().withMessage('Content must not be empty'),
  
  body('version')
    .notEmpty().withMessage('Version is required')
    .isInt().withMessage('Version must be a number')
]);

/**
 * Validates note reversion
 */
export const validateRevertNote = validate([
  param('version')
    .notEmpty().withMessage('Version is required')
    .isInt().withMessage('Version must be a number')
]);

/**
 * Validates note search query
 */
export const validateSearchNote = validate([
  query('q')
    .notEmpty().withMessage('Search query is required')
    .isString().withMessage('Search query must be a string')
    .trim()
    .notEmpty().withMessage('Search query must not be empty')
]);

/**
 * Validates note deletion
 */
export const validateDeleteNote = validate([
  query('version')
    .notEmpty().withMessage('Version is required')
    .isInt().withMessage('Version must be a number')
]);

/**
 * Validates conflict resolution input
 */
export const validateResolveConflict = validate([
  body('title')
    .notEmpty().withMessage('Title is required')
    .isString().withMessage('Title must be a string')
    .trim(),
  
  body('content')
    .notEmpty().withMessage('Content is required')
    .isString().withMessage('Content must be a string')
    .trim(),
  
  body('serverVersion')
    .notEmpty().withMessage('Server version is required')
    .isInt().withMessage('Server version must be a number'),
  
  body('resolutionStrategy')
    .notEmpty().withMessage('Resolution strategy is required')
    .isIn(['client-wins', 'server-wins', 'merge'])
    .withMessage("Resolution strategy must be one of: 'client-wins', 'server-wins', 'merge'")
]);
