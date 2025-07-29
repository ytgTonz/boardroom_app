# @boardroom/auth-service

Reusable authentication service with JWT and user management for Node.js applications.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication
- 👥 **User Management** - Registration, login, profile management
- 🛡️ **Role-Based Access** - Admin and user roles with middleware
- 🔒 **Password Security** - bcrypt hashing with configurable rounds
- ⚡ **Express Middleware** - Ready-to-use middleware for routes
- 🧪 **Validation** - Built-in input validation and error handling

## Installation

```bash
npm install @boardroom/auth-service
```

## Quick Start

```javascript
const AuthService = require('@boardroom/auth-service');

// Initialize service
const authService = new AuthService({
  jwtSecret: 'your-secret-key',
  jwtExpiresIn: '24h'
});

// Register user
const result = await authService.register('John Doe', 'john@example.com', 'password123');
if (result.success) {
  console.log('User registered:', result.user);
  console.log('Token:', result.token);
}

// Login user
const loginResult = await authService.login('john@example.com', 'password123');
if (loginResult.success) {
  console.log('Login successful:', loginResult.user);
}
```

## Configuration

```javascript
const authService = new AuthService({
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: '24h',
  bcryptRounds: 10,
  minPasswordLength: 6
});
```

## Environment Variables

```env
JWT_SECRET=your-super-secret-jwt-key
```

## API Methods

### User Registration

```javascript
const result = await authService.register(name, email, password, role);
// Returns: { success: boolean, token?: string, user?: object, error?: string }
```

### User Login

```javascript
const result = await authService.login(email, password);
// Returns: { success: boolean, token?: string, user?: object, error?: string }
```

### Get User Profile

```javascript
const result = await authService.getProfile(userId);
// Returns: { success: boolean, user?: object, error?: string }
```

### Admin Methods

```javascript
// Get all users
const users = await authService.getAllUsers();

// Update user role
const result = await authService.updateUserRole(userId, 'admin');

// Delete user
const result = await authService.deleteUser(userId);

// Reset password
const result = await authService.resetPassword(userId, 'newPassword123');
```

## Express.js Integration

### Basic Setup

```javascript
const express = require('express');
const AuthService = require('@boardroom/auth-service');

const app = express();
const authService = new AuthService();

// Create middleware
const authenticateToken = authService.createAuthMiddleware();
const requireAdmin = authService.createAdminMiddleware();

// Routes
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const result = await authService.register(name, email, password);
  
  if (result.success) {
    res.status(201).json(result);
  } else {
    res.status(400).json({ message: result.error });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(401).json({ message: result.error });
  }
});

// Protected routes
app.get('/profile', authenticateToken, async (req, res) => {
  const result = await authService.getProfile(req.user.userId);
  if (result.success) {
    res.json(result.user);
  } else {
    res.status(404).json({ message: result.error });
  }
});

// Admin only routes
app.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  const result = await authService.getAllUsers();
  if (result.success) {
    res.json(result.users);
  } else {
    res.status(500).json({ message: result.error });
  }
});
```

### Complete Express Routes

```javascript
const express = require('express');
const router = express.Router();

// Auth routes
router.post('/register', (req, res) => {
  // Registration logic using authService.register()
});

router.post('/login', (req, res) => {
  // Login logic using authService.login()
});

router.get('/profile', authenticateToken, (req, res) => {
  // Profile logic using authService.getProfile()
});

// Admin routes
router.get('/users', authenticateToken, requireAdmin, (req, res) => {
  // Get all users using authService.getAllUsers()
});

router.put('/users/:id/role', authenticateToken, requireAdmin, (req, res) => {
  // Update user role using authService.updateUserRole()
});

module.exports = router;
```

## JWT Token Handling

### Verify Token

```javascript
try {
  const decoded = authService.verifyToken(token);
  console.log('User ID:', decoded.userId);
  console.log('Role:', decoded.role);
} catch (error) {
  console.error('Invalid token:', error.message);
}
```

### Generate Token

```javascript
const token = authService.generateToken(userId, userRole);
```

## Password Security

```javascript
// Hash password
const hashedPassword = await authService.hashPassword('plainPassword');

// Compare password
const isValid = await authService.comparePassword('plainPassword', hashedPassword);
```

## Error Handling

All methods return a consistent response format:

```javascript
{
  success: boolean,
  user?: object,      // User data (when successful)
  token?: string,     // JWT token (when successful)
  error?: string,     // Error message (when failed)
  message?: string    // Success message (for operations like delete)
}
```

## Database Requirements

This service requires MongoDB with Mongoose. Ensure your database connection is established before using the service.

```javascript
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/your-database');
```

## Testing

```bash
npm test
```

## User Model Schema

```javascript
{
  name: String (required),
  email: String (required, unique, lowercase),
  password: String (required, hashed),
  role: String (enum: ['admin', 'user'], default: 'user'),
  createdAt: Date (default: now),
  lastLogin: Date (default: now)
}
```