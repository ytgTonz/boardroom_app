/**
 * Authentication Controller Tests
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../models/User');
jest.mock('../utils/logger');
jest.mock('../utils/sentryConfig');

const User = require('../models/User');
const authController = require('../controllers/authController');
const logger = require('../utils/logger');
const errorTracker = require('../utils/sentryConfig');

// Create test app
const app = express();
app.use(express.json());

// Set up test environment
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-32-chars';

// Mock routes
app.post('/login', authController.login);
app.post('/register', authController.register);

describe('Authentication Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock logger methods
    logger.logAuth = jest.fn();
    logger.logError = jest.fn();
  });

  describe('POST /login', () => {
    it('should login with valid credentials', async () => {
      // Mock user data
      const mockUser = {
        _id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 12),
        role: 'user'
      };

      // Mock User.findOne to return the mock user
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user).not.toHaveProperty('password');
      expect(logger.logAuth).toHaveBeenCalledWith('login', 'user123', true, expect.any(Object));
    });

    it('should reject invalid email', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
      expect(logger.logAuth).toHaveBeenCalledWith('login', null, false, expect.any(Object));
    });

    it('should reject invalid password', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        password: await bcrypt.hash('correctpassword', 12)
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
      expect(logger.logAuth).toHaveBeenCalledWith('login', 'user123', false, expect.any(Object));
    });

    it('should handle missing credentials', async () => {
      const response = await request(app)
        .post('/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email and password are required');
    });
  });

  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      // Mock User.findOne to return null (user doesn't exist)
      User.findOne = jest.fn().mockResolvedValue(null);
      
      // Mock User constructor and save
      const mockSave = jest.fn().mockResolvedValue({
        _id: 'newuser123',
        name: 'New User',
        email: 'newuser@example.com',
        role: 'user'
      });
      
      User.mockImplementation(() => ({
        save: mockSave
      }));

      const response = await request(app)
        .post('/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(logger.logAuth).toHaveBeenCalledWith('register', 'newuser123', true, expect.any(Object));
    });

    it('should reject duplicate email', async () => {
      // Mock User.findOne to return existing user
      User.findOne = jest.fn().mockResolvedValue({ email: 'existing@example.com' });

      const response = await request(app)
        .post('/register')
        .send({
          name: 'New User',
          email: 'existing@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User already exists');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          email: 'test@example.com'
          // Missing name and password
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Name, email, and password are required');
    });

    it('should validate password length', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: '123' // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Password must be at least 6 characters long');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Please provide a valid email');
    });
  });

  describe('JWT Token Validation', () => {
    it('should generate valid JWT token on login', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 12),
        role: 'user'
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      
      // Verify JWT token
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe('user123');
      expect(decoded.role).toBe('user');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      User.findOne = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Server error');
      expect(logger.logError).toHaveBeenCalled();
    });
  });
});