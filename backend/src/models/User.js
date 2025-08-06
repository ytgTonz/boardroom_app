const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['admin', 'user'], 
    default: 'user' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  // Profile fields
  phone: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  // Password reset fields
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  }
});

// Optimized indexes for performance
userSchema.index({ email: 1 }, { unique: true, name: 'user_email_unique' });
userSchema.index({ role: 1, createdAt: -1 }, { name: 'user_role_created' });
userSchema.index({ lastLogin: -1 }, { name: 'user_last_login' });
userSchema.index({ resetPasswordToken: 1 }, { sparse: true, name: 'user_reset_token' });

module.exports = mongoose.model('User', userSchema); 