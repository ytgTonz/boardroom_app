const express = require('express');
const { 
  getUserBookings, 
  createBooking, 
  cancelBooking, 
  getBoardroomAvailability,
  getAllBookings,
  optOutOfBooking // Import opt-out controller
} = require('../controllers/bookingController');
const { validateBooking } = require('../middleware/validation');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// User routes
router.get('/my-bookings', authenticateToken, getUserBookings);
router.post('/', authenticateToken, validateBooking, createBooking);
router.delete('/:id', authenticateToken, cancelBooking);
router.patch('/:id/opt-out', authenticateToken, optOutOfBooking); // Opt-out route

// Public routes
router.get('/availability/:id', getBoardroomAvailability);

// Admin routes
router.get('/all', authenticateToken, requireAdmin, getAllBookings);



module.exports = router; 