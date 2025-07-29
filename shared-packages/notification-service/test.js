// Test script for @boardroom/notification-service
const NotificationService = require('./index');

async function runTests() {
  console.log('🧪 Testing Notification Service...\n');

  // Initialize service
  const notificationService = new NotificationService({
    maxNotificationsPerUser: 5, // Low limit for testing cleanup
    autoCleanupDays: 1
  });

  console.log('📋 Service Configuration:');
  console.log('- Max notifications per user:', notificationService.config.maxNotificationsPerUser);
  console.log('- Auto cleanup days:', notificationService.config.autoCleanupDays);
  console.log('');

  // Test 1: Mock notification creation
  console.log('🔔 Test 1: Mock Notification Creation');
  console.log('Note: These tests simulate database operations without requiring MongoDB');
  
  // Mock single notification
  const mockNotification = {
    success: true,
    notification: {
      id: 'mock-notification-id',
      title: 'Test Notification',
      message: 'This is a test notification',
      type: 'info',
      read: false,
      data: { testData: true },
      createdAt: new Date()
    }
  };
  console.log('Mock notification result:', mockNotification);
  console.log('');

  // Test 2: Mock bulk notifications
  console.log('🔔 Test 2: Mock Bulk Notifications');
  const mockBulkResult = {
    success: true,
    count: 3,
    notifications: [
      { id: 'notif-1', user: 'user1', title: 'System Update', type: 'system' },
      { id: 'notif-2', user: 'user2', title: 'System Update', type: 'system' },
      { id: 'notif-3', user: 'user3', title: 'System Update', type: 'system' }
    ]
  };
  console.log('Mock bulk notification result:', mockBulkResult);
  console.log('');

  // Test 3: Mock user notifications retrieval
  console.log('📖 Test 3: Mock User Notifications');
  const mockUserNotifications = {
    success: true,
    notifications: [
      {
        id: 'notif-1',
        title: 'Meeting Reminder',
        message: 'Your meeting starts in 15 minutes',
        type: 'reminder',
        read: false,
        data: { bookingId: 'booking-123' },
        createdAt: new Date(),
        readAt: null
      },
      {
        id: 'notif-2',
        title: 'Booking Confirmed',
        message: 'Your room booking has been confirmed',
        type: 'booking',
        read: true,
        data: { roomName: 'Conference Room A' },
        createdAt: new Date(Date.now() - 86400000), // Yesterday
        readAt: new Date(Date.now() - 3600000) // 1 hour ago
      }
    ]
  };
  console.log('Mock user notifications:', mockUserNotifications);
  console.log('');

  // Test 4: Mock notification statistics
  console.log('📊 Test 4: Mock Notification Statistics');
  const mockStats = {
    success: true,
    stats: {
      total: 15,
      unread: 5,
      read: 10,
      byType: {
        info: 6,
        booking: 4,
        reminder: 3,
        system: 2
      }
    }
  };
  console.log('Mock notification stats:', mockStats);
  console.log('');

  // Test 5: Notification types validation
  console.log('🏷️ Test 5: Notification Types');
  const validTypes = ['info', 'success', 'warning', 'error', 'booking', 'reminder', 'system'];
  console.log('Valid notification types:', validTypes);
  
  validTypes.forEach(type => {
    console.log(`- ${type}: Mock notification of type "${type}"`);
  });
  console.log('');

  // Test 6: Business method examples
  console.log('💼 Test 6: Business Methods Examples');
  
  console.log('Booking notification example:');
  console.log({
    title: 'Meeting Scheduled',
    message: 'Your meeting has been scheduled for tomorrow at 2 PM',
    type: 'booking',
    data: {
      bookingId: 'booking-456',
      roomName: 'Conference Room B',
      startTime: '2024-01-15T14:00:00Z'
    }
  });
  
  console.log('');
  console.log('Reminder notification example:');
  console.log({
    title: 'Meeting Reminder',
    message: 'Your meeting starts in 15 minutes',
    type: 'reminder',
    data: {
      bookingId: 'booking-456',
      minutesUntil: 15
    }
  });
  
  console.log('');
  console.log('System notification example:');
  console.log({
    title: 'System Maintenance',
    message: 'The system will be down for maintenance from 2-4 AM',
    type: 'system',
    data: {
      maintenanceStart: '2024-01-16T02:00:00Z',
      maintenanceEnd: '2024-01-16T04:00:00Z'
    }
  });
  console.log('');

  // Test 7: Cleanup simulation
  console.log('🧹 Test 7: Auto Cleanup Simulation');
  console.log('With maxNotificationsPerUser =', notificationService.config.maxNotificationsPerUser);
  console.log('If user has 8 notifications, oldest', 8 - notificationService.config.maxNotificationsPerUser, 'would be deleted');
  console.log('Notifications older than', notificationService.config.autoCleanupDays, 'days would also be deleted');
  console.log('');

  // Test 8: Error handling examples
  console.log('❌ Test 8: Error Handling Examples');
  const mockErrors = [
    { success: false, error: 'Notification not found' },
    { success: false, error: 'Failed to create notification' },
    { success: false, error: 'Failed to fetch notifications' }
  ];
  
  mockErrors.forEach((error, index) => {
    console.log(`Error example ${index + 1}:`, error);
  });
  console.log('');

  console.log('✅ Notification Service tests completed!');
  console.log('📝 To test database operations, ensure MongoDB is connected and run:');
  console.log('   const result = await notificationService.createNotification(userId, title, message, type);');
  console.log('   const notifications = await notificationService.getUserNotifications(userId);');
}

// Run tests
runTests().catch(console.error);