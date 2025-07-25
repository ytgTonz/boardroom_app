// backend/src/controllers/bookingController.js (UPDATED WITH EMAIL)
const Booking = require('../models/Booking');
const Boardroom = require('../models/Boardroom');
const User = require('../models/User');
const Notification = require('../models/Notification');
const emailService = require('../services/emailService');

const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ attendees: req.user.userId })
      .populate('user', 'name email')
      .populate('boardroom', 'name location capacity amenities')
      .populate('attendees', 'name email')
      .sort({ startTime: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createBooking = async (req, res) => {
  try {
    const { boardroom, startTime, endTime, purpose, attendees, notes } = req.body;
    
    // Validate attendees array
    if (!Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ message: 'Attendees must be a non-empty array of user IDs' });
    }
    
    // Validate boardroom exists and is active
    const boardroomExists = await Boardroom.findOne({ _id: boardroom, isActive: true });
    if (!boardroomExists) {
      return res.status(400).json({ message: 'Boardroom not found or inactive' });
    }
    
    // Validate time is in future
    if (new Date(startTime) <= new Date()) {
      return res.status(400).json({ message: 'Start time must be in the future' });
    }
    
    // Check for boardroom conflicts
    const conflict = await Booking.findOne({
      boardroom,
      status: 'confirmed',
      $or: [
        { 
          startTime: { $lt: new Date(endTime) }, 
          endTime: { $gt: new Date(startTime) }
        }
      ]
    });
    
    if (conflict) {
      return res.status(400).json({ 
        message: 'Boardroom is already booked for this time slot',
        conflictingBooking: {
          purpose: conflict.purpose,
          startTime: conflict.startTime,
          endTime: conflict.endTime
        }
      });
    }
    
    // Add the creator to attendees if not already included
    const allAttendees = attendees.includes(req.user.userId) 
      ? attendees 
      : [...attendees, req.user.userId];
    
    const booking = new Booking({
      user: req.user.userId,
      boardroom,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      purpose,
      attendees: allAttendees,
      notes: notes || ''
    });
    
    await booking.save();
    
    // Get full user details for email notifications
    const organizer = await User.findById(req.user.userId);
    const attendeeUsers = await User.find({ _id: { $in: allAttendees } });
    
    // Create notifications for attendees (except creator)
    const notificationPromises = allAttendees
      .filter(id => id.toString() !== req.user.userId)
      .map(id => Notification.create({
        user: id,
        message: `You have been invited to "${purpose}" in ${boardroomExists.name}`,
        booking: booking._id
      }));
    
    await Promise.all(notificationPromises);
    
    // Get populated booking for email
    const populatedBooking = await Booking.findById(booking._id)
      .populate('user', 'name email')
      .populate('boardroom', 'name location capacity amenities')
      .populate('attendees', 'name email');
    
    // Send email notifications
    try {
      // Send confirmation email to organizer
      await emailService.sendBookingNotification(populatedBooking, organizer, organizer, 'created');
      
      // Send invitation emails to attendees
      const emailPromises = attendeeUsers
        .filter(user => user._id.toString() !== req.user.userId)
        .map(user => emailService.sendBookingNotification(populatedBooking, user, organizer, 'created'));
      
      const emailResults = await Promise.all(emailPromises);
      
      console.log('📧 Email notifications sent:', emailResults.length);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the booking creation if email fails
    }
    
    res.status(201).json(populatedBooking);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ 
      _id: req.params.id, 
      user: req.user.userId,
      status: 'confirmed' 
    }).populate('boardroom', 'name location')
      .populate('attendees', 'name email')
      .populate('user', 'name email');
    
    if (!booking) {
      return res.status(404).json({ 
        message: 'Booking not found or you do not have permission to cancel it' 
      });
    }
    
    // Update booking status
    booking.status = 'cancelled';
    await booking.save();
    
    // Create notifications for attendees about cancellation
    const notificationPromises = booking.attendees
      .filter(attendee => attendee._id.toString() !== req.user.userId)
      .map(attendee => Notification.create({
        user: attendee._id,
        message: `Meeting "${booking.purpose}" in ${booking.boardroom.name} has been cancelled`,
        booking: booking._id
      }));
    
    await Promise.all(notificationPromises);
    
    // Send cancellation emails
    try {
      const cancellationPromises = booking.attendees.map(user => 
        emailService.sendBookingNotification(booking, user, booking.user, 'cancelled')
      );
      await Promise.all(cancellationPromises);
      console.log('📧 Cancellation emails sent to attendees');
    } catch (emailError) {
      console.error('Cancellation email sending failed:', emailError);
    }
    
    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBoardroomAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date parameter is required' });
    }
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      boardroom: req.params.id,
      status: 'confirmed',
      startTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ startTime: 1 })
      .populate('user', 'name');

    res.json(bookings);
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllBookings = async (req, res) => {
  try {
    console.log('getAllBookings called by user:', req.user.userId);
    
    const { page = 1, limit = 1000, status, boardroom } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (boardroom) filter.boardroom = boardroom;
    
    console.log('Filter:', filter);
    
    const bookings = await Booking.find(filter)
      .populate('user', 'name email')
      .populate('boardroom', 'name location capacity amenities')
      .populate('attendees', 'name email')
      .sort({ startTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
      
    console.log('Found bookings:', bookings.length);
    
    // Return simple array instead of paginated response for easier frontend handling
    res.json(bookings);
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const optOutOfBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate('boardroom', 'name')
      .populate('attendees', 'name email');
      
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check if user is in attendees
    if (!booking.attendees.some(attendee => attendee._id.toString() === req.user.userId)) {
      return res.status(400).json({ message: 'You are not an attendee of this booking' });
    }
    
    // Don't allow creator to opt out - they should cancel instead
    if (booking.user._id.toString() === req.user.userId) {
      return res.status(400).json({ 
        message: 'As the organizer, you cannot opt out. Please cancel the booking instead.' 
      });
    }
    
    // Get user info before removing from attendees
    const optOutUser = await User.findById(req.user.userId);
    
    // Remove user from attendees
    booking.attendees = booking.attendees.filter(
      (attendee) => attendee._id.toString() !== req.user.userId
    );
    
    await booking.save();
    
    // Notify organizer about opt-out
    await Notification.create({
      user: booking.user._id,
      message: `${optOutUser.name} opted out of your meeting "${booking.purpose}" in ${booking.boardroom.name}`,
      booking: booking._id
    });
    
    // Send email notification to organizer
    try {
      await emailService.sendEmail(
        booking.user.email,
        `Attendee Opted Out: ${booking.purpose}`,
        `
        Hello ${booking.user.name},
        
        ${optOutUser.name} has opted out of your meeting:
        
        Meeting: ${booking.purpose}
        Room: ${booking.boardroom.name}
        Time: ${new Date(booking.startTime).toLocaleString()}
        
        Please plan accordingly.
        
        Best regards,
        Boardroom Booking System
        `
      );
    } catch (emailError) {
      console.error('Opt-out email sending failed:', emailError);
    }
    
    res.json({ message: 'You have opted out of this meeting', booking });
  } catch (error) {
    console.error('Opt-out error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserBookings,
  createBooking,
  cancelBooking,
  getBoardroomAvailability,
  getAllBookings,
  optOutOfBooking
};