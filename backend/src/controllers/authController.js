const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const errorTracker = require('../utils/sentryConfig');

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
    errorTracker.trackAuth('register', user._id.toString(), true, { email, name });
    errorTracker.setUser({ id: user._id.toString(), email, name });

    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        name, 
        email, 
        role: user.role 
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
    errorTracker.trackAuth('login', user._id.toString(), true, { email, name: user.name });
    errorTracker.setUser({ id: user._id.toString(), email, name: user.name });

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email, 
        role: user.role 
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

module.exports = { register, login, getProfile, getAllUsers }; 