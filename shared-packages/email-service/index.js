// @boardroom/email-service
// Reusable email service with template support
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor(config = {}) {
    this.config = {
      emailUser: config.emailUser || process.env.EMAIL_USER,
      emailPassword: config.emailPassword || process.env.EMAIL_APP_PASSWORD,
      emailFrom: config.emailFrom || process.env.EMAIL_FROM || 'Boardroom Booking <noreply@boardroombooking.com>',
      templatesPath: config.templatesPath || path.join(__dirname, 'templates/email'),
      ...config
    };
    
    this.transporter = null;
    this.templates = new Map();
    this.setupHandlebarsHelpers();
    this.initializeTransporter();
  }

  setupHandlebarsHelpers() {
    // Date formatting helper
    handlebars.registerHelper('formatDate', (date) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    // Time formatting helper
    handlebars.registerHelper('formatTime', (date) => {
      if (!date) return '';
      return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    });

    // Date and time formatting helper
    handlebars.registerHelper('formatDateTime', (date) => {
      if (!date) return '';
      return new Date(date).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    });
  }

  async loadTemplate(templateName) {
    if (this.templates.has(templateName)) {
      return this.templates.get(templateName);
    }

    try {
      const templatePath = path.join(this.config.templatesPath, `${templateName}.hbs`);
      const templateSource = await fs.readFile(templatePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateSource);
      
      this.templates.set(templateName, compiledTemplate);
      return compiledTemplate;
    } catch (error) {
      console.error(`❌ Failed to load template ${templateName}:`, error.message);
      return null;
    }
  }

  async renderTemplate(templateName, context) {
    const template = await this.loadTemplate(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }
    return template(context);
  }

  async initializeTransporter() {
    try {
      console.log('📧 Initializing email service...');
      
      if (this.config.emailUser && this.config.emailPassword) {
        // Use Gmail or configured SMTP
        this.transporter = nodemailer.createTransporter({
          service: this.config.service || 'gmail',
          auth: {
            user: this.config.emailUser,
            pass: this.config.emailPassword
          }
        });
        console.log('📧 Using configured email service');
      } else {
        // Use test account
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransporter({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass
          }
        });
        console.log('📧 Using Ethereal test email service');
      }

      await this.transporter.verify();
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.transporter = null;
    }
  }

  async sendEmail(to, subject, content, isHtml = false) {
    if (!this.transporter) {
      console.log(`📧 EMAIL (not sent): To: ${to}, Subject: ${subject}`);
      return { success: false, error: 'Email service not initialized' };
    }

    try {
      const mailOptions = {
        from: this.config.emailFrom,
        to,
        subject
      };

      if (isHtml) {
        mailOptions.html = content;
        // Generate plain text fallback from HTML
        mailOptions.text = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      } else {
        mailOptions.text = content;
      }

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to}: ${subject}`);
      
      if (this.transporter.options.host === 'smtp.ethereal.email') {
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Template-based email methods
  async sendTemplateEmail(to, subject, templateName, context) {
    try {
      const htmlContent = await this.renderTemplate(templateName, context);
      return await this.sendEmail(to, subject, htmlContent, true);
    } catch (error) {
      console.error('❌ Template email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Specific business methods (can be customized per app)
  async sendBookingNotification(booking, user, organizer, type = 'created') {
    try {
      const subject = type === 'created' 
        ? `Meeting Invitation: ${booking.purpose}`
        : `Meeting Cancelled: ${booking.purpose}`;

      const templateName = type === 'created' ? 'booking-created' : 'booking-cancelled';
      
      const context = {
        booking,
        user,
        organizer: organizer || booking.user
      };

      return await this.sendTemplateEmail(user.email, subject, templateName, context);
      
    } catch (error) {
      console.error('❌ Booking notification failed:', error);
      
      // Fallback to plain text
      const subject = type === 'created' 
        ? `Meeting Invitation: ${booking.purpose}`
        : `Meeting Cancelled: ${booking.purpose}`;
        
      const content = `
Hello ${user.name},

${type === 'created' ? 'You have been invited to a meeting:' : 'The following meeting has been cancelled:'}

Meeting: ${booking.purpose}
Room: ${booking.boardroom.name} (${booking.boardroom.location})
Time: ${new Date(booking.startTime).toLocaleString()} - ${new Date(booking.endTime).toLocaleString()}

${booking.notes ? `Notes: ${booking.notes}` : ''}

Best regards,
Boardroom Booking System
      `;

      return await this.sendEmail(user.email, subject, content);
    }
  }

  async sendMeetingReminder(booking, user) {
    try {
      const subject = `Meeting Reminder: ${booking.purpose}`;
      
      const context = {
        booking,
        user,
        organizer: booking.user
      };

      return await this.sendTemplateEmail(user.email, subject, 'booking-reminder', context);
      
    } catch (error) {
      console.error('❌ Meeting reminder failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmailService;