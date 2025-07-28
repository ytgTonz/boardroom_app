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
    
    // Add the creator to user attendees if not already included
    const allUserAttendees = userAttendees.includes(req.user.userId) 
      ? userAttendees 
      : [...userAttendees, req.user.userId];
    
    const booking = new Booking({
      user: req.user.userId,
      boardroom,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      purpose,
      attendees: allUserAttendees,
      externalAttendees: externalAttendees,
      notes: notes || ''
    });
    console.log("start time saved", startTime)
    
    await booking.save();
    
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
            <p><strong>Time:</strong> ${new Date(startTime).toLocaleString()} - ${new Date(endTime).toLocaleString()}</p>
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

    // Update booking
    if (boardroom) existingBooking.boardroom = boardroom;
    if (startTime) existingBooking.startTime = new Date(startTime);
    if (endTime) existingBooking.endTime = new Date(endTime);
    if (purpose) existingBooking.purpose = purpose;
    if (attendees !== undefined) {
      existingBooking.attendees = allUserAttendees;
      existingBooking.externalAttendees = externalAttendees;
    }
    if (notes !== undefined) existingBooking.notes = notes;

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
              <p><strong>Time:</strong> ${new Date(updatedBooking.startTime).toLocaleString()} - ${new Date(updatedBooking.endTime).toLocaleString()}</p>
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
    }

    res.json(updatedBooking);
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserBookings,
  createBooking,
  updateBooking,
  cancelBooking,
  getBoardroomAvailability,
  getAllBookings,
  optOutOfBooking
};