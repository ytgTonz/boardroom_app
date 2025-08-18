# Boardroom Booking API Guide

## Overview
The Boardroom Booking API provides comprehensive functionality for managing boardroom reservations, user authentication, and notifications. Built with Node.js, Express, and MongoDB.

**Base URL:** `http://localhost:5000/api`

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Rate Limiting
- **General API:** 1000 requests/15min (production), 100 requests/15min (development)
- **Authentication:** 20 requests/15min (production), 50 requests/15min (development)
- **Booking Operations:** 30 requests/min (production), 50 requests/min (development)
- **Email/Notifications:** 10 requests/hour (production), 20 requests/hour (development)

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Creates a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@company.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@company.com",
    "role": "user"
  }
}
```

### Login
**POST** `/auth/login`

Authenticates a user and returns a JWT token.

**Request Body:**
```json
{
  "email": "john@company.com",
  "password": "password123"
}
```

### Get Profile
**GET** `/auth/profile` 🔒

Returns the current user's profile information.

### Get All Users
**GET** `/auth/users` 🔒

Returns a list of all users (for attendee selection).

### Password Reset Flow
**POST** `/auth/forgot-password`
**POST** `/auth/validate-reset-token`
**POST** `/auth/reset-password`

## Boardroom Endpoints

### Get All Boardrooms
**GET** `/boardrooms`

Returns all active boardrooms.

**Response:**
```json
[
  {
    "id": "boardroom_id",
    "name": "Conference Room A",
    "capacity": 12,
    "location": "Floor 2, West Wing",
    "amenities": ["Projector", "Whiteboard", "Video Conference"],
    "images": [
      {
        "url": "image_url",
        "alt": "Boardroom image",
        "isPrimary": true
      }
    ],
    "description": "Modern conference room with AV equipment"
  }
]
```

### Get Boardroom by ID
**GET** `/boardrooms/:id`

Returns detailed information about a specific boardroom.

### Admin Boardroom Management 🔒👑

#### Get All Boardrooms (Admin)
**GET** `/boardrooms/admin/all`

Returns all boardrooms including inactive ones.

#### Create Boardroom
**POST** `/boardrooms`

**Request Body:**
```json
{
  "name": "Conference Room B",
  "capacity": 8,
  "location": "Floor 1, East Wing",
  "amenities": ["TV Screen", "Phone"],
  "description": "Small meeting room"
}
```

#### Update Boardroom
**PUT** `/boardrooms/:id`

#### Delete Boardroom (Soft Delete)
**DELETE** `/boardrooms/:id`

#### Permanent Delete
**DELETE** `/boardrooms/:id/permanent`

#### Image Management
**POST** `/boardrooms/:id/images` - Add image URL
**POST** `/boardrooms/:id/upload-image` - Upload image file
**DELETE** `/boardrooms/:id/images/:imageIndex` - Remove image

#### ImageKit Authentication
**GET** `/boardrooms/imagekit-auth`

## Booking Endpoints

### Get User Bookings
**GET** `/bookings/my-bookings` 🔒

Returns current user's bookings.

**Query Parameters:**
- `status` - Filter by status (pending, confirmed, cancelled)
- `upcoming` - Show only upcoming bookings (true/false)

### Get All Bookings (Calendar View)
**GET** `/bookings/calendar` 🔒

Returns all bookings for calendar display.

### Create Booking
**POST** `/bookings` 🔒

**Request Body:**
```json
{
  "boardroom": "boardroom_id",
  "startTime": "2025-08-15T10:00:00.000Z",
  "endTime": "2025-08-15T11:00:00.000Z",
  "purpose": "Team Meeting",
  "attendees": ["user_id_1", "user_id_2"],
  "externalAttendees": [
    {
      "email": "external@company.com",
      "name": "External User"
    }
  ],
  "notes": "Optional meeting notes"
}
```

### Update Booking
**PUT** `/bookings/:id` 🔒

Updates booking details (only by booking creator).

### Cancel Booking
**PUT** `/bookings/:id/cancel` 🔒

Cancels a booking (only by booking creator).

### Delete Booking
**DELETE** `/bookings/:id` 🔒

Permanently deletes a booking (only by booking creator).

### Opt Out of Booking
**PATCH** `/bookings/:id/opt-out` 🔒

Allows attendees to remove themselves from a booking.

### Check Availability
**GET** `/bookings/availability/:boardroomId`

**Query Parameters:**
- `date` - Date to check (YYYY-MM-DD)

**Response:**
```json
{
  "available": true,
  "conflictingBookings": [],
  "availableSlots": ["09:00", "10:00", "11:00"]
}
```

### Detailed Availability
**GET** `/bookings/detailed-availability/:boardroomId`

Returns detailed availability information for a specific boardroom.

### Admin Booking Management 🔒👑

#### Get All Bookings
**GET** `/bookings/all`

#### Admin Cancel Booking
**PUT** `/bookings/admin/:id/cancel`

#### Admin Delete Booking
**DELETE** `/bookings/admin/:id`

## User Management Endpoints

### Get User Profile
**GET** `/users/profile` 🔒

### Update User Profile
**PUT** `/users/profile` 🔒

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@company.com",
  "phone": "+1234567890",
  "department": "Engineering",
  "position": "Software Developer",
  "location": "New York Office"
}
```

### Get User Statistics
**GET** `/users/profile/stats` 🔒

Returns booking statistics for the current user.

**Response:**
```json
{
  "totalBookings": 25,
  "upcomingBookings": 3,
  "completedBookings": 20,
  "cancelledBookings": 2,
  "lastBookingDate": "2025-08-10T14:00:00.000Z"
}
```

### Get All Users
**GET** `/users` 🔒

Returns all users (for attendee selection).

### Admin User Management 🔒👑

#### Get User Statistics
**GET** `/users/stats`

#### Update User Role
**PATCH** `/users/:id/role`

#### Delete User
**DELETE** `/users/:id`

#### Reset User Password
**PATCH** `/users/:id/reset-password`

## Notification Endpoints

### Get User Notifications
**GET** `/notifications` 🔒

Returns all notifications for the current user.

### Mark Notification as Read
**PATCH** `/notifications/:id/read` 🔒

### Delete Notification
**DELETE** `/notifications/:id` 🔒

### Delete All Notifications
**DELETE** `/notifications` 🔒

## System Endpoints

### Health Check
**GET** `/health`

Returns API health status.

### Database Status
**GET** `/database`

### System Monitoring
**GET** `/monitoring`

### Database Backup
**POST** `/backup` 🔒👑

## Data Models

### User
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "role": "user|admin",
  "phone": "string",
  "department": "string",
  "position": "string",
  "location": "string",
  "createdAt": "date",
  "lastLogin": "date"
}
```

### Boardroom
```json
{
  "id": "string",
  "name": "string",
  "capacity": "number",
  "location": "string",
  "amenities": ["string"],
  "images": [
    {
      "url": "string",
      "alt": "string",
      "isPrimary": "boolean",
      "fileId": "string"
    }
  ],
  "isActive": "boolean",
  "description": "string",
  "createdAt": "date"
}
```

### Booking
```json
{
  "id": "string",
  "user": "user_id",
  "boardroom": "boardroom_id",
  "startTime": "date",
  "endTime": "date",
  "purpose": "string",
  "attendees": ["user_id"],
  "externalAttendees": [
    {
      "email": "string",
      "name": "string"
    }
  ],
  "status": "pending|confirmed|cancelled",
  "notes": "string",
  "createdAt": "date",
  "modifiedAt": "date"
}
```

## Error Responses

### Common Error Codes
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (missing/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **429** - Too Many Requests (rate limit exceeded)
- **500** - Internal Server Error

### Error Response Format
```json
{
  "message": "Error description",
  "error": "Detailed error information",
  "retryAfter": 60
}
```

## Legend
- 🔒 Requires authentication
- 👑 Requires admin role
- **Bold endpoints** are most commonly used

## Development Notes

### Email Service
- In development: Uses test mode with console logging
- In production: Configured with SMTP settings
- Templates available for booking confirmations, cancellations, and reminders

### File Uploads
- Images uploaded via multer with 5MB limit
- Integration with ImageKit for image management
- Support for multiple image formats

### Database Optimization
- Comprehensive indexing for performance
- Connection pooling configured
- Monitoring and health checks available

### Security Features
- JWT authentication with expiration
- Password hashing with bcrypt
- Rate limiting per endpoint type
- Helmet security headers
- CORS configuration
- Input validation middleware

### Logging
- Structured logging with Winston
- HTTP request/response logging
- Error tracking with Sentry integration
- Application, error, and HTTP log files