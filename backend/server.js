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

// Import services
const emailService = require('./src/services/emailService');
const reminderScheduler = require('./src/services/reminderScheduler');

const authRoutes = require('./src/routes/auth');
const boardroomRoutes = require('./src/routes/boardrooms');
const bookingRoutes = require('./src/routes/bookings');
const notificationRoutes = require('./src/routes/notifications');
const userRoutes = require('./src/routes/users');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

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
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`👤 User ${socket.id} joined room: ${room}`);
  });

  socket.on('leave-room', (room) => {
    socket.leave(room);
    console.log(`👤 User ${socket.id} left room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// Middleware
app.use(express.json());
app.use(morgan('combined'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/boardroom_booking';
console.log('Attempting to connect to MongoDB...');

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
  console.log(`📊 Database: ${mongoUri.split('/').pop()}`);
  
  // Initialize email service after DB connection
  console.log('📧 Initializing email service...');
  
  // Initialize reminder scheduler after DB connection
  console.log('⏰ Initializing meeting reminder scheduler...');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.error('Please check your MongoDB connection string and ensure MongoDB is running');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/boardrooms', boardroomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    emailService: 'active',
    reminderService: 'active'
  });
});

// Email test endpoint (for development)
if (process.env.NODE_ENV === 'development') {
  app.post('/api/test-email', async (req, res) => {
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
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📧 Email service: ${process.env.EMAIL_USER ? 'Configured' : 'Using test mode'}`);
  console.log(`🔌 Socket.IO enabled for real-time updates`);
});