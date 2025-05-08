import { body, param } from 'express-validator';
import { validate } from './validationMiddleware.js';

/**
 * Validates user registration input
 */
export const validateRegisterUser = validate([
  body('username')
    .notEmpty().withMessage('Username is required')
    .isString().withMessage('Username must be a string')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long')
    .trim(),
  
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Email must be valid')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
]);

/**
 * Validates user login input
 */
export const validateLoginUser = validate([
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Email must be valid')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
]);

/**
 * Validates user ID parameter
 */
export const validateUserId = validate([
  param('id')
    .notEmpty().withMessage('User ID is required')
    .isInt().withMessage('User ID must be a number')
]);

/**
 * Validates user update input
 */
export const validateUpdateUser = validate([
  body('username')
    .optional()
    .isString().withMessage('Username must be a string')
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long')
    .trim(),
  
  body('email')
    .optional()
    .isEmail().withMessage('Email must be valid')
    .normalizeEmail(),
  
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
]);
