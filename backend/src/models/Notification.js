const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: false
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Optimized indexes for performance
notificationSchema.index({ user: 1, read: 1, createdAt: -1 }, { name: 'notification_user_read_time' });
notificationSchema.index({ user: 1, createdAt: -1 }, { name: 'notification_user_time' });
notificationSchema.index({ booking: 1 }, { name: 'notification_booking', sparse: true });
notificationSchema.index({ createdAt: -1 }, { name: 'notification_recent' });

module.exports = mongoose.model('Notification', notificationSchema); 