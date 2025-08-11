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
  console.log('\n\n🔥🔥🔥 BOOKING CREATION STARTED 🔥🔥🔥');
  console.log('=== BACKEND: createBooking called ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('User:', req.user);
  
  try {
    const { boardroom, startTime, endTime, purpose, attendees, notes } = req.body;
    
    console.log('🎯 IMMEDIATELY after destructuring:');
    console.log('startTime from req.body:', startTime);
    console.log('endTime from req.body:', endTime);
    
    // Handle both old format (array of strings) and new format (object with users/external)
    let userAttendees = [];
    let externalAttendees = [];
    
    if (attendees) {
      if (Array.isArray(attendees)) {
        // Old format - array of user IDs
        userAttendees = attendees;
      } else if (attendees.users || attendees.external) {
        // New format - object with users and external arrays
        userAttendees = attendees.users || [];
        externalAttendees = (attendees.external || []).map(email => ({ email }));
      }
    }
    
    // Validate boardroom exists and is active
    const boardroomExists = await Boardroom.findOne({ _id: boardroom, isActive: true });
    if (!boardroomExists) {
      return res.status(400).json({ message: 'Boardroom not found or inactive' });
    }
    
    // Validate time is in future (convert to UTC for comparison)
    const startTimeUTCForValidation = new Date(startTime);
    const endTimeUTCForValidation = new Date(endTime);
    
    if (startTimeUTCForValidation <= new Date()) {
      return res.status(400).json({ message: 'Start time must be in the future' });
    }
    
    // Check same day booking
    if (startTimeUTCForValidation.toDateString() !== endTimeUTCForValidation.toDateString()) {
      return res.status(400).json({ message: 'Booking cannot span multiple days' });
    }
    
    // Check working hours (7:00-16:00)
    const startHour = startTimeUTCForValidation.getUTCHours();
    const endHour = endTimeUTCForValidation.getUTCHours();
    const endMinutes = endTimeUTCForValidation.getUTCMinutes();
    
    if (startHour < 7 || startHour >= 16 || endHour < 7 || (endHour >= 16 && endMinutes > 0)) {
      return res.status(400).json({ message: 'Booking must be within working hours (07:00-16:00)' });
    }
    
    // Maximum duration check (8 hours)
    const durationHours = (endTimeUTCForValidation - startTimeUTCForValidation) / (1000 * 60 * 60);
    if (durationHours > 8) {
      return res.status(400).json({ message: 'Maximum booking duration is 8 hours' });
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
    
    // Add the creator to user attendees if not already included
    const allUserAttendees = userAttendees.includes(req.user.userId) 
      ? userAttendees 
      : [...userAttendees, req.user.userId];
    
    // Convert times to UTC to ensure consistent storage
    console.log('📅 About to convert startTime:', startTime, 'Type:', typeof startTime);
    if (!startTime || !endTime) {
      console.log('🚨 ERROR: startTime or endTime is missing!');
      return res.status(400).json({ message: 'startTime and endTime are required' });
    }
    
    // Validate that the startTime is not the current time (which would indicate a bug)
    const now = new Date();
    const userStartTime = new Date(startTime);
    const timeDiffMinutes = Math.abs(userStartTime.getTime() - now.getTime()) / (1000 * 60);
    
    if (timeDiffMinutes < 1) {
      console.log('🚨 SUSPICIOUS: User startTime is very close to current time');
      console.log('User startTime:', userStartTime.toISOString());
      console.log('Current time:', now.toISOString());
      console.log('Difference (minutes):', timeDiffMinutes);
      
      // This might indicate the frontend sent the wrong time, let's reject it
      return res.status(400).json({ 
        message: 'Invalid booking time. The selected start time appears to be the current time instead of a future booking slot.',
        debug: {
          receivedStartTime: startTime,
          parsedStartTime: userStartTime.toISOString(),
          currentTime: now.toISOString(),
          diffMinutes: timeDiffMinutes
        }
      });
    }
    
    const startTimeUTC = userStartTime;
    const endTimeUTC = new Date(endTime);
    
    console.log('📅 After conversion and validation:');
    console.log('startTimeUTC:', startTimeUTC.toISOString());
    console.log('endTimeUTC:', endTimeUTC.toISOString());
    
    console.log("=== DEBUGGING BOOKING CREATION ===");
    console.log("Original start time from frontend:", startTime);
    console.log("Converted to UTC:", startTimeUTC.toISOString());
    console.log("Type of startTime:", typeof startTime);
    console.log("Type of startTimeUTC:", typeof startTimeUTC);
    console.log("startTimeUTC value:", startTimeUTC);
    console.log("Current time for comparison:", new Date().toISOString());
    
    const booking = new Booking({
      user: req.user.userId,
      boardroom,
      startTime: startTimeUTC,
      endTime: endTimeUTC,
      purpose,
      attendees: allUserAttendees,
      externalAttendees: externalAttendees,
      notes: notes || ''
    });
    
    await booking.save();
    
    console.log("🚨 AFTER SAVE - What was actually saved:");
    console.log("Saved booking startTime:", booking.startTime.toISOString());
    console.log("Saved booking endTime:", booking.endTime.toISOString());
    console.log("Saved booking createdAt:", booking.createdAt.toISOString());
    
    // Get full user details for email notifications
    const organizer = await User.findById(req.user.userId);
    const attendeeUsers = await User.find({ _id: { $in: allUserAttendees } });
    
    // Create notifications for user attendees (except creator)
    const notificationPromises = allUserAttendees
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
      
      // Send invitation emails to registered user attendees
      const userEmailPromises = attendeeUsers
        .filter(user => user._id.toString() !== req.user.userId)
        .map(user => emailService.sendBookingNotification(populatedBooking, user, organizer, 'created'));
      
      // Send invitation emails to external attendees
      const externalEmailPromises = externalAttendees.map(async (external) => {
        const emailData = {
          to: external.email,
          subject: `Meeting Invitation: ${purpose}`,
          html: `
            <h2>You're invited to a meeting</h2>
            <p><strong>Meeting:</strong> ${purpose}</p>
            <p><strong>Organizer:</strong> ${organizer.name} (${organizer.email})</p>
            <p><strong>Room:</strong> ${boardroomExists.name} - ${boardroomExists.location}</p>
            <p><strong>Time:</strong> ${new Date(startTime).toLocaleString('en-US', { timeZoneName: 'short' })} - ${new Date(endTime).toLocaleString('en-US', { timeZoneName: 'short' })}</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            <p>Please contact the organizer if you have any questions.</p>
          `
        };
        return emailService.sendEmail(emailData.to, emailData.subject, emailData.html);
      });
      
      const allEmailPromises = [...userEmailPromises, ...externalEmailPromises];
      const emailResults = await Promise.all(allEmailPromises);
      
      console.log('📧 Email notifications sent:', emailResults.length);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the booking creation if email fails
    }
    
    // Emit Socket.IO event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('booking-created', {
        booking: populatedBooking,
        boardroomId: boardroom
      });
      console.log('🔌 Socket.IO: booking-created event emitted');
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
    booking.modifiedAt = new Date();
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
    
    // Emit Socket.IO event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('booking-cancelled', {
        booking,
        boardroomId: booking.boardroom._id
      });
      console.log('🔌 Socket.IO: booking-cancelled event emitted');
    }
    
    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin-only booking cancellation (can cancel any booking)
const adminCancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ 
      _id: req.params.id,
      status: 'confirmed' 
    }).populate('boardroom', 'name location')
      .populate('attendees', 'name email')
      .populate('user', 'name email');
    
    if (!booking) {
      return res.status(404).json({ 
        message: 'Booking not found' 
      });
    }
    
    // Update booking status
    booking.status = 'cancelled';
    booking.modifiedAt = new Date();
    await booking.save();
    
    // Create notifications for all attendees about admin cancellation
    const notificationPromises = [];
    
    if (booking.attendees && Array.isArray(booking.attendees)) {
      booking.attendees.forEach(attendee => {
        notificationPromises.push(
          Notification.create({
            user: attendee._id,
            message: `Meeting "${booking.purpose}" in ${booking.boardroom.name} has been cancelled by admin`,
            booking: booking._id
          })
        );
      });
    }
    
    // Also notify the organizer if they're not in attendees
    const attendeeIds = booking.attendees ? booking.attendees.map(att => att._id.toString()) : [];
    if (!attendeeIds.includes(booking.user._id.toString())) {
      notificationPromises.push(
        Notification.create({
          user: booking.user._id,
          message: `Your meeting "${booking.purpose}" in ${booking.boardroom.name} has been cancelled by admin`,
          booking: booking._id
        })
      );
    }
    
    await Promise.all(notificationPromises);
    
    // Send cancellation emails
    try {
      const allRecipients = [];
      
      if (booking.attendees && Array.isArray(booking.attendees)) {
        allRecipients.push(...booking.attendees);
      }
      
      const attendeeIds = booking.attendees ? booking.attendees.map(att => att._id.toString()) : [];
      if (!attendeeIds.includes(booking.user._id.toString())) {
        allRecipients.push(booking.user);
      }
      
      const cancellationPromises = allRecipients.map(user => 
        emailService.sendBookingNotification(booking, user, booking.user, 'cancelled')
      );
      await Promise.all(cancellationPromises);
      console.log('📧 Admin cancellation emails sent to all participants');
    } catch (emailError) {
      console.error('Admin cancellation email sending failed:', emailError);
    }
    
    // Emit Socket.IO event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('booking-cancelled', {
        booking,
        boardroomId: booking.boardroom._id,
        cancelledBy: 'admin'
      });
      console.log('🔌 Socket.IO: booking-cancelled event emitted (admin)');
    }
    
    res.json({ message: 'Booking cancelled successfully by admin', booking });
  } catch (error) {
    console.error('Admin cancel booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin-only booking deletion (permanently delete any booking)
const adminDeleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('boardroom', 'name location')
      .populate('attendees', 'name email')
      .populate('user', 'name email');
    
    if (!booking) {
      return res.status(404).json({ 
        message: 'Booking not found' 
      });
    }
    
    // Create notifications for all attendees about admin deletion
    const notificationPromises = [];
    
    if (booking.attendees && Array.isArray(booking.attendees)) {
      booking.attendees.forEach(attendee => {
        notificationPromises.push(
          Notification.create({
            user: attendee._id,
            message: `Meeting "${booking.purpose}" in ${booking.boardroom.name} has been deleted by admin`,
            booking: booking._id
          })
        );
      });
    }
    
    // Also notify the organizer if they're not in attendees
    const attendeeIds = booking.attendees ? booking.attendees.map(att => att._id.toString()) : [];
    if (!attendeeIds.includes(booking.user._id.toString())) {
      notificationPromises.push(
        Notification.create({
          user: booking.user._id,
          message: `Your meeting "${booking.purpose}" in ${booking.boardroom.name} has been deleted by admin`,
          booking: booking._id
        })
      );
    }
    
    await Promise.all(notificationPromises);
    
    // Delete the booking
    await Booking.findByIdAndDelete(req.params.id);
    
    // Emit Socket.IO event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('booking-deleted', {
        booking,
        boardroomId: booking.boardroom._id,
        deletedBy: 'admin'
      });
      console.log('🔌 Socket.IO: booking-deleted event emitted (admin)');
    }
    
    res.json({ message: 'Booking deleted successfully by admin', booking });
  } catch (error) {
    console.error('Admin delete booking error:', error);
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

// New enhanced availability endpoint for real-time slot checking
const getDetailedAvailability = async (req, res) => {
  try {
    const { boardroomId } = req.params;
    const { date, startTime, endTime } = req.query;
    
    if (!boardroomId) {
      return res.status(400).json({ message: 'Boardroom ID is required' });
    }
    
    // Validate boardroom exists and is active
    const boardroom = await Boardroom.findOne({ _id: boardroomId, isActive: true });
    if (!boardroom) {
      return res.status(404).json({ message: 'Boardroom not found or inactive' });
    }
    
    let queryDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get all confirmed bookings for the specified date/boardroom
    const bookings = await Booking.find({
      boardroom: boardroomId,
      status: 'confirmed',
      $or: [
        { 
          startTime: { $gte: startOfDay, $lte: endOfDay } 
        },
        { 
          endTime: { $gte: startOfDay, $lte: endOfDay }
        },
        {
          startTime: { $lt: startOfDay },
          endTime: { $gt: endOfDay }
        }
      ]
    }).sort({ startTime: 1 })
      .populate('user', 'name')
      .select('startTime endTime purpose user');
    
    // If specific time range is provided, check availability for that slot
    if (startTime && endTime) {
      const requestedStart = new Date(startTime);
      const requestedEnd = new Date(endTime);
      
      const conflict = bookings.find(booking => {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
        
        return (
          (requestedStart < bookingEnd && requestedEnd > bookingStart)
        );
      });
      
      return res.json({
        available: !conflict,
        conflictingBooking: conflict || null,
        allBookings: bookings
      });
    }
    
    // Generate time slots for the entire working day (7:00 AM - 4:00 PM)
    const timeSlots = [];
    const workingHourStart = 7; // 7:00 AM
    const workingHourEnd = 16; // 4:00 PM
    const slotDuration = 30; // 30 minutes
    
    // Define target timezone offset (Europe/Berlin = UTC+2)
    const targetTimezoneOffset = 2 * 60; // +2 hours in minutes
    
    for (let hour = workingHourStart; hour < workingHourEnd; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        // Create date in UTC, then adjust for target timezone
        const slotStart = new Date(queryDate);
        slotStart.setUTCHours(hour - 2, minute, 0, 0); // Subtract 2 hours to get UTC time for 7AM Berlin time
        const slotEnd = new Date(slotStart);
        slotEnd.setUTCMinutes(slotEnd.getUTCMinutes() + slotDuration);
        
        // Skip if slot extends beyond working hours (check in Berlin time)
        const berlinHour = slotEnd.getUTCHours() + 2; // Convert UTC to Berlin time
        if (berlinHour >= workingHourEnd) {
          break;
        }
        
        // Skip if slot is in the past
        if (slotStart < new Date()) {
          continue;
        }
        
        // Check if slot conflicts with any booking
        const conflictingBooking = bookings.find(booking => {
          const bookingStart = new Date(booking.startTime);
          const bookingEnd = new Date(booking.endTime);
          
          return (
            (slotStart < bookingEnd && slotEnd > bookingStart)
          );
        });
        
        timeSlots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          available: !conflictingBooking,
          conflictingBooking: conflictingBooking ? {
            purpose: conflictingBooking.purpose,
            organizer: conflictingBooking.user.name,
            startTime: conflictingBooking.startTime,
            endTime: conflictingBooking.endTime
          } : null
        });
      }
    }
    
    res.json({
      boardroom: {
        _id: boardroom._id,
        name: boardroom.name,
        location: boardroom.location,
        capacity: boardroom.capacity
      },
      date: queryDate.toISOString().split('T')[0],
      timeSlots,
      totalBookings: bookings.length
    });
  } catch (error) {
    console.error('Get detailed availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllBookings = async (req, res) => {
  try {
    console.log('getAllBookings called by user:', req.user.userId);
    
    const { page = 1, limit = 1000, status, boardroom, startDate, endDate } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (boardroom) filter.boardroom = boardroom;
    
    // Add date range filtering for calendar optimization
    if (startDate && endDate) {
      filter.$and = [
        { startTime: { $lte: new Date(endDate) } },
        { endTime: { $gte: new Date(startDate) } }
      ];
    } else if (startDate) {
      filter.startTime = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.endTime = { $lte: new Date(endDate) };
    }
    
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
    
    // Update modifiedAt timestamp
    booking.modifiedAt = new Date();
    
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
        Time: ${new Date(booking.startTime).toLocaleString('en-US', { timeZoneName: 'short' })}
        
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

const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { boardroom, startTime, endTime, purpose, attendees, notes } = req.body;
    
    // Find existing booking
    const existingBooking = await Booking.findOne({ 
      _id: id, 
      user: req.user.userId,
      status: 'confirmed' 
    });
    
    if (!existingBooking) {
      return res.status(404).json({ 
        message: 'Booking not found or you do not have permission to edit it' 
      });
    }

    // Handle attendees format (same logic as createBooking)
    let userAttendees = [];
    let externalAttendees = [];
    
    if (attendees) {
      if (Array.isArray(attendees)) {
        userAttendees = attendees;
      } else if (attendees.users || attendees.external) {
        userAttendees = attendees.users || [];
        externalAttendees = (attendees.external || []).map(email => ({ email }));
      }
    }
    
    // Add the creator to user attendees if not already included
    const allUserAttendees = userAttendees.includes(req.user.userId) 
      ? userAttendees 
      : [...userAttendees, req.user.userId];

    // Validate boardroom exists and is active (if boardroom is being changed)
    if (boardroom && boardroom !== existingBooking.boardroom.toString()) {
      const boardroomExists = await Boardroom.findOne({ _id: boardroom, isActive: true });
      if (!boardroomExists) {
        return res.status(400).json({ message: 'Boardroom not found or inactive' });
      }
    }
    
    // Validate time is in future (if start time is being changed)
    if (startTime && new Date(startTime) <= new Date()) {
      return res.status(400).json({ message: 'Start time must be in the future' });
    }
    
    // Check for boardroom conflicts (exclude current booking)
    const finalBoardroom = boardroom || existingBooking.boardroom;
    const finalStartTime = startTime || existingBooking.startTime;
    const finalEndTime = endTime || existingBooking.endTime;
    
    const conflict = await Booking.findOne({
      _id: { $ne: id }, // Exclude current booking
      boardroom: finalBoardroom,
      status: 'confirmed',
      $or: [
        { 
          startTime: { $lt: new Date(finalEndTime) }, 
          endTime: { $gt: new Date(finalStartTime) }
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

    // Store old values for comparison
    const oldBoardroom = existingBooking.boardroom;
    const oldStartTime = existingBooking.startTime;
    const oldEndTime = existingBooking.endTime;
    const oldAttendees = existingBooking.attendees;
    const oldExternalAttendees = existingBooking.externalAttendees || [];

    // Update booking with proper timezone handling
    if (boardroom) existingBooking.boardroom = boardroom;
    if (startTime) {
      existingBooking.startTime = new Date(startTime);
      console.log("Updated start time:", startTime, "->", existingBooking.startTime.toISOString());
    }
    if (endTime) {
      existingBooking.endTime = new Date(endTime);
      console.log("Updated end time:", endTime, "->", existingBooking.endTime.toISOString());
    }
    if (purpose) existingBooking.purpose = purpose;
    if (attendees !== undefined) {
      existingBooking.attendees = allUserAttendees;
      existingBooking.externalAttendees = externalAttendees;
    }
    if (notes !== undefined) existingBooking.notes = notes;

    // Update modifiedAt timestamp
    existingBooking.modifiedAt = new Date();

    await existingBooking.save();

    // Get populated booking for response and emails
    const updatedBooking = await Booking.findById(id)
      .populate('user', 'name email')
      .populate('boardroom', 'name location capacity amenities')
      .populate('attendees', 'name email');

    // Determine what changed for notifications
    const boardroomChanged = boardroom && boardroom !== oldBoardroom.toString();
    const timeChanged = (startTime && startTime !== oldStartTime.toISOString()) || 
                       (endTime && endTime !== oldEndTime.toISOString());
    const attendeesChanged = attendees !== undefined;

    // Send notifications if significant changes occurred
    if (boardroomChanged || timeChanged || attendeesChanged) {
      try {
        // Get organizer details
        const organizer = await User.findById(req.user.userId);
        const attendeeUsers = await User.find({ _id: { $in: allUserAttendees } });

        // Create notifications for user attendees (except creator)
        const notificationPromises = allUserAttendees
          .filter(id => id.toString() !== req.user.userId)
          .map(id => Notification.create({
            user: id,
            message: `Meeting "${updatedBooking.purpose}" has been updated`,
            booking: updatedBooking._id
          }));
        
        await Promise.all(notificationPromises);

        // Send update emails to registered user attendees
        const userEmailPromises = attendeeUsers
          .filter(user => user._id.toString() !== req.user.userId)
          .map(user => emailService.sendBookingNotification(updatedBooking, user, organizer, 'updated'));
        
        // Send update emails to external attendees
        const externalEmailPromises = externalAttendees.map(async (external) => {
          const emailData = {
            to: external.email,
            subject: `Meeting Update: ${updatedBooking.purpose}`,
            html: `
              <h2>Meeting Updated</h2>
              <p><strong>Meeting:</strong> ${updatedBooking.purpose}</p>
              <p><strong>Organizer:</strong> ${organizer.name} (${organizer.email})</p>
              <p><strong>Room:</strong> ${updatedBooking.boardroom.name} - ${updatedBooking.boardroom.location}</p>
              <p><strong>Time:</strong> ${new Date(updatedBooking.startTime).toLocaleString('en-US', { timeZoneName: 'short' })} - ${new Date(updatedBooking.endTime).toLocaleString('en-US', { timeZoneName: 'short' })}</p>
              ${updatedBooking.notes ? `<p><strong>Notes:</strong> ${updatedBooking.notes}</p>` : ''}
              <p>The meeting details have been updated. Please check your calendar.</p>
            `
          };
          return emailService.sendEmail(emailData.to, emailData.subject, emailData.html);
        });
        
        const allEmailPromises = [...userEmailPromises, ...externalEmailPromises];
        await Promise.all(allEmailPromises);
        
        console.log('📧 Update notifications sent');
      } catch (emailError) {
        console.error('Update email sending failed:', emailError);
        // Don't fail the update if email fails
      }
      
      // Emit Socket.IO event for real-time updates
      const io = req.app.get('io');
      if (io) {
        io.emit('booking-updated', {
          booking: updatedBooking,
          boardroomId: finalBoardroom,
          changes: {
            boardroomChanged,
            timeChanged,
            attendeesChanged
          }
        });
        console.log('🔌 Socket.IO: booking-updated event emitted');
      }
    }

    res.json(updatedBooking);
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Smart delete function that handles both admin and user permissions
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    
    // Find booking with population for notifications
    const booking = await Booking.findById(id)
      .populate('boardroom', 'name location')
      .populate('attendees', 'name email')
      .populate('user', 'name email');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check permissions: admin can delete any booking, users can only delete their own
    if (!isAdmin && booking.user._id.toString() !== req.user.userId) {
      return res.status(403).json({ 
        message: 'You can only delete your own bookings' 
      });
    }
    
    // Create notifications for all attendees about deletion
    const notificationPromises = [];
    
    if (booking.attendees && Array.isArray(booking.attendees)) {
      booking.attendees.forEach(attendee => {
        notificationPromises.push(
          Notification.create({
            user: attendee._id,
            message: `Meeting "${booking.purpose}" in ${booking.boardroom.name} has been ${isAdmin ? 'deleted by admin' : 'deleted by organizer'}`,
            booking: booking._id
          })
        );
      });
    }
    
    // Also notify the organizer if they're not in attendees and it's admin action
    const attendeeIds = booking.attendees ? booking.attendees.map(att => att._id.toString()) : [];
    if (isAdmin && !attendeeIds.includes(booking.user._id.toString())) {
      notificationPromises.push(
        Notification.create({
          user: booking.user._id,
          message: `Your meeting "${booking.purpose}" in ${booking.boardroom.name} has been deleted by admin`,
          booking: booking._id
        })
      );
    }
    
    await Promise.all(notificationPromises);
    
    // Delete the booking
    await Booking.findByIdAndDelete(id);
    
    // Emit Socket.IO event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('booking-deleted', {
        booking,
        boardroomId: booking.boardroom._id,
        deletedBy: isAdmin ? 'admin' : 'user'
      });
      console.log('🔌 Socket.IO: booking-deleted event emitted');
    }
    
    const message = isAdmin 
      ? 'Booking deleted successfully by admin' 
      : 'Booking deleted successfully';
      
    res.json({ message, booking });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
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
  optOutOfBooking
};