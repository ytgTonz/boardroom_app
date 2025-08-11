const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const logger = require('../utils/logger');
const errorTracker = require('../utils/sentryConfig');
const emailService = require('../services/emailService');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if all required fields are present
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: 'Name, email, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.logAuth('register', null, false, { email, reason: 'User already exists' });
      errorTracker.trackAuth('register', email, false, { reason: 'User already exists' });
      return res.status(400).json({ message: 'User already exists' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Track successful registration
    logger.logAuth('register', user._id.toString(), true, { email, name });
    errorTracker.trackAuth('register', user._id.toString(), true, { email, name });
    errorTracker.setUser({ id: user._id.toString(), email, name });

    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        name, 
        email, 
        role: user.role,
        phone: user.phone,
        department: user.department,
        position: user.position,
        location: user.location,
        createdAt: user.createdAt
      } 
    });
  } catch (error) {
    // Track registration error
    errorTracker.captureException(error, {
      tags: { operation: 'user_registration' },
      extra: { email: req.body.email }
    });

    logger.error('Registration error:', error);
    
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      errorTracker.trackAuth('register', req.body.email, false, { reason: 'Duplicate key error' });
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      errorTracker.trackAuth('register', req.body.email, false, { reason: 'Validation error', messages });
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if both email and password are provided
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }
    
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
      logger.logAuth('login', user ? user.email : null, false, { reason: 'Invalid credentials' });
      errorTracker.trackAuth('login', email, false, { reason: 'Invalid credentials' });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Track successful login
    logger.logAuth('login', user._id.toString(), true, { email, name: user.name });
    errorTracker.trackAuth('login', user._id.toString(), true, { email, name: user.name });
    errorTracker.setUser({ id: user._id.toString(), email, name: user.name });

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email, 
        role: user.role,
        phone: user.phone,
        department: user.department,
        position: user.position,
        location: user.location,
        createdAt: user.createdAt
      } 
    });
  } catch (error) {
    // Track login error
    errorTracker.captureException(error, {
      tags: { operation: 'user_login' },
      extra: { email: req.body.email }
    });

    logger.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '_id name email role');
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot password - send reset token via email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    const emailSubject = 'Password Reset Request - Boardroom Booking';
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
        
        <p>Hi ${user.name},</p>
        
        <p>We received a request to reset your password for your Boardroom Booking account.</p>
        
        <p>Click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset My Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          If the button above doesn't work, copy and paste this link into your browser:
          <br>
          <a href="${resetUrl}" style="color: #4F46E5; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          <strong>Important:</strong> This link will expire in 1 hour for security reasons.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px;">
          This email was sent from the Boardroom Booking System. If you have questions, please contact your administrator.
        </p>
      </div>
    `;

    await emailService.sendEmail(email, emailSubject, emailBody, true);

    // Track password reset request
    logger.info('Password reset requested', { 
      userId: user._id.toString(),
      email,
      tokenExpiry: resetTokenExpiry
    });
    
    errorTracker.addBreadcrumb({
      category: 'auth',
      message: 'Password reset token sent',
      level: 'info',
      data: { email: '[REDACTED]', userId: user._id.toString() }
    });

    res.json({ message: 'Password reset instructions have been sent to your email' });
  } catch (error) {
    logger.error('Forgot password error:', error);
    errorTracker.captureException(error, {
      tags: { operation: 'forgot_password' },
      extra: { email: req.body.email }
    });
    res.status(500).json({ message: 'Failed to send password reset email' });
  }
};

// Validate reset token
const validateResetToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Reset token is required' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Reset token is valid' });
  } catch (error) {
    logger.error('Validate reset token error:', error);
    errorTracker.captureException(error, {
      tags: { operation: 'validate_reset_token' }
    });
    res.status(500).json({ message: 'Failed to validate reset token' });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters long' 
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Track successful password reset
    logger.info('Password reset successful', { 
      userId: user._id.toString(),
      email: user.email
    });
    
    errorTracker.addBreadcrumb({
      category: 'auth',
      message: 'Password reset completed',
      level: 'info',
      data: { userId: user._id.toString() }
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    logger.error('Reset password error:', error);
    errorTracker.captureException(error, {
      tags: { operation: 'reset_password' }
    });
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

module.exports = { 
  register, 
  login, 
  getProfile, 
  getAllUsers,
  forgotPassword,
  validateResetToken,
  resetPassword
}; 