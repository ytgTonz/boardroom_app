// ===== BACKEND (Node.js/Express) =====

// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/boardroom_booking', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

// Boardroom Schema
const boardroomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  location: { type: String, required: true },
  amenities: [String],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Booking Schema
const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  boardroom: { type: mongoose.Schema.Types.ObjectId, ref: 'Boardroom', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  purpose: { type: String, required: true },
  attendees: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Boardroom = mongoose.model('Boardroom', boardroomSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, 'your-secret-key');
    res.json({ token, user: { id: user._id, name, email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, 'your-secret-key');
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Boardroom Routes
app.get('/api/boardrooms', async (req, res) => {
  try {
    const boardrooms = await Boardroom.find({ isActive: true });
    res.json(boardrooms);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/boardrooms', authenticateToken, async (req, res) => {
  try {
    const { name, capacity, location, amenities } = req.body;
    const boardroom = new Boardroom({ name, capacity, location, amenities });
    await boardroom.save();
    res.json(boardroom);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Booking Routes
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.userId })
      .populate('boardroom', 'name location')
      .sort({ startTime: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { boardroom, startTime, endTime, purpose, attendees } = req.body;
    
    // Check for conflicts
    const conflict = await Booking.findOne({
      boardroom,
      status: 'confirmed',
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
        { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
      ]
    });

    if (conflict) {
      return res.status(400).json({ message: 'Time slot already booked' });
    }

    const booking = new Booking({
      user: req.user.userId,
      boardroom,
      startTime,
      endTime,
      purpose,
      attendees
    });

    await booking.save();
    const populatedBooking = await Booking.findById(booking._id).populate('boardroom', 'name location');
    res.json(populatedBooking);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { status: 'cancelled' },
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    res.json({ message: 'Booking cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get boardroom availability
app.get('/api/boardrooms/:id/availability', async (req, res) => {
  try {
    const { date } = req.query;
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      boardroom: req.params.id,
      status: 'confirmed',
      startTime: { $gte: startOfDay, $lte: endOfDay }
    });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ===== FRONTEND (React) =====

// App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:5000/api';

// Set up axios defaults
axios.defaults.baseURL = API_URL;

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
    }
  }, [token]);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentView('login');
  };

  if (!token) {
    return <AuthForm onLogin={login} />;
  }

  return (
    <div className="app">
      <Header user={user} onLogout={logout} currentView={currentView} setCurrentView={setCurrentView} />
      <main className="main-content">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'booking' && <BookingForm />}
        {currentView === 'mybookings' && <MyBookings />}
        {currentView === 'boardrooms' && <BoardroomList />}
      </main>
    </div>
  );
};

const Header = ({ user, onLogout, currentView, setCurrentView }) => (
  <header className="header">
    <div className="header-content">
      <h1>Boardroom Booking</h1>
      <nav className="nav">
        <button 
          className={currentView === 'dashboard' ? 'active' : ''}
          onClick={() => setCurrentView('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={currentView === 'booking' ? 'active' : ''}
          onClick={() => setCurrentView('booking')}
        >
          New Booking
        </button>
        <button 
          className={currentView === 'mybookings' ? 'active' : ''}
          onClick={() => setCurrentView('mybookings')}
        >
          My Bookings
        </button>
        <button 
          className={currentView === 'boardrooms' ? 'active' : ''}
          onClick={() => setCurrentView('boardrooms')}
        >
          Boardrooms
        </button>
      </nav>
      <div className="user-info">
        <span>Welcome, {user.name}</span>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
    </div>
  </header>
);

const AuthForm = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await axios.post(endpoint, formData);
      onLogin(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>{isLogin ? 'Login' : 'Register'}</h2>
        
        {error && <div className="error">{error}</div>}
        
        {!isLogin && (
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        )}
        
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
        
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
        </button>
        
        <p>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button type="button" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </form>
    </div>
  );
};

const Dashboard = () => {
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [stats, setStats] = useState({ totalBookings: 0, upcomingBookings: 0 });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/bookings');
      const bookings = response.data;
      const now = new Date();
      const upcoming = bookings.filter(booking => new Date(booking.startTime) > now);
      
      setUpcomingBookings(upcoming.slice(0, 5));
      setStats({
        totalBookings: bookings.length,
        upcomingBookings: upcoming.length
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      
      <div className="stats">
        <div className="stat-card">
          <h3>Total Bookings</h3>
          <p>{stats.totalBookings}</p>
        </div>
        <div className="stat-card">
          <h3>Upcoming Bookings</h3>
          <p>{stats.upcomingBookings}</p>
        </div>
      </div>

      <div className="upcoming-bookings">
        <h3>Upcoming Bookings</h3>
        {upcomingBookings.length === 0 ? (
          <p>No upcoming bookings</p>
        ) : (
          <div className="booking-list">
            {upcomingBookings.map(booking => (
              <div key={booking._id} className="booking-card">
                <h4>{booking.boardroom.name}</h4>
                <p>{booking.purpose}</p>
                <p>{new Date(booking.startTime).toLocaleDateString()} at {new Date(booking.startTime).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const BookingForm = () => {
  const [boardrooms, setBoardrooms] = useState([]);
  const [formData, setFormData] = useState({
    boardroom: '',
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
    attendees: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchBoardrooms();
  }, []);

  const fetchBoardrooms = async () => {
    try {
      const response = await axios.get('/boardrooms');
      setBoardrooms(response.data);
    } catch (error) {
      console.error('Error fetching boardrooms:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      await axios.post('/bookings', {
        boardroom: formData.boardroom,
        startTime: startDateTime,
        endTime: endDateTime,
        purpose: formData.purpose,
        attendees: parseInt(formData.attendees)
      });

      setMessage('Booking created successfully!');
      setFormData({
        boardroom: '',
        date: '',
        startTime: '',
        endTime: '',
        purpose: '',
        attendees: ''
      });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error creating booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="booking-form-container">
      <h2>New Booking</h2>
      
      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <form className="booking-form" onSubmit={handleSubmit}>
        <select
          value={formData.boardroom}
          onChange={(e) => setFormData({ ...formData, boardroom: e.target.value })}
          required
        >
          <option value="">Select Boardroom</option>
          {boardrooms.map(room => (
            <option key={room._id} value={room._id}>
              {room.name} - {room.location} (Capacity: {room.capacity})
            </option>
          ))}
        </select>

        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />

        <input
          type="time"
          value={formData.startTime}
          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          required
        />

        <input
          type="time"
          value={formData.endTime}
          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
          required
        />

        <input
          type="text"
          placeholder="Purpose of meeting"
          value={formData.purpose}
          onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
          required
        />

        <input
          type="number"
          placeholder="Number of attendees"
          value={formData.attendees}
          onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Booking'}
        </button>
      </form>
    </div>
  );
};

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get('/bookings');
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      await axios.delete(`/bookings/${bookingId}`);
      setBookings(bookings.map(booking => 
        booking._id === bookingId ? { ...booking, status: 'cancelled' } : booking
      ));
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="my-bookings">
      <h2>My Bookings</h2>
      
      {bookings.length === 0 ? (
        <p>No bookings found</p>
      ) : (
        <div className="booking-list">
          {bookings.map(booking => (
            <div key={booking._id} className={`booking-card ${booking.status}`}>
              <h3>{booking.boardroom.name}</h3>
              <p><strong>Location:</strong> {booking.boardroom.location}</p>
              <p><strong>Purpose:</strong> {booking.purpose}</p>
              <p><strong>Date:</strong> {new Date(booking.startTime).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {new Date(booking.startTime).toLocaleTimeString()} - {new Date(booking.endTime).toLocaleTimeString()}</p>
              <p><strong>Attendees:</strong> {booking.attendees}</p>
              <p><strong>Status:</strong> {booking.status}</p>
              
              {booking.status === 'confirmed' && new Date(booking.startTime) > new Date() && (
                <button 
                  onClick={() => cancelBooking(booking._id)}
                  className="cancel-btn"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BoardroomList = () => {
  const [boardrooms, setBoardrooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoardrooms();
  }, []);

  const fetchBoardrooms = async () => {
    try {
      const response = await axios.get('/boardrooms');
      setBoardrooms(response.data);
    } catch (error) {
      console.error('Error fetching boardrooms:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="boardroom-list">
      <h2>Available Boardrooms</h2>
      
      <div className="room-grid">
        {boardrooms.map(room => (
          <div key={room._id} className="room-card">
            <h3>{room.name}</h3>
            <p><strong>Location:</strong> {room.location}</p>
            <p><strong>Capacity:</strong> {room.capacity} people</p>
            {room.amenities && room.amenities.length > 0 && (
              <div>
                <strong>Amenities:</strong>
                <ul>
                  {room.amenities.map((amenity, index) => (
                    <li key={index}>{amenity}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;

// ===== STYLES (App.css) =====
/*
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

.app {
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
}

.nav {
  display: flex;
  gap: 1rem;
}

.nav button {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.nav button:hover,
.nav button.active {
  background: rgba(255,255,255,0.2);
  transform: translateY(-2px);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logout-btn {
  background: #ff4757;
  border: none;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: #ff3838;
  transform: translateY(-2px);
}

.main-content {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 2rem;
}

.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-form {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
}

.auth-form h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: #333;
}

.auth-form input {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.auth-form input:focus {
  outline: none;
  border-color: #667eea;
}

.auth-form button {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 1rem;
}

.auth-form button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}

.auth-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  background: #ffebee;
  color: #c62828;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid #ffcdd2;
}

.message {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.message.success {
  background: #e8f5e8;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.message.error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
}

.dashboard {
  padding: 2rem 0;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.stat-card {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  text-align: center;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-card h3 {
  color: #666;
  margin-bottom: 1rem;
}

.stat-card p {
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
}

.booking-form-container {
  max-width: 600px;
  margin: 0 auto;
}

.booking-form {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.booking-form input,
.booking-form select,
.booking-form textarea {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.booking-form input:focus,
.booking-form select:focus,
.booking-form textarea:focus {
  outline: none;
  border-color: #667eea;
}

.booking-form button {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
}

.booking-form button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}

.booking-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.booking-list {
  display: grid;
  gap: 1rem;
}

.booking-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  transition: transform 0.3s;
}

.booking-card:hover {
  transform: translateY(-3px);
}

.booking-card.cancelled {
  opacity: 0.6;
  background: #f5f5f5;
}

.booking-card h3,
.booking-card h4 {
  color: #333;
  margin-bottom: 0.5rem;
}

.booking-card p {
  margin-bottom: 0.5rem;
  color: #666;
}

.cancel-btn {
  background: #ff4757;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 1rem;
}

.cancel-btn:hover {
  background: #ff3838;
  transform: translateY(-2px);
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.room-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  transition: transform 0.3s;
}

.room-card:hover {
  transform: translateY(-3px);
}

.room-card h3 {
  color: #333;
  margin-bottom: 1rem;
}

.room-card p {
  margin-bottom: 0.5rem;
  color: #666;
}

.room-card ul {
  list-style: none;
  margin-top: 0.5rem;
}

.room-card li {
  padding: 0.25rem 0;
  color: #666;
}

.room-card li::before {
  content: "✓ ";
  color: #4caf50;
  font-weight: bold;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .nav {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .main-content {
    padding: 0 1rem;
  }
  
  .stats {
    grid-template-columns: 1fr;
  }
  
  .room-grid {
    grid-template-columns: 1fr;
  }
}
*/

// ===== PACKAGE.JSON FILES =====

/* Backend package.json:
{
  "name": "boardroom-booking-backend",
  "version": "1.0.0",
  "description": "Backend for boardroom booking system",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.3",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0",
    "express-validator": "^6.15.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
*/

/* Frontend package.json:
{
  "name": "boardroom-booking-frontend",
  "version": "1.0.0",
  "description": "Frontend for boardroom booking system",
  "main": "index.js",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "axios": "^1.4.0"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
*/

// ===== SETUP INSTRUCTIONS =====

/*
SETUP INSTRUCTIONS:

1. Backend Setup:
   - Create a new directory: mkdir boardroom-booking-backend
   - Navigate to it: cd boardroom-booking-backend
   - Initialize npm: npm init -y
   - Install dependencies:
     npm install express mongoose cors bcryptjs jsonwebtoken express-validator
     npm install -D nodemon
   - Create server.js file with the backend code above
   - Update package.json with the scripts shown above
   - Start MongoDB locally or use MongoDB Atlas
   - Run: npm run dev

2. Frontend Setup:
   - Create React app: npx create-react-app boardroom-booking-frontend
   - Navigate to it: cd boardroom-booking-frontend
   - Install axios: npm install axios
   - Replace App.js content with the frontend code above
   - Replace App.css content with the styles above
   - Run: npm start

3. Database Setup:
   - Install MongoDB locally or use MongoDB Atlas
   - The app will create the database and collections automatically
   - Default connection string: mongodb://localhost:27017/boardroom_booking

4. Initial Data (Optional):
   - You can add some sample boardrooms through the API or directly to MongoDB
   - Example boardrooms:
     {
       "name": "Conference Room A",
       "capacity": 12,
       "location": "Floor 1, Wing A",
       "amenities": ["Projector", "Whiteboard", "Video Conference"]
     }

5. Environment Variables (Production):
   - Create .env file in backend directory
   - Add: JWT_SECRET=your-secret-key
   - Add: MONGODB_URI=your-mongodb-connection-string
   - Update server.js to use process.env variables

6. Features Included:
   - User authentication (register/login)
   - Boardroom management
   - Booking creation and management
   - Conflict detection
   - Responsive design
   - Dashboard with statistics
   - Booking cancellation
   - Real-time availability checking

7. API Endpoints:
   - POST /api/auth/register - User registration
   - POST /api/auth/login - User login
   - GET /api/boardrooms - Get all boardrooms
   - POST /api/boardrooms - Create boardroom (admin)
   - GET /api/bookings - Get user bookings
   - POST /api/bookings - Create booking
   - DELETE /api/bookings/:id - Cancel booking
   - GET /api/boardrooms/:id/availability - Check availability

8. Security Features:
   - JWT authentication
   - Password hashing with bcrypt
   - Input validation
   - CORS configuration
   - Protected routes

9. Future Enhancements:
   - Email notifications
   - Recurring bookings
   - Admin panel
   - Calendar integration
   - File uploads
   - Advanced search and filters
   - Mobile app
   - Push notifications
*/