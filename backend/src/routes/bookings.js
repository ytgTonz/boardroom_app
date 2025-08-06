const express = require('express');
const { 
  getUserBookings, 
  createBooking, 
  updateBooking,
  cancelBooking,
  deleteBooking,
  adminCancelBooking,
  adminDeleteBooking, 
  getBoardroomAvailability,
  getDetailedAvailability,
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
router.delete('/:id', authenticateToken, deleteBooking);
router.patch('/:id/opt-out', authenticateToken, optOutOfBooking); // Opt-out route
router.put('/:id/cancel', authenticateToken, cancelBooking);
// Public routes
router.get('/availability/:id', getBoardroomAvailability);
router.get('/detailed-availability/:boardroomId', getDetailedAvailability);

// Admin routes
router.get('/all', authenticateToken, requireAdmin, getAllBookings);
router.put('/admin/:id/cancel', authenticateToken, requireAdmin, adminCancelBooking);
router.delete('/admin/:id', authenticateToken, requireAdmin, adminDeleteBooking);



module.exports = router; 