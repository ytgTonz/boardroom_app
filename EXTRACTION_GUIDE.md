# Service Extraction Guide

This document explains how to use the extracted services from your boardroom booking application in other projects.

## 📦 Extracted Services

The following services have been extracted into reusable packages:

- **@boardroom/email-service** - Email sending with template support
- **@boardroom/auth-service** - Authentication with JWT and user management  
- **@boardroom/notification-service** - User notification system

## 🚀 Quick Start

### Option 1: Use Within Current Project (Workspaces)

The services are configured as workspaces in the main `package.json`. Install dependencies:

```bash
npm install
```

Then use in your backend:

```javascript
// Import from local packages
const EmailService = require('@boardroom/email-service');
const AuthService = require('@boardroom/auth-service');
const NotificationService = require('@boardroom/notification-service');

// Initialize services
const emailService = new EmailService();
const authService = new AuthService();
const notificationService = new NotificationService();
```

### Option 2: Copy to External Project

1. Copy the `shared-packages` directory to your new project
2. Install dependencies in each package:

```bash
cd shared-packages/email-service && npm install
cd ../auth-service && npm install  
cd ../notification-service && npm install
```

3. Use relative imports in your project:

```javascript
const EmailService = require('./shared-packages/email-service');
const AuthService = require('./shared-packages/auth-service');
const NotificationService = require('./shared-packages/notification-service');
```

### Option 3: Publish as NPM Packages

1. Update package names in each `package.json` (replace `@boardroom` with your scope)
2. Publish each package:

```bash
cd shared-packages/email-service
npm login
npm publish

cd ../auth-service  
npm publish

cd ../notification-service
npm publish
```

3. Install in any project:

```bash
npm install @yourscope/email-service @yourscope/auth-service @yourscope/notification-service
```

## 🔧 Configuration

### Environment Variables

Set these environment variables for the services:

```env
# Email Service
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password
EMAIL_FROM=Your App <noreply@yourapp.com>

# Auth Service  
JWT_SECRET=your-super-secret-jwt-key

# Database (All services)
MONGODB_URI=mongodb://localhost:27017/your-database
```

### Service Configuration

```javascript
// Email Service
const emailService = new EmailService({
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_APP_PASSWORD,
  emailFrom: 'My App <noreply@myapp.com>',
  templatesPath: './custom-templates'
});

// Auth Service
const authService = new AuthService({
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '24h',
  minPasswordLength: 8
});

// Notification Service
const notificationService = new NotificationService({
  maxNotificationsPerUser: 200,
  autoCleanupDays: 60
});
```

## 📋 Migration from Original Code

### Replace Original Email Service

**Before:**
```javascript
const emailService = require('../services/emailService');
await emailService.sendBookingNotification(booking, user, organizer, 'created');
```

**After:**
```javascript
const EmailService = require('@boardroom/email-service');
const emailService = new EmailService();
await emailService.sendBookingNotification(booking, user, organizer, 'created');
```

### Replace Original Auth Controller

**Before:**
```javascript
const { login, register } = require('../controllers/authController');
```

**After:**
```javascript
const AuthService = require('@boardroom/auth-service');
const authService = new AuthService();

// In your route handler
const result = await authService.login(email, password);
if (result.success) {
  res.json(result);
} else {
  res.status(401).json({ message: result.error });
}
```

### Replace Original Notification Controller

**Before:**
```javascript
const { getUserNotifications } = require('../controllers/notificationController');
```

**After:**
```javascript
const NotificationService = require('@boardroom/notification-service');
const notificationService = new NotificationService();

// In your route handler
const result = await notificationService.getUserNotifications(userId);
if (result.success) {
  res.json(result.notifications);
} else {
  res.status(500).json({ message: result.error });
}
```

## 🧪 Testing Services

Test all services:

```bash
npm run test:services
```

Test individual services:

```bash
cd shared-packages/email-service && npm test
cd ../auth-service && npm test  
cd ../notification-service && npm test
```

## 🔗 Integration Examples

### Complete Express.js Setup

```javascript
const express = require('express');
const EmailService = require('@boardroom/email-service');
const AuthService = require('@boardroom/auth-service');
const NotificationService = require('@boardroom/notification-service');

const app = express();
app.use(express.json());

// Initialize services
const emailService = new EmailService();
const authService = new AuthService();
const notificationService = new NotificationService();

// Create middleware
const authenticateToken = authService.createAuthMiddleware();
const requireAdmin = authService.createAdminMiddleware();

// Auth routes
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const result = await authService.register(name, email, password);
  
  if (result.success) {
    // Send welcome notification
    await notificationService.createNotification(
      result.user.id,
      'Welcome!',
      'Welcome to our platform',
      'success'
    );
    
    // Send welcome email
    await emailService.sendEmail(
      email,
      'Welcome to Our Platform',
      `Hello ${name}, welcome to our platform!`
    );
    
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
app.get('/notifications', authenticateToken, async (req, res) => {
  const result = await notificationService.getUserNotifications(req.user.userId);
  if (result.success) {
    res.json(result.notifications);
  } else {
    res.status(500).json({ message: result.error });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### React Context Integration

```javascript
// In your React app
import { createContext, useContext, useState } from 'react';

const ServicesContext = createContext();

export const ServicesProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  
  const fetchNotifications = async () => {
    const response = await fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await response.json();
    setNotifications(data);
  };
  
  return (
    <ServicesContext.Provider value={{
      notifications,
      fetchNotifications
    }}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = () => useContext(ServicesContext);
```

## 📚 Documentation

Each service includes comprehensive documentation:

- [`shared-packages/email-service/README.md`](./shared-packages/email-service/README.md)
- [`shared-packages/auth-service/README.md`](./shared-packages/auth-service/README.md)  
- [`shared-packages/notification-service/README.md`](./shared-packages/notification-service/README.md)

## 🔄 Version Control Strategy

The extraction was done on the `feature/service-extraction` branch to keep your main application safe:

```bash
# Your main application remains on main branch
git checkout main  # Original working app

# Services are extracted on feature branch
git checkout feature/service-extraction  # With extracted services
```

## 🚀 Next Steps

1. **Test the services** - Run the test scripts to verify functionality
2. **Gradual migration** - Replace original code piece by piece
3. **Create new apps** - Use these services in new projects
4. **Publish packages** - Make them available via NPM for wider use

## 🆘 Troubleshooting

### Service Not Found
```bash
# Ensure packages are installed
npm install

# Or install individual package
cd shared-packages/email-service && npm install
```

### Database Connection Issues
```javascript
// Ensure MongoDB is connected before using services
const mongoose = require('mongoose');
await mongoose.connect(process.env.MONGODB_URI);
```

### Template Errors
```bash
# Ensure email templates exist
ls shared-packages/email-service/templates/email/
```

This extraction gives you maximum flexibility to reuse these services across multiple applications while keeping your original app completely intact!