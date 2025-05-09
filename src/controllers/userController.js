import { db } from '../config/database.js';
import { generateToken } from '../middlewares/auth.js';
import { asyncHandler, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError } from '../middlewares/errorHandler.js';

/**
 * Register a new user
 */
export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Check if user already exists
  const existingUser = await db.User.findOne({
    where: {
      [db.Sequelize.Op.or]: [
        { username },
        { email }
      ]
    }
  });

  if (existingUser) {
    throw new ConflictError('User already exists with this username or email');
  }

  // Create the user (password hashing is handled by model hooks)
  const user = await db.User.create({
    username,
    email,
    password
  });

  // Remove password from response
  const userResponse = user.toJSON();
  delete userResponse.password;

  return res.status(201).json(userResponse);
});

/**
 * Login a user
 */
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find the user
  const user = await db.User.findOne({
    where: { email }
  });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check password
  const isPasswordValid = await user.validatePassword(password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate JWT token
  const token = generateToken(user);
  
  // Prepare user response without password
  const userResponse = user.toJSON();
  delete userResponse.password;

  return res.json({ 
    user: userResponse, 
    token, 
    expiresIn: '1h',
    message: 'Login successful' 
  });
});

/**
 * Get all users (admin only in a real app)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await db.User.findAll({
    attributes: { exclude: ['password'] }
  });
  return res.json(users);
});

/**
 * Get a specific user
 */
export const getUserById = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  
  // Check if user is requesting their own info or an admin
  if (req.user.id !== parseInt(userId)) {
    throw new ForbiddenError('You can only access your own account information');
  }
  
  const user = await db.User.findByPk(userId, {
    attributes: { exclude: ['password'] }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return res.json(user);
});

/**
 * Update a user
 */
export const updateUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const userId = req.params.id;
  
  // Check if user is updating their own account
  if (req.user.id !== parseInt(userId)) {
    throw new ForbiddenError('You can only update your own account');
  }

  const user = await db.User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Only update fields that are provided
  const updateData = {};
  if (username) updateData.username = username;
  if (email) updateData.email = email;
  if (password) updateData.password = password;

  await user.update(updateData);

  // Remove password from response
  const userResponse = user.toJSON();
  delete userResponse.password;

  return res.json(userResponse);
});

/**
 * Delete a user
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  
  // Check if user is deleting their own account
  if (req.user.id !== parseInt(userId)) {
    throw new ForbiddenError('You can only delete your own account');
  }
  
  const user = await db.User.findByPk(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Instead of hard delete, we can update isActive status
  await user.update({ isActive: false });
  
  return res.json({ message: 'User account deactivated successfully' });
});
