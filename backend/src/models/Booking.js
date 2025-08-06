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

// Add pre-save hook to debug the startTime issue
bookingSchema.pre('save', function(next) {
  console.log('🔍 MONGOOSE PRE-SAVE HOOK - BOOKING MODEL');
  console.log('Document about to be saved:', {
    _id: this._id,
    purpose: this.purpose,
    startTime: this.startTime,
    endTime: this.endTime,
    user: this.user,
    isNew: this.isNew
  });
  
  // Check if startTime is suspiciously close to current time
  const now = new Date();
  const timeDiff = Math.abs(this.startTime.getTime() - now.getTime()) / (1000 * 60);
  
  if (timeDiff < 1) {
    console.log('🚨 MONGOOSE: startTime is very close to current time!');
    console.log('startTime:', this.startTime.toISOString());
    console.log('currentTime:', now.toISOString());
    console.log('Difference (minutes):', timeDiff);
    
    // Print stack trace to see where this is being called from
    console.log('Stack trace:', new Error().stack);
  }
  
  next();
});

// Optimized indexes for performance
bookingSchema.index({ boardroom: 1, startTime: 1, endTime: 1 }, { name: 'booking_room_time_range' });
bookingSchema.index({ user: 1, createdAt: -1 }, { name: 'booking_user_created' });
bookingSchema.index({ startTime: 1, endTime: 1 }, { name: 'booking_time_range' });
bookingSchema.index({ status: 1, startTime: 1 }, { name: 'booking_status_time' });
bookingSchema.index({ user: 1, status: 1, startTime: -1 }, { name: 'booking_user_status_time' });
bookingSchema.index({ boardroom: 1, startTime: 1, status: 1 }, { name: 'booking_room_time_status' });
bookingSchema.index({ createdAt: -1 }, { name: 'booking_created_desc' });

module.exports = mongoose.model('Booking', bookingSchema); 