# Boardroom Booking App

A modern boardroom booking application built with React, Node.js, Express, and MongoDB.

## Features

- **User Authentication**: Register, login, and logout functionality
- **Boardroom Management**: View available boardrooms with details
- **Booking System**: Book boardrooms with conflict detection
- **Booking Management**: View and cancel your bookings
- **Admin Features**: Manage boardrooms (admin only)
- **Responsive Design**: Modern UI with Tailwind CSS

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **helmet** - Security middleware
- **cors** - Cross-origin resource sharing

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications

## Project Structure

```
boardroom_booking_app/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
│   ├── package.json
│   ├── server.js
│   └── env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── package.json
└── README.md
```

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd boardroom_booking_app
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cd backend
   cp env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/boardroom_booking
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NODE_ENV=development
   ```

4. **Start MongoDB**
   - If using local MongoDB, make sure the service is running
   - If using MongoDB Atlas, update the connection string in `.env`

## Running the Application

### Development Mode
Run both backend and frontend simultaneously:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend development server on http://localhost:3000

### Production Mode
1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the backend:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)

### Boardrooms
- `GET /api/boardrooms` - Get all active boardrooms
- `GET /api/boardrooms/:id` - Get specific boardroom
- `POST /api/boardrooms` - Create boardroom (admin only)
- `PUT /api/boardrooms/:id` - Update boardroom (admin only)
- `DELETE /api/boardrooms/:id` - Deactivate boardroom (admin only)

### Bookings
- `GET /api/bookings/my-bookings` - Get user's bookings (protected)
- `POST /api/bookings` - Create a booking (protected)
- `DELETE /api/bookings/:id` - Cancel a booking (protected)
- `GET /api/bookings/availability/:id` - Get boardroom availability
- `GET /api/bookings/all` - Get all bookings (admin only)

## Usage

1. **Register/Login**: Create an account or sign in
2. **View Boardrooms**: Browse available boardrooms
3. **Book a Room**: Select a boardroom and time slot
4. **Manage Bookings**: View and cancel your bookings
5. **Admin Features**: Manage boardrooms (admin users only)

## Development

### Backend Development
```bash
cd backend
npm run dev
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Running Tests
```bash
npm test
```

## Environment Variables

### Backend (.env)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment (development/production)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details 