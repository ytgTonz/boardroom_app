const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  boardroom: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Boardroom', 
    required: true 
  },
  startTime: { 
    type: Date, 
    required: true 
  },
  endTime: { 
    type: Date, 
    required: true 
  },
  purpose: { 
    type: String, 
    required: true,
    trim: true
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  externalAttendees: [{
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      default: function() {
        return this.email.split('@')[0];
      }
    }
  }],
  // attendees: { 
  //   type: Number, 
  //   required: true,
  //   min: 1
  // }, // Deprecated: replaced by attendees array above
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled'], 
    default: 'confirmed' 
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  modifiedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
bookingSchema.index({ boardroom: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema); 