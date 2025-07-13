const Booking = require('../models/Booking');
const Boardroom = require('../models/Boardroom');

const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.userId })
      .populate('boardroom', 'name location capacity')
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
    
    // Validate boardroom exists
    const boardroomExists = await Boardroom.findById(boardroom);
    if (!boardroomExists || !boardroomExists.isActive) {
      return res.status(400).json({ message: 'Invalid boardroom' });
    }

    // Check for conflicts
    const conflict = await Booking.findOne({
      boardroom,
      status: 'confirmed',
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
      ]
    });

    if (conflict) {
      return res.status(400).json({ message: 'Time slot already booked' });
    }

    const booking = new Booking({
      user: req.user.userId,
      boardroom,
      startTime,
      endTime,
      purpose,
      attendees,
      notes
    });

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id)
      .populate('boardroom', 'name location capacity');
    
    res.status(201).json(populatedBooking);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { status: 'cancelled' },
      { new: true }
    ).populate('boardroom', 'name location');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
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
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      boardroom: req.params.id,
      status: 'confirmed',
      startTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ startTime: 1 });

    res.json(bookings);
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate('boardroom', 'name location')
      .sort({ startTime: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserBookings,
  createBooking,
  cancelBooking,
  getBoardroomAvailability,
  getAllBookings
}; 