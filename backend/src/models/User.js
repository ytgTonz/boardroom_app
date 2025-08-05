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
  }
});

// Optimized indexes for performance
userSchema.index({ email: 1 }, { unique: true, name: 'user_email_unique' });
userSchema.index({ role: 1, createdAt: -1 }, { name: 'user_role_created' });
userSchema.index({ lastLogin: -1 }, { name: 'user_last_login' });

module.exports = mongoose.model('User', userSchema); 