/**
 * Environment Validation Tests
 */

const { validateEnvironment, validateJWTSecret, validateMongoURI } = require('../utils/validateEnvironment');

describe('Environment Validation', () => {
  let originalEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Mock console methods to suppress output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('validateJWTSecret', () => {
    it('should accept valid JWT secrets', () => {
      const validSecret = 'this-is-a-very-secure-jwt-secret-key-with-32-plus-characters';
      expect(validateJWTSecret(validSecret)).toBe(true);
    });

    it('should reject short JWT secrets', () => {
      const shortSecret = 'short';
      expect(validateJWTSecret(shortSecret)).toBe(false);
    });

    it('should reject default JWT secrets', () => {
      const defaultSecrets = [
        'your-secret-key',
        'your_jwt_secret_here',
        'supersecret',
        'secret',
        'jwt-secret',
        'changeme'
      ];

      defaultSecrets.forEach(secret => {
        expect(validateJWTSecret(secret)).toBe(false);
      });
    });

    it('should reject empty or null secrets', () => {
      expect(validateJWTSecret('')).toBe(false);
      expect(validateJWTSecret(null)).toBe(false);
      expect(validateJWTSecret(undefined)).toBe(false);
    });
  });

  describe('validateMongoURI', () => {
    it('should accept valid MongoDB URIs', () => {
      const validURIs = [
        'mongodb://localhost:27017/testdb',
        'mongodb://user:pass@localhost:27017/testdb',
        'mongodb+srv://user:pass@cluster.mongodb.net/testdb',
        'mongodb://localhost:27017,localhost:27018/testdb'
      ];

      validURIs.forEach(uri => {
        expect(validateMongoURI(uri)).toBe(true);
      });
    });

    it('should reject invalid MongoDB URIs', () => {
      const invalidURIs = [
        'http://localhost:27017/testdb',
        'postgres://localhost:5432/testdb',
        'localhost:27017/testdb',
        'not-a-uri'
      ];

      invalidURIs.forEach(uri => {
        expect(validateMongoURI(uri)).toBe(false);
      });
    });

    it('should reject empty or null URIs', () => {
      expect(validateMongoURI('')).toBe(false);
      expect(validateMongoURI(null)).toBe(false);
      expect(validateMongoURI(undefined)).toBe(false);
    });
  });

  describe('validateEnvironment', () => {
    it('should pass validation with all required development variables', () => {
      process.env.JWT_SECRET = 'secure-jwt-secret-key-for-development-32-chars';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.PORT = '5000';

      expect(validateEnvironment('development')).toBe(true);
    });

    it('should fail validation with missing JWT_SECRET', () => {
      delete process.env.JWT_SECRET;
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.PORT = '5000';

      expect(validateEnvironment('development')).toBe(false);
    });

    it('should fail validation with missing MONGODB_URI', () => {
      process.env.JWT_SECRET = 'secure-jwt-secret-key-for-development-32-chars';
      delete process.env.MONGODB_URI;
      process.env.PORT = '5000';

      expect(validateEnvironment('development')).toBe(false);
    });

    it('should require additional variables for production', () => {
      // Set development requirements
      process.env.JWT_SECRET = 'secure-jwt-secret-key-for-production-32-chars';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.PORT = '5000';
      process.env.NODE_ENV = 'production';

      // Should fail without email and imagekit config
      expect(validateEnvironment('production')).toBe(false);
    });

    it('should pass production validation with all required variables', () => {
      process.env.JWT_SECRET = 'secure-jwt-secret-key-for-production-32-chars';
      process.env.MONGODB_URI = 'mongodb+srv://user:pass@cluster.mongodb.net/proddb';
      process.env.PORT = '5000';
      process.env.NODE_ENV = 'production';
      process.env.EMAIL_USER = 'test@example.com';
      process.env.EMAIL_APP_PASSWORD = 'app-password';
      process.env.IMAGEKIT_PUBLIC_KEY = 'public_key';
      process.env.IMAGEKIT_PRIVATE_KEY = 'private_key';
      process.env.IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test';

      expect(validateEnvironment('production')).toBe(true);
    });

    it('should default to development environment', () => {
      process.env.JWT_SECRET = 'secure-jwt-secret-key-for-development-32-chars';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.PORT = '5000';

      // Should pass with development requirements
      expect(validateEnvironment()).toBe(true);
    });

    it('should handle invalid JWT secret format', () => {
      process.env.JWT_SECRET = 'your-secret-key'; // Default/insecure
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.PORT = '5000';

      expect(validateEnvironment('development')).toBe(false);
    });

    it('should handle invalid MongoDB URI format', () => {
      process.env.JWT_SECRET = 'secure-jwt-secret-key-for-development-32-chars';
      process.env.MONGODB_URI = 'invalid-uri';
      process.env.PORT = '5000';

      expect(validateEnvironment('development')).toBe(false);
    });
  });
});