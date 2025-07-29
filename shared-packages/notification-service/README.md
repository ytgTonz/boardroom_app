# @boardroom/notification-service

Reusable notification system for user notifications and alerts in Node.js applications.

## Features

- 🔔 **User Notifications** - Create, read, and manage user notifications
- 📊 **Multiple Types** - Support for info, success, warning, error, booking, reminder, and system notifications
- 🗂️ **Bulk Operations** - Create notifications for multiple users at once
- 🧹 **Auto Cleanup** - Automatic cleanup of old notifications
- 📈 **Statistics** - Get notification counts and statistics
- 🎯 **Filtering** - Filter by read status, type, and other criteria

## Installation

```bash
npm install @boardroom/notification-service
```

## Quick Start

```javascript
const NotificationService = require('@boardroom/notification-service');

// Initialize service
const notificationService = new NotificationService({
  maxNotificationsPerUser: 100,
  autoCleanupDays: 30
});

// Create a notification
const result = await notificationService.createNotification(
  'user-id',
  'New Message',
  'You have a new booking request',
  'info'
);

// Get user notifications
const notifications = await notificationService.getUserNotifications('user-id');
```

## Configuration

```javascript
const notificationService = new NotificationService({
  maxNotificationsPerUser: 100,  // Max notifications per user
  autoCleanupDays: 30           // Auto-delete notifications older than X days
});
```

## API Methods

### Create Notification

```javascript
const result = await notificationService.createNotification(
  userId,
  'Notification Title',
  'Notification message content',
  'info', // type: 'info', 'success', 'warning', 'error', 'booking', 'reminder', 'system'
  { key: 'value' } // optional data object
);
// Returns: { success: boolean, notification?: object, error?: string }
```

### Bulk Notifications

```javascript
const result = await notificationService.createBulkNotifications(
  ['user1', 'user2', 'user3'],
  'System Update',
  'The system will be down for maintenance',
  'system'
);
// Returns: { success: boolean, count?: number, notifications?: array, error?: string }
```

### Get User Notifications

```javascript
const result = await notificationService.getUserNotifications(userId, {
  limit: 20,           // Max notifications to return
  skip: 0,             // Skip first N notifications (pagination)
  unreadOnly: false,   // Only unread notifications
  type: 'booking'      // Filter by type
});
// Returns: { success: boolean, notifications?: array, error?: string }
```

### Notification Management

```javascript
// Get notification count
const count = await notificationService.getNotificationCount(userId, true); // unreadOnly

// Mark as read
const result = await notificationService.markAsRead(notificationId, userId);

// Mark all as read
const result = await notificationService.markAllAsRead(userId);

// Delete notification
const result = await notificationService.deleteNotification(notificationId, userId);

// Delete all notifications
const result = await notificationService.deleteAllNotifications(userId);
```

### Statistics

```javascript
const stats = await notificationService.getNotificationStats(userId);
// Returns:
// {
//   success: true,
//   stats: {
//     total: 45,
//     unread: 12,
//     read: 33,
//     byType: {
//       info: 20,
//       booking: 15,
//       reminder: 10
//     }
//   }
// }
```

## Business-Specific Methods

### Booking Notifications

```javascript
// Create booking notification
await notificationService.createBookingNotification(
  userId,
  'Meeting Scheduled',
  'Your meeting has been scheduled for tomorrow',
  { bookingId: 'booking-123', roomName: 'Conference Room A' }
);

// Create reminder notification
await notificationService.createReminderNotification(
  userId,
  'Meeting Reminder',
  'Your meeting starts in 15 minutes',
  { bookingId: 'booking-123', minutesUntil: 15 }
);

// Create system notification
await notificationService.createSystemNotification(
  userId,
  'System Maintenance',
  'The system will be down from 2-4 AM for maintenance'
);
```

## Express.js Integration

```javascript
const express = require('express');
const NotificationService = require('@boardroom/notification-service');

const router = express.Router();
const notificationService = new NotificationService();

// Get user notifications
router.get('/notifications', async (req, res) => {
  const { limit = 20, skip = 0, unreadOnly, type } = req.query;
  
  const result = await notificationService.getUserNotifications(
    req.user.userId,
    { limit: parseInt(limit), skip: parseInt(skip), unreadOnly: unreadOnly === 'true', type }
  );
  
  if (result.success) {
    res.json(result.notifications);
  } else {
    res.status(500).json({ message: result.error });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  const result = await notificationService.markAsRead(req.params.id, req.user.userId);
  
  if (result.success) {
    res.json(result.notification);
  } else {
    res.status(404).json({ message: result.error });
  }
});

// Delete notification
router.delete('/notifications/:id', async (req, res) => {
  const result = await notificationService.deleteNotification(req.params.id, req.user.userId);
  
  if (result.success) {
    res.json({ message: result.message });
  } else {
    res.status(404).json({ message: result.error });
  }
});

// Get notification stats
router.get('/notifications/stats', async (req, res) => {
  const result = await notificationService.getNotificationStats(req.user.userId);
  
  if (result.success) {
    res.json(result.stats);
  } else {
    res.status(500).json({ message: result.error });
  }
});

module.exports = router;
```

## Notification Types

- **info** - General information notifications
- **success** - Success messages and confirmations
- **warning** - Warning messages
- **error** - Error notifications
- **booking** - Booking-related notifications
- **reminder** - Reminder notifications
- **system** - System-wide notifications

## Database Requirements

This service requires MongoDB with Mongoose. The notification schema includes:

```javascript
{
  user: ObjectId (required, ref: 'User'),
  title: String (required),
  message: String (required),
  type: String (enum, default: 'info'),
  read: Boolean (default: false),
  data: Mixed (optional custom data),
  createdAt: Date (default: now),
  readAt: Date (default: null)
}
```

## Auto Cleanup

The service automatically cleans up old notifications:

- Keeps only the latest N notifications per user (configurable)
- Deletes notifications older than X days (configurable)
- Cleanup runs automatically when creating new notifications

## Error Handling

All methods return a consistent response format:

```javascript
{
  success: boolean,
  notification?: object,    // Single notification data
  notifications?: array,    // Multiple notifications
  count?: number,          // Count operations
  stats?: object,          // Statistics data
  error?: string,          // Error message (when failed)
  message?: string         // Success message
}
```

## Testing

```bash
npm test
```

## Integration Examples

### With Email Service

```javascript
const NotificationService = require('@boardroom/notification-service');
const EmailService = require('@boardroom/email-service');

const notificationService = new NotificationService();
const emailService = new EmailService();

// Create notification and send email
async function notifyUser(userId, userEmail, title, message, type = 'info') {
  // Create in-app notification
  await notificationService.createNotification(userId, title, message, type);
  
  // Send email notification
  await emailService.sendEmail(userEmail, title, message);
}
```

### With Auth Service

```javascript
// Create notification when user registers
const authResult = await authService.register(name, email, password);
if (authResult.success) {
  await notificationService.createNotification(
    authResult.user.id,
    'Welcome!',
    'Welcome to our platform. Get started by exploring the features.',
    'success'
  );
}
```