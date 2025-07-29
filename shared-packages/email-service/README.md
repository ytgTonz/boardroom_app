# @boardroom/email-service

Reusable email service with template support for Node.js applications.

## Features

- 📧 **Multiple SMTP Providers** - Gmail, custom SMTP, or test accounts
- 🎨 **Handlebars Templates** - Rich HTML email templates
- 🔧 **Configurable** - Easy setup with environment variables
- 📱 **Responsive** - Mobile-friendly email templates
- 🧪 **Test Mode** - Built-in test email preview with Ethereal

## Installation

```bash
npm install @boardroom/email-service
```

## Quick Start

```javascript
const EmailService = require('@boardroom/email-service');

// Initialize with environment variables
const emailService = new EmailService();

// Or with custom config
const emailService = new EmailService({
  emailUser: 'your-email@gmail.com',
  emailPassword: 'your-app-password',
  emailFrom: 'Your App <noreply@yourapp.com>'
});

// Send simple email
await emailService.sendEmail(
  'user@example.com',
  'Welcome!',
  'Hello World',
  false // isHtml
);

// Send template email
await emailService.sendTemplateEmail(
  'user@example.com',
  'Meeting Invitation',
  'booking-created',
  { booking, user, organizer }
);
```

## Environment Variables

```env
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password
EMAIL_FROM=Your App <noreply@yourapp.com>
```

## Template System

Templates are stored in `templates/email/` directory:

- `booking-created.hbs` - Meeting invitations
- `booking-cancelled.hbs` - Meeting cancellations
- `booking-reminder.hbs` - Meeting reminders

### Custom Templates

Add your own `.hbs` files to the templates directory and use:

```javascript
await emailService.sendTemplateEmail(
  'user@example.com',
  'Subject',
  'your-template',
  { your: 'context' }
);
```

## Handlebars Helpers

Built-in helpers for templates:

- `{{formatDate date}}` - Format date as "Monday, January 1, 2024"
- `{{formatTime date}}` - Format time as "2:30 PM"
- `{{formatDateTime date}}` - Format full date and time

## Business Methods

### Booking Notifications

```javascript
// Send meeting invitation
await emailService.sendBookingNotification(
  booking,
  user,
  organizer,
  'created'
);

// Send cancellation notice
await emailService.sendBookingNotification(
  booking,
  user,
  organizer,
  'cancelled'
);

// Send meeting reminder
await emailService.sendMeetingReminder(booking, user);
```

## Configuration Options

```javascript
const emailService = new EmailService({
  emailUser: 'smtp-user@example.com',
  emailPassword: 'password',
  emailFrom: 'App Name <noreply@app.com>',
  service: 'gmail', // or custom SMTP settings
  templatesPath: '/custom/path/to/templates'
});
```

## Error Handling

All methods return `{ success: boolean, error?: string, messageId?: string }`

```javascript
const result = await emailService.sendEmail(to, subject, content);
if (!result.success) {
  console.error('Email failed:', result.error);
}
```

## Testing

```bash
npm test
```

Test emails are sent to Ethereal Email with preview URLs logged to console.