// Test script for @boardroom/email-service
const EmailService = require('./index');

async function runTests() {
  console.log('🧪 Testing Email Service...\n');

  // Initialize service
  const emailService = new EmailService({
    // Will use test account if no environment variables
  });

  // Test 1: Simple email
  console.log('📧 Test 1: Simple Email');
  const result1 = await emailService.sendEmail(
    'test@example.com',
    'Test Email',
    'This is a test email from the extracted service!'
  );
  console.log('Result:', result1);
  console.log('');

  // Test 2: HTML email
  console.log('📧 Test 2: HTML Email');
  const result2 = await emailService.sendEmail(
    'test@example.com',
    'HTML Test Email',
    '<h1>Hello!</h1><p>This is an <strong>HTML</strong> test email.</p>',
    true
  );
  console.log('Result:', result2);
  console.log('');

  // Test 3: Template email (will fail gracefully if template doesn't exist)
  console.log('📧 Test 3: Template Email');
  try {
    const result3 = await emailService.sendTemplateEmail(
      'test@example.com',
      'Template Test',
      'booking-created',
      {
        booking: {
          purpose: 'Test Meeting',
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          boardroom: { name: 'Conference Room A', location: 'Floor 2' },
          notes: 'This is a test booking'
        },
        user: { name: 'John Doe', email: 'john@example.com' },
        organizer: { name: 'Jane Smith', email: 'jane@example.com' }
      }
    );
    console.log('Result:', result3);
  } catch (error) {
    console.log('Template test failed (expected if templates not copied):', error.message);
  }
  console.log('');

  // Test 4: Business method
  console.log('📧 Test 4: Business Method');
  try {
    const mockBooking = {
      purpose: 'Team Meeting',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      boardroom: { name: 'Conference Room B', location: 'Floor 3' },
      notes: 'Monthly team sync',
      user: { name: 'Organizer', email: 'organizer@example.com' }
    };
    
    const mockUser = { name: 'Attendee', email: 'attendee@example.com' };
    
    const result4 = await emailService.sendBookingNotification(
      mockBooking,
      mockUser,
      mockBooking.user,
      'created'
    );
    console.log('Result:', result4);
  } catch (error) {
    console.log('Business method test failed:', error.message);
  }

  console.log('\n✅ Email Service tests completed!');
  console.log('📧 Check console for preview URLs if using test email service');
}

// Run tests
runTests().catch(console.error);