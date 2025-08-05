// backend/server.js (UPDATED WITH EMAIL)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Initialize structured logging
const logger = require('./src/utils/logger');

// Initialize database monitor
const databaseMonitor = require('./src/utils/databaseMonitor');

// Validate environment variables before starting the application
const { validateEnvironment } = require('./src/utils/validateEnvironment');
const environment = process.env.NODE_ENV || 'development';

if (!validateEnvironment(environment)) {
  logger.error('Environment validation failed. Application cannot start.');
  process.exit(1);
}

// Import services
const emailService = require('./src/services/emailService');
const reminderScheduler = require('./src/services/reminderScheduler');

const authRoutes = require('./src/routes/auth');
const boardroomRoutes = require('./src/routes/boardrooms');
const bookingRoutes = require('./src/routes/bookings');
const notificationRoutes = require('./src/routes/notifications');
const userRoutes = require('./src/routes/users');
const healthRoutes = require('./src/routes/health');
const databaseRoutes = require('./src/routes/database');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { 
    error: 'Too many requests',
    message,
    retryAfter: Math.ceil(windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }
});

// Production rate limiting configuration
const isProduction = process.env.NODE_ENV === 'production';

// Configurable rate limits with environment variable fallbacks
const rateLimits = {
  general: parseInt(process.env.RATE_LIMIT_GENERAL_MAX) || (isProduction ? 1000 : 100),
  auth: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || (isProduction ? 20 : 50),
  booking: parseInt(process.env.RATE_LIMIT_BOOKING_MAX) || (isProduction ? 30 : 50),
  email: parseInt(process.env.RATE_LIMIT_EMAIL_MAX) || (isProduction ? 10 : 20)
};

// General API rate limiting
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  rateLimits.general,
  'Too many requests from this IP, please try again later.'
);

// Authentication rate limiting - more restrictive
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  rateLimits.auth,
  'Too many authentication attempts, please try again later.'
);

// Booking operations rate limiting
const bookingLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  rateLimits.booking,
  'Too many booking requests, please slow down.'
);

// Email/notification rate limiting
const emailLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  rateLimits.email,
  'Email sending limit reached, please try again later.'
);

// Apply general rate limiting to all routes
app.use(generalLimiter);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Socket.IO configuration with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  logger.info(`🔌 User connected: ${socket.id}`);

  socket.on('join-room', (room) => {
    socket.join(room);
    logger.info(`👤 User ${socket.id} joined room: ${room}`);
  });

  socket.on('leave-room', (room) => {
    socket.leave(room);
    logger.info(`👤 User ${socket.id} left room: ${room}`);
  });

  socket.on('disconnect', () => {
    logger.info(`🔌 User disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// Middleware
app.use(express.json());
app.use(morgan('combined'));

// Request logging middleware - replace with Winston HTTP logging
app.use((req, res, next) => {
  const requestLogger = logger.withRequest(req);
  req.logger = requestLogger;
  
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    requestLogger.http('HTTP Request', {
      method: req.method,
      url: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length')
    });
  });
  
  next();
});

// MongoDB Connection with optimized settings
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/boardroom_booking';
const DatabaseMonitor = require('./src/utils/databaseMonitor');
const connectionOptions = DatabaseMonitor.getOptimizedConnectionOptions();

logger.info('Attempting to connect to MongoDB with optimized settings...', {
  uri: mongoUri.replace(/\/\/(.*):(.*)@/, '//*****:*****@'), // Hide credentials in logs
  options: {
    maxPoolSize: connectionOptions.maxPoolSize,
    minPoolSize: connectionOptions.minPoolSize,
    environment: process.env.NODE_ENV || 'development'
  }
});

mongoose.connect(mongoUri, connectionOptions)
.then(() => {
  logger.info('✅ Connected to MongoDB successfully');
  logger.info(`📊 Database: ${mongoUri.split('/').pop()}`);
  
  // Initialize email service after DB connection
  logger.info('📧 Initializing email service...');
  
  // Initialize reminder scheduler after DB connection
  logger.info('⏰ Initializing meeting reminder scheduler...');
})
.catch(err => {
  logger.error('❌ MongoDB connection error:', err);
  logger.error('Please check your MongoDB connection string and ensure MongoDB is running');
});

// Routes with specific rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/boardrooms', boardroomRoutes);
app.use('/api/bookings', bookingLimiter, bookingRoutes);
app.use('/api/notifications', emailLimiter, notificationRoutes);
app.use('/api/users', userRoutes);

// Comprehensive health check routes
app.use('/api/health', healthRoutes);

// Database monitoring routes
app.use('/api/database', databaseRoutes);

// Email test endpoint (for development)
if (process.env.NODE_ENV === 'development') {
  app.post('/api/test-email', emailLimiter, async (req, res) => {
    try {
      const { to, subject, message } = req.body;
      
      if (!to || !subject || !message) {
        return res.status(400).json({ message: 'Missing required fields: to, subject, message' });
      }
      
      const result = await emailService.sendEmail(to, subject, message);
      res.json({ message: 'Test email sent', result });
    } catch (error) {
      res.status(500).json({ message: 'Failed to send test email', error: error.message });
    }
  });
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Boardroom Booking API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    features: [
      'Authentication',
      'Boardroom Management',
      'Booking System',
      'Email Notifications',
      'Meeting Reminders',
      'Push Notifications'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('❌ Server error:', err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  logger.info(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route not found' });
});

server.listen(PORT, () => {
  logger.startup(`Server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    healthCheck: `http://localhost:${PORT}/api/health`,
    emailService: process.env.EMAIL_USER ? 'Configured' : 'Test mode',
    socketIO: 'enabled',
    rateLimits: {
      general: `${rateLimits.general} requests/15min`,
      auth: `${rateLimits.auth} requests/15min`,
      booking: `${rateLimits.booking} requests/min`,
      email: `${rateLimits.email} requests/hour`
    }
  });
});