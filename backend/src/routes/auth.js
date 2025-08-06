const express = require('express');
const { 
  register, 
  login, 
  getProfile, 
  getAllUsers,
  forgotPassword,
  validateResetToken,
  resetPassword
} = require('../controllers/authController');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.get('/users', authenticateToken, getAllUsers);

module.exports = router; 