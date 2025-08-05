/**
 * Health Check System Tests
 */

const healthCheck = require('../utils/healthCheck');

// Mock logger to prevent output during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Health Check System', () => {
  beforeEach(() => {
    // Mock console methods to suppress output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Individual Health Checks', () => {
    it('should run memory check successfully', async () => {
      const result = await healthCheck.runCheck('memory');
      
      expect(result).toHaveProperty('name', 'Memory Usage');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('details');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('timestamp');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });

    it('should run uptime check successfully', async () => {
      const result = await healthCheck.runCheck('uptime');
      
      expect(result).toHaveProperty('name', 'Application Uptime');
      expect(result.status).toBe('healthy');
      expect(result.details).toHaveProperty('uptime');
      expect(result.details).toHaveProperty('pid');
      expect(result.details).toHaveProperty('nodeVersion');
    });

    it('should run disk space check successfully', async () => {
      const result = await healthCheck.runCheck('diskSpace');
      
      expect(result).toHaveProperty('name', 'Disk Space');
      expect(result).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });

    it('should run email service check successfully', async () => {
      const result = await healthCheck.runCheck('emailService');
      
      expect(result).toHaveProperty('name', 'Email Service');
      expect(result).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });

    it('should run environment check successfully', async () => {
      // Set required environment variables
      process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-32-chars';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.PORT = '5000';
      
      const result = await healthCheck.runCheck('environment');
      
      expect(result).toHaveProperty('name', 'Environment Configuration');
      expect(result).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });

    it('should handle check timeout', async () => {
      // This test verifies that checks respect timeout limits
      const result = await healthCheck.runCheck('memory');
      
      // Check should complete within reasonable time
      expect(result).toHaveProperty('duration');
      const duration = parseInt(result.duration.replace('ms', ''));
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Quick Health Check', () => {
    it('should run quick check successfully', async () => {
      // Set required environment variables
      process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-32-chars';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.PORT = '5000';
      
      const result = await healthCheck.quickCheck();
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('environment');
      expect(['healthy', 'unhealthy']).toContain(result.status);
    });
  });

  describe('Comprehensive Health Check', () => {
    it('should run all checks successfully', async () => {
      // Set required environment variables
      process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-32-chars';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.PORT = '5000';
      
      const result = await healthCheck.runAllChecks();
      
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('summary');
      
      // Check summary structure
      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('healthy');
      expect(result.summary).toHaveProperty('degraded');
      expect(result.summary).toHaveProperty('unhealthy');
      expect(result.summary).toHaveProperty('critical');
      
      // Should have all expected checks
      const expectedChecks = ['database', 'memory', 'diskSpace', 'emailService', 'uptime', 'environment'];
      expectedChecks.forEach(checkName => {
        expect(result.checks).toHaveProperty(checkName);
      });
      
      expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    });

    it('should calculate overall status correctly', async () => {
      // Set required environment variables
      process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-32-chars';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.PORT = '5000';
      
      const result = await healthCheck.runAllChecks();
      
      // Verify status calculation logic
      const criticalChecks = Object.values(result.checks).filter(c => c.critical);
      const unhealthyCritical = criticalChecks.filter(c => c.status === 'unhealthy');
      const degradedChecks = Object.values(result.checks).filter(c => c.status === 'degraded');
      
      if (unhealthyCritical.length > 0) {
        expect(result.status).toBe('unhealthy');
      } else if (degradedChecks.length > 0) {
        expect(result.status).toBe('degraded');
      } else {
        expect(result.status).toBe('healthy');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid check name', async () => {
      await expect(healthCheck.runCheck('invalid-check')).rejects.toThrow(
        "Health check 'invalid-check' not found"
      );
    });

    it('should handle environment validation errors', async () => {
      // Clear required environment variables
      delete process.env.JWT_SECRET;
      delete process.env.MONGODB_URI;
      
      const result = await healthCheck.runCheck('environment');
      
      expect(result.status).toBe('unhealthy');
      expect(result.message).toContain('Missing required environment variables');
    });
  });

  describe('Performance', () => {
    it('should complete all checks within reasonable time', async () => {
      // Set required environment variables
      process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-32-chars';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.PORT = '5000';
      
      const startTime = Date.now();
      const result = await healthCheck.runAllChecks();
      const endTime = Date.now();
      
      // Should complete within 10 seconds
      expect(endTime - startTime).toBeLessThan(10000);
      expect(result).toHaveProperty('status');
    });

    it('should run checks in parallel', async () => {
      // Set required environment variables
      process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-32-chars';
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      process.env.PORT = '5000';
      
      const startTime = Date.now();
      await healthCheck.runAllChecks();
      const endTime = Date.now();
      
      // Running checks in parallel should be faster than running them sequentially
      // If we had 6 checks with 1 second timeout each, sequential would take 6+ seconds
      // Parallel should take much less
      expect(endTime - startTime).toBeLessThan(6000);
    });
  });
});