const express = require('express');
const {
  getUserNotifications,
  markNotificationRead,
  deleteNotification,
  deleteAllNotifications
} = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all notifications for the user
router.get('/', authenticateToken, getUserNotifications);
// Mark a notification as read
router.patch('/:id/read', authenticateToken, markNotificationRead);
// Delete a notification
router.delete('/:id', authenticateToken, deleteNotification);
// Delete all notifications
router.delete('/', authenticateToken, deleteAllNotifications);

module.exports = router; 