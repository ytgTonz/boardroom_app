const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

// Update current user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, department, position, location } = req.body;
    
    // Validation
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(), 
      _id: { $ne: req.user.userId } 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already taken by another user' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    user.name = name.trim();
    user.email = email.toLowerCase().trim();
    user.phone = phone?.trim() || user.phone;
    user.department = department?.trim() || user.department;
    user.position = position?.trim() || user.position;
    user.location = location?.trim() || user.location;

    await user.save();

    // Return user without password
    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Failed to update user profile' });
  }
});

// Get user booking statistics
router.get('/profile/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();

    // Get total bookings
    const totalBookings = await Booking.countDocuments({ 
      user: userId 
    });

    // Get upcoming bookings
    const upcomingBookings = await Booking.countDocuments({ 
      user: userId,
      date: { $gte: now },
      status: { $nin: ['cancelled'] }
    });

    // Get completed bookings
    const completedBookings = await Booking.countDocuments({ 
      user: userId,
      date: { $lt: now },
      status: 'confirmed'
    });

    // Get last booking date
    const lastBooking = await Booking.findOne(
      { user: userId },
      { date: 1 },
      { sort: { createdAt: -1 } }
    );

    res.json({
      totalBookings,
      upcomingBookings,
      completedBookings,
      lastBookingDate: lastBooking?.date || null
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Failed to fetch user statistics' });
  }
});

// Get all users (authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}, '-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get user statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const regularUsers = await User.countDocuments({ role: 'user' });
    
    const recentUsers = await User.find({}, 'name email createdAt role')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalUsers,
      adminUsers,
      regularUsers,
      recentUsers
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Failed to fetch user statistics' });
  }
});

// Update user role (admin only)
router.patch('/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({ message: 'User role updated successfully', user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Reset user password (admin only)
router.patch('/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

module.exports = router;