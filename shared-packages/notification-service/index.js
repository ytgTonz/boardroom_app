// @boardroom/notification-service
// Reusable notification system for user notifications and alerts
const Notification = require('./models/Notification');

class NotificationService {
  constructor(config = {}) {
    this.config = {
      maxNotificationsPerUser: config.maxNotificationsPerUser || 100,
      autoCleanupDays: config.autoCleanupDays || 30,
      ...config
    };
  }

  // Create a new notification
  async createNotification(userId, title, message, type = 'info', data = null) {
    try {
      const notification = new Notification({
        user: userId,
        title,
        message,
        type,
        data
      });

      await notification.save();

      // Auto-cleanup old notifications if over limit
      await this.cleanupOldNotifications(userId);

      return {
        success: true,
        notification: {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          read: notification.read,
          data: notification.data,
          createdAt: notification.createdAt
        }
      };
    } catch (error) {
      console.error('Create notification error:', error);
      return {
        success: false,
        error: 'Failed to create notification'
      };
    }
  }

  // Create multiple notifications for multiple users
  async createBulkNotifications(userIds, title, message, type = 'info', data = null) {
    try {
      const notifications = userIds.map(userId => ({
        user: userId,
        title,
        message,
        type,
        data
      }));

      const createdNotifications = await Notification.insertMany(notifications);

      // Cleanup for each user
      for (const userId of userIds) {
        await this.cleanupOldNotifications(userId);
      }

      return {
        success: true,
        count: createdNotifications.length,
        notifications: createdNotifications.map(n => ({
          id: n._id,
          user: n.user,
          title: n.title,
          message: n.message,
          type: n.type,
          read: n.read,
          data: n.data,
          createdAt: n.createdAt
        }))
      };
    } catch (error) {
      console.error('Create bulk notifications error:', error);
      return {
        success: false,
        error: 'Failed to create bulk notifications'
      };
    }
  }

  // Get all notifications for a user
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        limit = 50,
        skip = 0,
        unreadOnly = false,
        type = null
      } = options;

      let query = { user: userId };
      
      if (unreadOnly) {
        query.read = false;
      }
      
      if (type) {
        query.type = type;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return {
        success: true,
        notifications: notifications.map(n => ({
          id: n._id,
          title: n.title,
          message: n.message,
          type: n.type,
          read: n.read,
          data: n.data,
          createdAt: n.createdAt,
          readAt: n.readAt
        }))
      };
    } catch (error) {
      console.error('Get user notifications error:', error);
      return {
        success: false,
        error: 'Failed to fetch notifications'
      };
    }
  }

  // Get notification count for user
  async getNotificationCount(userId, unreadOnly = false) {
    try {
      let query = { user: userId };
      if (unreadOnly) {
        query.read = false;
      }

      const count = await Notification.countDocuments(query);
      
      return {
        success: true,
        count
      };
    } catch (error) {
      console.error('Get notification count error:', error);
      return {
        success: false,
        error: 'Failed to get notification count'
      };
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { 
          read: true,
          readAt: new Date()
        },
        { new: true }
      );

      if (!notification) {
        return {
          success: false,
          error: 'Notification not found'
        };
      }

      return {
        success: true,
        notification: {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          read: notification.read,
          data: notification.data,
          createdAt: notification.createdAt,
          readAt: notification.readAt
        }
      };
    } catch (error) {
      console.error('Mark notification read error:', error);
      return {
        success: false,
        error: 'Failed to mark notification as read'
      };
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { user: userId, read: false },
        { 
          read: true,
          readAt: new Date()
        }
      );

      return {
        success: true,
        modifiedCount: result.modifiedCount
      };
    } catch (error) {
      console.error('Mark all notifications read error:', error);
      return {
        success: false,
        error: 'Failed to mark all notifications as read'
      };
    }
  }

  // Delete a notification
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        user: userId
      });

      if (!notification) {
        return {
          success: false,
          error: 'Notification not found'
        };
      }

      return {
        success: true,
        message: 'Notification deleted successfully'
      };
    } catch (error) {
      console.error('Delete notification error:', error);
      return {
        success: false,
        error: 'Failed to delete notification'
      };
    }
  }

  // Delete all notifications for a user
  async deleteAllNotifications(userId) {
    try {
      const result = await Notification.deleteMany({ user: userId });

      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      console.error('Delete all notifications error:', error);
      return {
        success: false,
        error: 'Failed to delete all notifications'
      };
    }
  }

  // Cleanup old notifications for a user
  async cleanupOldNotifications(userId) {
    try {
      const notificationCount = await Notification.countDocuments({ user: userId });
      
      if (notificationCount > this.config.maxNotificationsPerUser) {
        // Delete oldest notifications beyond the limit
        const oldestNotifications = await Notification.find({ user: userId })
          .sort({ createdAt: 1 })
          .limit(notificationCount - this.config.maxNotificationsPerUser);

        const idsToDelete = oldestNotifications.map(n => n._id);
        await Notification.deleteMany({ _id: { $in: idsToDelete } });
      }

      // Delete notifications older than autoCleanupDays
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.autoCleanupDays);
      
      await Notification.deleteMany({
        user: userId,
        createdAt: { $lt: cutoffDate }
      });

      return { success: true };
    } catch (error) {
      console.error('Cleanup notifications error:', error);
      return { success: false };
    }
  }

  // Business-specific notification methods
  async createBookingNotification(userId, title, message, bookingData) {
    return await this.createNotification(
      userId,
      title,
      message,
      'booking',
      bookingData
    );
  }

  async createReminderNotification(userId, title, message, reminderData) {
    return await this.createNotification(
      userId,
      title,
      message,
      'reminder',
      reminderData
    );
  }

  async createSystemNotification(userId, title, message, systemData = null) {
    return await this.createNotification(
      userId,
      title,
      message,
      'system',
      systemData
    );
  }

  // Broadcast system notification to all users
  async broadcastSystemNotification(title, message, data = null) {
    try {
      // This would require access to User model or user IDs
      // Implementation depends on how you want to get all user IDs
      console.log('Broadcast system notification:', { title, message, data });
      
      return {
        success: true,
        message: 'System notification would be broadcast to all users'
      };
    } catch (error) {
      console.error('Broadcast notification error:', error);
      return {
        success: false,
        error: 'Failed to broadcast notification'
      };
    }
  }

  // Get notification statistics
  async getNotificationStats(userId) {
    try {
      const total = await Notification.countDocuments({ user: userId });
      const unread = await Notification.countDocuments({ user: userId, read: false });
      const byType = await Notification.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);

      const typeStats = {};
      byType.forEach(item => {
        typeStats[item._id] = item.count;
      });

      return {
        success: true,
        stats: {
          total,
          unread,
          read: total - unread,
          byType: typeStats
        }
      };
    } catch (error) {
      console.error('Get notification stats error:', error);
      return {
        success: false,
        error: 'Failed to get notification statistics'
      };
    }
  }
}

module.exports = NotificationService;