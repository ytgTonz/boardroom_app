// MongoDB initialization script for Docker
// Creates application database and user with proper permissions

// Switch to admin database for user creation
db = db.getSiblingDB('admin');

// Create application user if it doesn't exist
try {
  db.createUser({
    user: process.env.MONGO_INITDB_ROOT_USERNAME || 'admin',
    pwd: process.env.MONGO_INITDB_ROOT_PASSWORD || 'password',
    roles: [
      {
        role: 'root',
        db: 'admin'
      }
    ]
  });
  print('✅ Admin user created successfully');
} catch (error) {
  print('⚠️ Admin user already exists or creation failed:', error.message);
}

// Switch to application database
db = db.getSiblingDB('boardroom_booking');

// Create application-specific user
try {
  db.createUser({
    user: 'boardroom_user',
    pwd: process.env.MONGO_APP_PASSWORD || 'boardroom_password',
    roles: [
      {
        role: 'readWrite',
        db: 'boardroom_booking'
      }
    ]
  });
  print('✅ Application user created successfully');
} catch (error) {
  print('⚠️ Application user already exists or creation failed:', error.message);
}

// Create initial collections with proper structure
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: 1 });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

db.boardrooms.createIndex({ name: 1 }, { unique: true });
db.boardrooms.createIndex({ capacity: 1 });
db.boardrooms.createIndex({ location: 1 });
db.boardrooms.createIndex({ amenities: 1 });
db.boardrooms.createIndex({ isActive: 1 });

db.bookings.createIndex({ boardroom: 1, startTime: 1, endTime: 1 });
db.bookings.createIndex({ user: 1, startTime: 1 });
db.bookings.createIndex({ status: 1 });
db.bookings.createIndex({ startTime: 1, endTime: 1 });
db.bookings.createIndex({ createdAt: 1 });

db.notifications.createIndex({ user: 1, createdAt: -1 });
db.notifications.createIndex({ type: 1 });
db.notifications.createIndex({ read: 1 });
db.notifications.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

print('✅ Database indexes created successfully');
print('✅ MongoDB initialization completed');