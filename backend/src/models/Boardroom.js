const mongoose = require('mongoose');

const boardroomSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  capacity: { 
    type: Number, 
    required: true,
    min: 1
  },
  location: { 
    type: String, 
    required: true,
    trim: true
  },
  amenities: [{
    type: String,
    trim: true
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: 'Boardroom image'
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  isActive: { 
    type: Boolean, 
    default: true 
  },
  description: {
    type: String,
    trim: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Boardroom', boardroomSchema); 