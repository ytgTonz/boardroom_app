// backend/src/services/reminderScheduler.js
const cron = require('node-cron');
const Booking = require('../models/Booking');
const emailService = require('./emailService');

class ReminderScheduler {
  constructor() {
    this.scheduledReminders = new Map();
    this.startCronJobs();
  }

  startCronJobs() {
    // Check for upcoming meetings every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      this.checkUpcomingMeetings();
    });
    
    console.log('📅 Meeting reminder scheduler started');
  }

  async checkUpcomingMeetings() {
    try {
      const now = new Date();
      const reminderTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
      const checkUntil = new Date(now.getTime() + 20 * 60 * 1000); // 20 minutes from now

      // Find bookings that start between 15-20 minutes from now
      const upcomingBookings = await Booking.find({
        status: 'confirmed',
        startTime: {
          $gte: reminderTime,
          $lte: checkUntil
        }
      })
      .populate('attendees', 'name email')
      .populate('boardroom', 'name location capacity amenities')
      .populate('user', 'name email');

      for (const booking of upcomingBookings) {
        const reminderKey = `${booking._id}_${booking.startTime.getTime()}`;
        
        // Check if we've already sent a reminder for this booking
        if (!this.scheduledReminders.has(reminderKey)) {
          await this.sendMeetingReminder(booking);
          this.scheduledReminders.set(reminderKey, true);
        }
      }

      // Clean up old reminder keys (older than 1 hour)
      const oneHourAgo = now.getTime() - 60 * 60 * 1000;
      for (const [key, value] of this.scheduledReminders.entries()) {
        const timestamp = parseInt(key.split('_')[1]);
        if (timestamp < oneHourAgo) {
          this.scheduledReminders.delete(key);
        }
      }

    } catch (error) {
      console.error('Error checking upcoming meetings:', error);
    }
  }

  async sendMeetingReminder(booking) {
    try {
      console.log(`📧 Sending reminder for meeting: ${booking.purpose}`);
      
      await emailService.sendBookingReminder(booking, booking.attendees);
      
      console.log(`✅ Reminder sent for meeting: ${booking.purpose}`);
    } catch (error) {
      console.error(`❌ Failed to send reminder for meeting ${booking.purpose}:`, error);
    }
  }

  // Method to manually schedule a specific reminder
  scheduleReminder(booking, reminderMinutes = 15) {
    const reminderTime = new Date(booking.startTime.getTime() - reminderMinutes * 60 * 1000);
    const now = new Date();

    if (reminderTime > now) {
      const timeout = reminderTime.getTime() - now.getTime();
      
      setTimeout(async () => {
        try {
          // Re-fetch booking to ensure it's still valid
          const currentBooking = await Booking.findById(booking._id)
            .populate('attendees', 'name email')
            .populate('boardroom', 'name location capacity amenities');
            
          if (currentBooking && currentBooking.status === 'confirmed') {
            await this.sendMeetingReminder(currentBooking);
          }
        } catch (error) {
          console.error('Error in scheduled reminder:', error);
        }
      }, timeout);

      console.log(`⏰ Reminder scheduled for ${booking.purpose} at ${reminderTime}`);
    }
  }
}

// Create singleton instance
const reminderScheduler = new ReminderScheduler();

module.exports = reminderScheduler;