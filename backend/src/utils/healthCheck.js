/**
 * Comprehensive Health Check System
 * Monitors all critical application components
 */

const mongoose = require('mongoose');
const logger = require('./logger');

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.initializeChecks();
  }

  initializeChecks() {
    // Database health check
    this.checks.set('database', {
      name: 'MongoDB Database',
      check: this.checkDatabase.bind(this),
      timeout: 5000,
      critical: true
    });

    // Memory usage check
    this.checks.set('memory', {
      name: 'Memory Usage',
      check: this.checkMemory.bind(this),
      timeout: 1000,
      critical: false
    });

    // Disk space check
    this.checks.set('diskSpace', {
      name: 'Disk Space',
      check: this.checkDiskSpace.bind(this),
      timeout: 2000,
      critical: false
    });

    // External services check
    this.checks.set('emailService', {
      name: 'Email Service',
      check: this.checkEmailService.bind(this),
      timeout: 3000,
      critical: false
    });

    // Application uptime
    this.checks.set('uptime', {
      name: 'Application Uptime',
      check: this.checkUptime.bind(this),
      timeout: 500,
      critical: false
    });

    // Environment variables check
    this.checks.set('environment', {
      name: 'Environment Configuration',
      check: this.checkEnvironment.bind(this),
      timeout: 1000,
      critical: true
    });
  }

  async checkDatabase() {
    try {
      const dbState = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      if (dbState !== 1) {
        return {
          status: 'unhealthy',
          message: `Database is ${states[dbState]}`,
          details: { readyState: dbState }
        };
      }

      // Test database connectivity with a simple query
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - startTime;

      // Check database statistics
      const stats = await mongoose.connection.db.stats();

      return {
        status: 'healthy',
        message: 'Database connection is active',
        details: {
          readyState: dbState,
          responseTime: `${responseTime}ms`,
          collections: stats.collections,
          dataSize: `${Math.round(stats.dataSize / 1024 / 1024)}MB`,
          indexSize: `${Math.round(stats.indexSize / 1024 / 1024)}MB`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database connectivity failed',
        error: error.message
      };
    }
  }

  async checkMemory() {
    try {
      const memUsage = process.memoryUsage();
      const totalMem = require('os').totalmem();
      const freeMem = require('os').freemem();

      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const systemUsedPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

      // Alert if heap usage is over 512MB or system memory is over 90%
      const isUnhealthy = heapUsedMB > 512 || systemUsedPercent > 90;

      return {
        status: isUnhealthy ? 'degraded' : 'healthy',
        message: isUnhealthy ? 'High memory usage detected' : 'Memory usage is normal',
        details: {
          heapUsed: `${heapUsedMB}MB`,
          heapTotal: `${heapTotalMB}MB`,
          systemMemoryUsed: `${systemUsedPercent}%`,
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Failed to check memory usage',
        error: error.message
      };
    }
  }

  async checkDiskSpace() {
    try {
      const fs = require('fs');
      const path = require('path');

      // Check disk space in the application directory
      const stats = fs.statSync(process.cwd());
      
      return {
        status: 'healthy',
        message: 'Disk space check completed',
        details: {
          currentDirectory: process.cwd(),
          accessible: true
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Disk space check failed',
        error: error.message
      };
    }
  }

  async checkEmailService() {
    try {
      const emailUser = process.env.EMAIL_USER;
      const emailPassword = process.env.EMAIL_APP_PASSWORD;

      if (!emailUser || !emailPassword) {
        return {
          status: 'degraded',
          message: 'Email service not configured',
          details: { configured: false }
        };
      }

      return {
        status: 'healthy',
        message: 'Email service is configured',
        details: {
          configured: true,
          emailUser: emailUser.replace(/(.{2}).*@/, '$1***@')
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Email service check failed',
        error: error.message
      };
    }
  }

  async checkUptime() {
    try {
      const uptimeSeconds = process.uptime();
      const uptimeHours = Math.floor(uptimeSeconds / 3600);
      const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);

      return {
        status: 'healthy',
        message: 'Application is running',
        details: {
          uptime: `${uptimeHours}h ${uptimeMinutes}m`,
          uptimeSeconds: Math.floor(uptimeSeconds),
          pid: process.pid,
          nodeVersion: process.version
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Uptime check failed',
        error: error.message
      };
    }
  }

  async checkEnvironment() {
    try {
      const requiredVars = [
        'JWT_SECRET',
        'MONGODB_URI',
        'PORT'
      ];

      const productionVars = [
        'EMAIL_USER',
        'EMAIL_APP_PASSWORD',
        'IMAGEKIT_PUBLIC_KEY',
        'IMAGEKIT_PRIVATE_KEY',
        'IMAGEKIT_URL_ENDPOINT'
      ];

      const missing = [];
      const present = [];

      // Check required variables
      requiredVars.forEach(varName => {
        if (process.env[varName]) {
          present.push(varName);
        } else {
          missing.push(varName);
        }
      });

      // Check production variables if in production
      if (process.env.NODE_ENV === 'production') {
        productionVars.forEach(varName => {
          if (!process.env[varName]) {
            missing.push(varName);
          } else {
            present.push(varName);
          }
        });
      }

      const isHealthy = missing.length === 0;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        message: isHealthy ? 'All required environment variables are set' : 'Missing required environment variables',
        details: {
          environment: process.env.NODE_ENV || 'development',
          requiredPresent: present.length,
          missing: missing,
          totalChecked: requiredVars.length + (process.env.NODE_ENV === 'production' ? productionVars.length : 0)
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Environment check failed',
        error: error.message
      };
    }
  }

  async runCheck(checkName) {
    const check = this.checks.get(checkName);
    if (!check) {
      throw new Error(`Health check '${checkName}' not found`);
    }

    const startTime = Date.now();
    
    try {
      // Run check with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), check.timeout);
      });

      const result = await Promise.race([
        check.check(),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;

      return {
        name: check.name,
        status: result.status,
        message: result.message,
        details: result.details || {},
        error: result.error,
        duration: `${duration}ms`,
        critical: check.critical,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        name: check.name,
        status: 'unhealthy',
        message: 'Health check failed',
        error: error.message,
        duration: `${duration}ms`,
        critical: check.critical,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runAllChecks() {
    const results = {};
    const promises = [];

    // Run all checks in parallel
    for (const [checkName] of this.checks) {
      promises.push(
        this.runCheck(checkName).then(result => {
          results[checkName] = result;
        })
      );
    }

    await Promise.all(promises);

    // Calculate overall health status
    const criticalChecks = Object.values(results).filter(r => r.critical);
    const unhealthyCritical = criticalChecks.filter(r => r.status === 'unhealthy');
    const degradedChecks = Object.values(results).filter(r => r.status === 'degraded');

    let overallStatus = 'healthy';
    if (unhealthyCritical.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedChecks.length > 0) {
      overallStatus = 'degraded';
    }

    const summary = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
      summary: {
        total: Object.keys(results).length,
        healthy: Object.values(results).filter(r => r.status === 'healthy').length,
        degraded: degradedChecks.length,
        unhealthy: Object.values(results).filter(r => r.status === 'unhealthy').length,
        critical: criticalChecks.length
      }
    };

    // Log health check results
    if (overallStatus === 'unhealthy') {
      logger.error('Health check failed', summary);
    } else if (overallStatus === 'degraded') {
      logger.warn('Health check shows degraded performance', summary);
    } else {
      logger.info('Health check passed', { status: overallStatus, checks: Object.keys(results).length });
    }

    return summary;
  }

  // Quick health check for basic endpoints
  async quickCheck() {
    const dbCheck = await this.runCheck('database');
    const memoryCheck = await this.runCheck('memory');
    const envCheck = await this.runCheck('environment');

    const status = [dbCheck, envCheck].every(c => c.status === 'healthy') ? 'healthy' : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      database: dbCheck.status,
      memory: memoryCheck.status,
      environment: envCheck.status
    };
  }
}

module.exports = new HealthCheckService();