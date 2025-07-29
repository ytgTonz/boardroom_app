// Test script for @boardroom/auth-service
const AuthService = require('./index');

async function runTests() {
  console.log('🧪 Testing Auth Service...\n');

  // Initialize service
  const authService = new AuthService({
    jwtSecret: 'test-secret-key',
    minPasswordLength: 6
  });

  // Test 1: Password hashing
  console.log('🔒 Test 1: Password Hashing');
  const plainPassword = 'testPassword123';
  const hashedPassword = await authService.hashPassword(plainPassword);
  const isValidPassword = await authService.comparePassword(plainPassword, hashedPassword);
  console.log('Hashed password:', hashedPassword.substring(0, 20) + '...');
  console.log('Password verification:', isValidPassword);
  console.log('');

  // Test 2: JWT Token generation and verification
  console.log('🔑 Test 2: JWT Tokens');
  const token = authService.generateToken('user123', 'admin');
  console.log('Generated token:', token.substring(0, 50) + '...');
  
  try {
    const decoded = authService.verifyToken(token);
    console.log('Decoded token:', decoded);
  } catch (error) {
    console.error('Token verification failed:', error.message);
  }
  console.log('');

  // Test 3: Input validation
  console.log('✅ Test 3: Input Validation');
  const validationErrors1 = authService.validateUserInput('', 'invalid-email', '123');
  console.log('Validation errors (invalid input):', validationErrors1);
  
  const validationErrors2 = authService.validateUserInput('John Doe', 'john@example.com', 'validPassword123');
  console.log('Validation errors (valid input):', validationErrors2);
  console.log('');

  // Test 4: Mock user operations (without database)
  console.log('👥 Test 4: User Operations (Mock)');
  console.log('Note: These tests would normally require a MongoDB connection');
  
  // Mock registration
  console.log('Mock registration result format:');
  console.log({
    success: true,
    token: 'jwt-token-here',
    user: {
      id: 'user-id',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user'
    }
  });
  
  // Mock login
  console.log('Mock login result format:');
  console.log({
    success: true,
    token: 'jwt-token-here',
    user: {
      id: 'user-id',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user'
    }
  });
  console.log('');

  // Test 5: Middleware creation
  console.log('🛡️ Test 5: Middleware Creation');
  const authMiddleware = authService.createAuthMiddleware();
  const adminMiddleware = authService.createAdminMiddleware();
  
  console.log('Auth middleware created:', typeof authMiddleware === 'function');
  console.log('Admin middleware created:', typeof adminMiddleware === 'function');
  console.log('');

  // Test 6: Error handling
  console.log('❌ Test 6: Error Handling');
  try {
    authService.verifyToken('invalid-token');
  } catch (error) {
    console.log('Expected error for invalid token:', error.message);
  }
  
  const invalidValidation = authService.validateUserInput('', '', '');
  console.log('Validation errors for empty input:', invalidValidation);
  console.log('');

  console.log('✅ Auth Service tests completed!');
  console.log('📝 To test database operations, ensure MongoDB is connected and run:');
  console.log('   const result = await authService.register("name", "email@example.com", "password");');
}

// Run tests
runTests().catch(console.error);