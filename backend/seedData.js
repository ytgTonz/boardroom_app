const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./src/models/User');
const Boardroom = require('./src/models/Boardroom');
const Booking = require('./src/models/Booking');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/boardroom_booking', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB for seeding'))
.catch(err => console.error('MongoDB connection error:', err));

// Test Users
const testUsers = [
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'admin'
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password123',
    role: 'user'
  },
  {
    name: 'Mike Johnson',
    email: 'mike@example.com',
    password: 'password123',
    role: 'user'
  },
  {
    name: 'Sarah Wilson',
    email: 'sarah@example.com',
    password: 'password123',
    role: 'user'
  }
];

// Test Boardrooms
const testBoardrooms = [
  {
    name: 'Executive Suite',
    capacity: 12,
    location: 'Floor 1 - East Wing',
    amenities: ['Projector', 'Whiteboard', 'Video Conference', 'Coffee Machine'],
    description: 'Premium boardroom with executive seating and advanced AV equipment',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
        alt: 'Executive boardroom with modern furniture',
        isPrimary: true
      },
      {
        url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop',
        alt: 'Executive suite with projector screen',
        isPrimary: false
      }
    ]
  },
  {
    name: 'Innovation Lab',
    capacity: 8,
    location: 'Floor 2 - West Wing',
    amenities: ['Smart Board', 'Video Conference', 'Brainstorming Tools'],
    description: 'Creative space designed for collaborative sessions and workshops',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
        alt: 'Innovation lab with whiteboards',
        isPrimary: true
      }
    ]
  },
  {
    name: 'Conference Room A',
    capacity: 20,
    location: 'Floor 1 - Main Building',
    amenities: ['Projector', 'Audio System', 'Video Conference', 'Catering Setup'],
    description: 'Large conference room suitable for company-wide meetings',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
        alt: 'Large conference room with projector',
        isPrimary: true
      },
      {
        url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop',
        alt: 'Conference room seating area',
        isPrimary: false
      }
    ]
  },
  {
    name: 'Meeting Room B',
    capacity: 6,
    location: 'Floor 2 - North Wing',
    amenities: ['Whiteboard', 'Video Conference'],
    description: 'Intimate meeting room for small team discussions',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
        alt: 'Small meeting room with table',
        isPrimary: true
      }
    ]
  },
  {
    name: 'Training Room',
    capacity: 15,
    location: 'Floor 3 - Training Center',
    amenities: ['Projector', 'Whiteboard', 'Audio System', 'Training Equipment'],
    description: 'Dedicated space for training sessions and workshops',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
        alt: 'Training room with equipment',
        isPrimary: true
      },
      {
        url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop',
        alt: 'Training room setup',
        isPrimary: false
      }
    ]
  }
];

// Helper function to hash passwords
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Helper function to create future dates
function getFutureDate(hoursFromNow) {
  const date = new Date();
  date.setHours(date.getHours() + hoursFromNow);
  return date;
}

// Helper function to create past dates
function getPastDate(hoursAgo) {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date;
}

async function seedData() {
  try {
    console.log('Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Boardroom.deleteMany({});
    await Booking.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of testUsers) {
      const hashedPassword = await hashPassword(userData.password);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      const savedUser = await user.save();
      createdUsers.push(savedUser);
      console.log(`Created user: ${userData.name}`);
    }

    // Create boardrooms
    const createdBoardrooms = [];
    for (const boardroomData of testBoardrooms) {
      const boardroom = new Boardroom(boardroomData);
      const savedBoardroom = await boardroom.save();
      createdBoardrooms.push(savedBoardroom);
      console.log(`Created boardroom: ${boardroomData.name}`);
    }

    // Create test bookings
    const testBookings = [
      {
        user: createdUsers[1]._id, // Jane Smith
        boardroom: createdBoardrooms[0]._id, // Executive Suite
        startTime: getFutureDate(2),
        endTime: getFutureDate(4),
        purpose: 'Quarterly Planning Meeting',
        attendees: 8,
        status: 'confirmed',
        notes: 'Please prepare Q4 presentation materials'
      },
      {
        user: createdUsers[2]._id, // Mike Johnson
        boardroom: createdBoardrooms[1]._id, // Innovation Lab
        startTime: getFutureDate(6),
        endTime: getFutureDate(8),
        purpose: 'Product Brainstorming Session',
        attendees: 6,
        status: 'confirmed',
        notes: 'Bring your creative ideas for new features'
      },
      {
        user: createdUsers[3]._id, // Sarah Wilson
        boardroom: createdBoardrooms[2]._id, // Conference Room A
        startTime: getFutureDate(24),
        endTime: getFutureDate(26),
        purpose: 'All-Hands Meeting',
        attendees: 15,
        status: 'confirmed',
        notes: 'Company-wide update meeting'
      },
      {
        user: createdUsers[1]._id, // Jane Smith
        boardroom: createdBoardrooms[3]._id, // Meeting Room B
        startTime: getFutureDate(12),
        endTime: getFutureDate(13),
        purpose: 'Client Presentation',
        attendees: 4,
        status: 'confirmed',
        notes: 'Prepare demo for client meeting'
      },
      {
        user: createdUsers[0]._id, // John Doe (Admin)
        boardroom: createdBoardrooms[4]._id, // Training Room
        startTime: getFutureDate(48),
        endTime: getFutureDate(50),
        purpose: 'New Employee Training',
        attendees: 10,
        status: 'confirmed',
        notes: 'Orientation session for new hires'
      },
      {
        user: createdUsers[2]._id, // Mike Johnson
        boardroom: createdBoardrooms[0]._id, // Executive Suite
        startTime: getPastDate(2),
        endTime: getPastDate(1),
        purpose: 'Completed Meeting',
        attendees: 5,
        status: 'confirmed',
        notes: 'This meeting has already happened'
      }
    ];

    for (const bookingData of testBookings) {
      const booking = new Booking(bookingData);
      await booking.save();
      console.log(`Created booking: ${bookingData.purpose}`);
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nTest Accounts:');
    console.log('Admin: john@example.com / password123');
    console.log('User: jane@example.com / password123');
    console.log('User: mike@example.com / password123');
    console.log('User: sarah@example.com / password123');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the seeding
seedData(); 