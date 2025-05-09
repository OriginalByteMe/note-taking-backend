import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';

// JWT secret key - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development';
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '24h'; // Token expires in 1 hour

/**
 * Generate a JWT token for a user
 * 
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id,
      username: user.username,
      email: user.email 
    }, 
    JWT_SECRET, 
    { expiresIn: TOKEN_EXPIRY }
  );
};

/**
 * Authentication middleware for protected routes
 * Verifies the JWT token in the Authorization header
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required. Please provide a valid token.' 
      });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Authentication token is missing' 
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Find user by ID
      const user = await db.User.findByPk(decoded.id);
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Add user data to request object
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email
      };
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
};
