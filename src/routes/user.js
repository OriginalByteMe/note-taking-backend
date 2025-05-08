import express from 'express';
import { db } from '../config/database.js';
import { generateToken, authenticate } from '../middlewares/auth.js';

const router = express.Router();

/**
 * Register a new user
 * POST /users/register
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

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
      return res.status(409).json({
        error: 'User already exists with this username or email'
      });
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
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * Login a user
 * POST /users/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find the user
    const user = await db.User.findOne({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
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
  } catch (error) {
    console.error('Error logging in:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
});

/**
 * Get all users (admin only in a real app)
 * GET /users
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await db.User.findAll({
      attributes: { exclude: ['password'] }
    });
    return res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Get a specific user
 * GET /users/:id
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user is requesting their own info or an admin
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own account information' });
    }
    
    const user = await db.User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * Update a user
 * PUT /users/:id
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const userId = req.params.id;
    
    // Check if user is updating their own account
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Forbidden: You can only update your own account' });
    }

    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * Delete a user
 * DELETE /users/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user is deleting their own account
    if (req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own account' });
    }
    
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Instead of hard delete, we can update isActive status
    await user.update({ isActive: false });
    
    return res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    return res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

export default router;
