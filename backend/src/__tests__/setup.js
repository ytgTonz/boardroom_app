/**
 * Jest Test Setup
 * Configures test environment and utilities
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Setup test database
beforeAll(async () => {
  try {
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to the in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('📊 Test database connected');
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
    process.exit(1);
  }
});

// Clean up after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    // Close database connection
    await mongoose.connection.close();
    
    // Stop the in-memory database
    if (mongoServer) {
      await mongoServer.stop();
    }
    
    console.log('📊 Test database disconnected');
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  }
});

// Increase Jest timeout for database operations
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};