import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import {
  validateRegisterUser,
  validateLoginUser,
  validateUserId,
  validateUpdateUser
} from '../middlewares/validators/userValidators.js';

const router = express.Router();

/**
 * Register a new user
 * POST /users/register
 */
router.post('/register', validateRegisterUser, registerUser);

/**
 * Login a user
 * POST /users/login
 */
router.post('/login', validateLoginUser, loginUser);

/**
 * Get all users (admin only in a real app)
 * GET /users
 */
router.get('/', authenticate, getAllUsers);

/**
 * Get a specific user
 * GET /users/:id
 */
router.get('/:id', authenticate, validateUserId, getUserById);

/**
 * Update a user
 * PUT /users/:id
 */
router.put('/:id', authenticate, validateUserId, validateUpdateUser, updateUser);

/**
 * Delete a user
 * DELETE /users/:id
 */
router.delete('/:id', authenticate, validateUserId, deleteUser);

export default router;
