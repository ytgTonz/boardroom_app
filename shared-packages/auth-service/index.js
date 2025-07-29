// @boardroom/auth-service
// Reusable authentication service with JWT and user management
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

class AuthService {
  constructor(config = {}) {
    this.config = {
      jwtSecret: config.jwtSecret || process.env.JWT_SECRET || 'your-secret-key',
      jwtExpiresIn: config.jwtExpiresIn || '24h',
      bcryptRounds: config.bcryptRounds || 10,
      minPasswordLength: config.minPasswordLength || 6,
      ...config
    };
  }

  // Generate JWT token
  generateToken(userId, role) {
    return jwt.sign(
      { userId, role }, 
      this.config.jwtSecret,
      { expiresIn: this.config.jwtExpiresIn }
    );
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.config.jwtSecret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Hash password
  async hashPassword(password) {
    return await bcrypt.hash(password, this.config.bcryptRounds);
  }

  // Compare password
  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Validate user input
  validateUserInput(name, email, password) {
    const errors = [];

    if (!name || name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!email || !email.includes('@')) {
      errors.push('Valid email is required');
    }

    if (!password || password.length < this.config.minPasswordLength) {
      errors.push(`Password must be at least ${this.config.minPasswordLength} characters long`);
    }

    return errors;
  }

  // Register new user
  async register(name, email, password, role = 'user') {
    try {
      // Validate input
      const validationErrors = this.validateUserInput(name, email, password);
      if (validationErrors.length > 0) {
        return { 
          success: false, 
          error: validationErrors.join(', ') 
        };
      }

      // Check if user exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return { 
          success: false, 
          error: 'User already exists with this email' 
        };
      }

      // Create user
      const hashedPassword = await this.hashPassword(password);
      const user = new User({ 
        name: name.trim(), 
        email: email.toLowerCase().trim(), 
        password: hashedPassword,
        role
      });

      await user.save();

      // Generate token
      const token = this.generateToken(user._id, user.role);

      return {
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };

    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle MongoDB duplicate key error
      if (error.code === 11000) {
        return { 
          success: false, 
          error: 'User already exists with this email' 
        };
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err) => err.message);
        return { 
          success: false, 
          error: messages.join(', ') 
        };
      }
      
      return { 
        success: false, 
        error: 'Server error during registration' 
      };
    }
  }

  // Login user
  async login(email, password) {
    try {
      if (!email || !password) {
        return { 
          success: false, 
          error: 'Email and password are required' 
        };
      }

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return { 
          success: false, 
          error: 'Invalid credentials' 
        };
      }

      // Check password
      const isValidPassword = await this.comparePassword(password, user.password);
      if (!isValidPassword) {
        return { 
          success: false, 
          error: 'Invalid credentials' 
        };
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = this.generateToken(user._id, user.role);

      return {
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };

    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Server error during login' 
      };
    }
  }

  // Get user profile
  async getProfile(userId) {
    try {
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return { 
          success: false, 
          error: 'User not found' 
        };
      }

      return {
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      };
    } catch (error) {
      console.error('Get profile error:', error);
      return { 
        success: false, 
        error: 'Server error' 
      };
    }
  }

  // Get all users (admin only)
  async getAllUsers() {
    try {
      const users = await User.find({}, '_id name email role createdAt lastLogin');
      return {
        success: true,
        users: users.map(user => ({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }))
      };
    } catch (error) {
      console.error('Get all users error:', error);
      return { 
        success: false, 
        error: 'Server error' 
      };
    }
  }

  // Update user role (admin only)
  async updateUserRole(userId, newRole) {
    try {
      if (!['admin', 'user'].includes(newRole)) {
        return { 
          success: false, 
          error: 'Invalid role' 
        };
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { role: newRole },
        { new: true }
      ).select('-password');

      if (!user) {
        return { 
          success: false, 
          error: 'User not found' 
        };
      }

      return {
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      console.error('Update user role error:', error);
      return { 
        success: false, 
        error: 'Server error' 
      };
    }
  }

  // Delete user (admin only)
  async deleteUser(userId) {
    try {
      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        return { 
          success: false, 
          error: 'User not found' 
        };
      }

      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      console.error('Delete user error:', error);
      return { 
        success: false, 
        error: 'Server error' 
      };
    }
  }

  // Reset user password (admin only)
  async resetPassword(userId, newPassword) {
    try {
      if (newPassword.length < this.config.minPasswordLength) {
        return { 
          success: false, 
          error: `Password must be at least ${this.config.minPasswordLength} characters long` 
        };
      }

      const hashedPassword = await this.hashPassword(newPassword);
      const user = await User.findByIdAndUpdate(
        userId,
        { password: hashedPassword },
        { new: true }
      );

      if (!user) {
        return { 
          success: false, 
          error: 'User not found' 
        };
      }

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return { 
        success: false, 
        error: 'Server error' 
      };
    }
  }

  // Create middleware for Express.js
  createAuthMiddleware() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
          return res.status(401).json({ message: 'Access token required' });
        }

        const decoded = this.verifyToken(token);
        
        // Optionally verify user still exists
        const user = await User.findById(decoded.userId);
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }

        req.user = {
          userId: decoded.userId,
          role: decoded.role
        };
        
        next();
      } catch (error) {
        console.error('Token verification error:', error);
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
    };
  }

  // Create admin middleware for Express.js
  createAdminMiddleware() {
    return (req, res, next) => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      next();
    };
  }
}

module.exports = AuthService;