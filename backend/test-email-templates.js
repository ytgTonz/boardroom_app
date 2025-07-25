// backend/test-email-templates.js
const emailService = require('./src/services/emailService');

// Mock data for testing
const mockBooking = {
  purpose: 'Weekly Team Meeting',
  startTime: new Date('2024-01-15T10:00:00Z'),
  endTime: new Date('2024-01-15T11:00:00Z'),
  notes: 'Please bring your project updates',
  boardroom: {
    name: 'Conference Room A',
    location: 'Building 1, Floor 2',
    capacity: 12,
    amenities: ['Projector', 'Whiteboard', 'Video Conference', 'Coffee Machine']
  }
};

const mockUser = {
  name: 'John Doe',
  email: 'john.doe@example.com'
};

const mockOrganizer = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com'
};

async function testEmailTemplates() {
  console.log('🧪 Testing email template rendering...');
  
  try {
    // Test booking created template
    console.log('\n1. Testing booking-created template...');
    const createdResult = await emailService.sendBookingNotification(
      mockBooking, 
      mockUser, 
      mockOrganizer, 
      'created'
    );
    console.log('✅ Booking created email result:', createdResult);

    // Test booking cancelled template
    console.log('\n2. Testing booking-cancelled template...');
    const cancelledResult = await emailService.sendBookingNotification(
      mockBooking, 
      mockUser, 
      mockOrganizer, 
      'cancelled'
    );
    console.log('✅ Booking cancelled email result:', cancelledResult);

    // Test meeting reminder template
    console.log('\n3. Testing booking-reminder template...');
    const reminderResult = await emailService.sendMeetingReminder(
      mockBooking, 
      mockUser
    );
    console.log('✅ Meeting reminder email result:', reminderResult);

    console.log('\n🎉 All email template tests completed!');
    
  } catch (error) {
    console.error('❌ Email template test failed:', error);
  }
}

// Wait a moment for the service to initialize
setTimeout(testEmailTemplates, 2000);