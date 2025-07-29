const express = require('express');
const { 
  getUserBookings, 
  createBooking, 
  updateBooking,
  cancelBooking,
  adminCancelBooking,
  adminDeleteBooking, 
  getBoardroomAvailability,
  getAllBookings,
  optOutOfBooking // Import opt-out controller
} = require('../controllers/bookingController');
const { validateBooking, validateBookingUpdate } = require('../middleware/validation');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// User routes
router.get('/my-bookings', authenticateToken, getUserBookings);
router.get('/calendar', authenticateToken, getAllBookings); // Calendar view - all bookings for users
router.post('/', authenticateToken, validateBooking, createBooking);
router.put('/:id', authenticateToken, validateBookingUpdate, updateBooking);
router.delete('/:id', authenticateToken, cancelBooking);
router.patch('/:id/opt-out', authenticateToken, optOutOfBooking); // Opt-out route
router.put('/:id/cancel', authenticateToken, cancelBooking);
// Public routes
router.get('/availability/:id', getBoardroomAvailability);

// Admin routes
router.get('/all', authenticateToken, requireAdmin, getAllBookings);



module.exports = router; 