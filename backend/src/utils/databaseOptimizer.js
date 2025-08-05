/**
 * Database Query Optimization and Indexing
 * Automated database performance optimization
 */

const mongoose = require('mongoose');
const logger = require('./logger');
const errorTracker = require('./sentryConfig');

class DatabaseOptimizer {
  constructor() {
    this.indexingStrategies = new Map();
    this.queryOptimizations = new Map();
    this.performanceMetrics = {
      indexesCreated: 0,
      indexesDropped: 0,
      queriesOptimized: 0,
      lastOptimization: null
    };
    
    this.initializeOptimizationStrategies();
  }

  initializeOptimizationStrategies() {
    // Define indexing strategies for each model
    this.indexingStrategies.set('User', [
      {
        fields: { email: 1 },
        options: { unique: true, name: 'user_email_unique' },
        rationale: 'Unique index for login queries and user lookups'
      },
      {
        fields: { role: 1, createdAt: -1 },
        options: { name: 'user_role_created' },
        rationale: 'Compound index for admin queries and user management'
      },
      {
        fields: { lastLogin: -1 },
        options: { name: 'user_last_login' },
        rationale: 'Index for activity tracking and user analytics'
      }
    ]);

    this.indexingStrategies.set('Boardroom', [
      {
        fields: { isActive: 1, capacity: 1 },
        options: { name: 'boardroom_active_capacity' },
        rationale: 'Compound index for filtering active rooms by capacity'
      },
      {
        fields: { location: 1, isActive: 1 },
        options: { name: 'boardroom_location_active' },
        rationale: 'Index for location-based room searches'
      },
      {
        fields: { name: 'text', description: 'text', 'amenities': 'text' },
        options: { name: 'boardroom_text_search' },
        rationale: 'Text index for full-text search capabilities'
      }
    ]);

    this.indexingStrategies.set('Booking', [
      // Existing indexes are already defined in the model
      {
        fields: { startTime: 1, endTime: 1 },
        options: { name: 'booking_time_range' },
        rationale: 'Range index for time-based queries and availability checks'
      },
      {
        fields: { status: 1, startTime: 1 },
        options: { name: 'booking_status_time' },
        rationale: 'Compound index for filtering bookings by status and time'
      },
      {
        fields: { user: 1, status: 1, startTime: -1 },
        options: { name: 'booking_user_status_time' },
        rationale: 'User-specific booking queries with status filtering'
      },
      {
        fields: { boardroom: 1, startTime: 1, status: 1 },
        options: { name: 'booking_room_time_status' },
        rationale: 'Room availability queries with status consideration'
      },
      {
        fields: { createdAt: -1 },
        options: { name: 'booking_created_desc' },
        rationale: 'Recent bookings and pagination queries'
      }
    ]);

    this.indexingStrategies.set('Notification', [
      {
        fields: { user: 1, read: 1, createdAt: -1 },
        options: { name: 'notification_user_read_time' },
        rationale: 'User notification queries with read status and chronological order'
      },
      {
        fields: { user: 1, createdAt: -1 },
        options: { name: 'notification_user_time' },
        rationale: 'User notification timeline queries'
      },
      {
        fields: { booking: 1 },
        options: { name: 'notification_booking', sparse: true },
        rationale: 'Booking-related notification lookups (sparse for optional field)'
      },
      {
        fields: { createdAt: -1 },
        options: { name: 'notification_recent' },
        rationale: 'Recent notifications and cleanup operations'
      }
    ]);
  }

  /**
   * Create optimized indexes for all models
   */
  async createOptimizedIndexes() {
    try {
      logger.info('🔧 Starting database index optimization...');
      let totalIndexesCreated = 0;

      for (const [modelName, strategies] of this.indexingStrategies) {
        try {
          const model = mongoose.model(modelName);
          
          logger.info(`Creating indexes for ${modelName} model...`);
          
          for (const strategy of strategies) {
            try {
              // Check if index already exists
              const existingIndexes = await model.collection.indexes();
              const indexExists = existingIndexes.some(idx => 
                idx.name === strategy.options.name
              );

              if (!indexExists) {
                await model.collection.createIndex(strategy.fields, strategy.options);
                totalIndexesCreated++;
                
                logger.info(`✅ Created index: ${strategy.options.name}`, {
                  model: modelName,
                  fields: strategy.fields,
                  rationale: strategy.rationale
                });
              } else {
                logger.debug(`Index already exists: ${strategy.options.name}`);
              }
            } catch (indexError) {
              logger.error(`Failed to create index ${strategy.options.name}`, {
                model: modelName,
                error: indexError.message
              });
              
              errorTracker.captureException(indexError, {
                tags: { operation: 'create_index', model: modelName },
                extra: { indexName: strategy.options.name, fields: strategy.fields }
              });
            }
          }
        } catch (modelError) {
          logger.error(`Failed to process model ${modelName}`, {
            error: modelError.message
          });
        }
      }

      this.performanceMetrics.indexesCreated += totalIndexesCreated;
      this.performanceMetrics.lastOptimization = new Date();

      logger.info('✅ Database index optimization completed', {
        indexesCreated: totalIndexesCreated,
        totalModels: this.indexingStrategies.size
      });

      return {
        success: true,
        indexesCreated: totalIndexesCreated,
        models: Array.from(this.indexingStrategies.keys())
      };
    } catch (error) {
      logger.error('❌ Database index optimization failed', { error: error.message });
      errorTracker.captureException(error, {
        tags: { operation: 'database_optimization' }
      });
      throw error;
    }
  }

  /**
   * Analyze existing indexes and provide recommendations
   */
  async analyzeIndexes() {
    try {
      const analysis = {};

      for (const [modelName] of this.indexingStrategies) {
        try {
          const model = mongoose.model(modelName);
          const indexes = await model.collection.indexes();
          const stats = await model.collection.stats();

          analysis[modelName] = {
            totalIndexes: indexes.length,
            indexes: indexes.map(idx => ({
              name: idx.name,
              keys: idx.key,
              unique: idx.unique || false,
              sparse: idx.sparse || false,
              size: idx.size || 'unknown'
            })),
            collectionStats: {
              documents: stats.count || 0,
              avgDocSize: Math.round(stats.avgObjSize || 0),
              totalSize: Math.round((stats.size || 0) / 1024), // KB
              indexSize: Math.round((stats.totalIndexSize || 0) / 1024) // KB
            }
          };
        } catch (modelError) {
          analysis[modelName] = {
            error: modelError.message
          };
        }
      }

      return analysis;
    } catch (error) {
      logger.error('Index analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get query optimization recommendations
   */
  getQueryOptimizationRecommendations() {
    return {
      User: {
        login: {
          query: 'User.findOne({ email })',
          optimization: 'Use case-insensitive index on email field',
          index: '{ email: 1 }',
          performance: 'O(log n) lookup instead of O(n) scan'
        },
        adminUsers: {
          query: 'User.find({ role: "admin" }).sort({ createdAt: -1 })',
          optimization: 'Compound index on role and createdAt',
          index: '{ role: 1, createdAt: -1 }',
          performance: 'Eliminates need for separate sort operation'
        }
      },
      Booking: {
        availability: {
          query: 'Booking.find({ boardroom, startTime: { $lt: endTime }, endTime: { $gt: startTime } })',
          optimization: 'Compound index on boardroom, startTime, and endTime',
          index: '{ boardroom: 1, startTime: 1, endTime: 1 }',
          performance: 'Efficient range queries for availability checks'
        },
        userBookings: {
          query: 'User bookings with pagination',
          optimization: 'Index user field with sort field',
          index: '{ user: 1, createdAt: -1 }',
          performance: 'Optimized pagination and sorting'
        },
        upcomingBookings: {
          query: 'Booking.find({ startTime: { $gte: new Date() }, status: "confirmed" })',
          optimization: 'Compound index on status and startTime',
          index: '{ status: 1, startTime: 1 }',
          performance: 'Fast filtering of future confirmed bookings'
        }
      },
      Boardroom: {
        search: {
          query: 'Text search in room names and descriptions',
          optimization: 'Text index for full-text search',
          index: '{ name: "text", description: "text" }',
          performance: 'Native MongoDB text search capabilities'
        },
        availableRooms: {
          query: 'Boardroom.find({ isActive: true, capacity: { $gte: requiredCapacity } })',
          optimization: 'Compound index on isActive and capacity',
          index: '{ isActive: 1, capacity: 1 }',
          performance: 'Fast filtering of available rooms by capacity'
        }
      },
      Notification: {
        userNotifications: {
          query: 'Notification.find({ user, read: false }).sort({ createdAt: -1 })',
          optimization: 'Compound index on user, read status, and creation time',
          index: '{ user: 1, read: 1, createdAt: -1 }',
          performance: 'Efficient unread notification queries'
        }
      }
    };
  }

  /**
   * Optimize slow queries based on monitoring data
   */
  async optimizeSlowQueries() {
    try {
      logger.info('🔍 Analyzing slow queries for optimization opportunities...');

      const recommendations = [];

      // Get current profiling data (if available)
      const db = mongoose.connection.db;
      
      try {
        // Enable profiling for slow operations (>100ms)
        await db.command({ profile: 2, slowms: 100 });
        logger.info('Database profiling enabled for slow query analysis');
        
        // Get recent slow operations
        const profileCollection = db.collection('system.profile');
        const slowOps = await profileCollection
          .find({ ts: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }) // Last 24 hours
          .sort({ ts: -1 })
          .limit(50)
          .toArray();

        for (const op of slowOps) {
          if (op.ns && op.command) {
            recommendations.push({
              namespace: op.ns,
              operation: op.command,
              duration: op.millis,
              timestamp: op.ts,
              executionStats: op.execStats,
              recommendation: this.generateQueryRecommendation(op)
            });
          }
        }

        // Disable profiling to avoid performance impact
        await db.command({ profile: 0 });
        
      } catch (profilingError) {
        logger.warn('Could not analyze query profiling data', { 
          error: profilingError.message 
        });
      }

      return {
        recommendations,
        generalOptimizations: this.getQueryOptimizationRecommendations()
      };
    } catch (error) {
      logger.error('Slow query optimization failed', { error: error.message });
      throw error;
    }
  }

  generateQueryRecommendation(operation) {
    const { command, millis, ns } = operation;
    
    if (millis > 1000) {
      return {
        severity: 'high',
        message: `Very slow query detected (${millis}ms). Consider adding indexes or optimizing query structure.`,
        suggestions: [
          'Add appropriate indexes for query fields',
          'Limit result set size with pagination',
          'Consider query restructuring'
        ]
      };
    } else if (millis > 500) {
      return {
        severity: 'medium',
        message: `Moderately slow query (${millis}ms). Performance could be improved.`,
        suggestions: [
          'Review index usage',
          'Consider compound indexes',
          'Optimize sort operations'
        ]
      };
    }
    
    return {
      severity: 'low',
      message: `Query performance is acceptable (${millis}ms)`,
      suggestions: ['Monitor for consistent performance']
    };
  }

  /**
   * Clean up old or unused indexes
   */
  async cleanupIndexes() {
    try {
      logger.info('🧹 Starting index cleanup...');
      let indexesDropped = 0;

      for (const [modelName] of this.indexingStrategies) {
        try {
          const model = mongoose.model(modelName);
          const indexes = await model.collection.indexes();

          // Look for indexes that might be unused or redundant
          for (const index of indexes) {
            // Skip default _id index
            if (index.name === '_id_') continue;

            // Check for potential redundant indexes
            // This is a basic implementation - in production, you'd want more sophisticated analysis
            const isRedundant = this.isIndexRedundant(index, indexes);
            
            if (isRedundant) {
              logger.info(`Potentially redundant index found: ${index.name} on ${modelName}`);
              // In production, you might want to require manual approval before dropping
              // await model.collection.dropIndex(index.name);
              // indexesDropped++;
            }
          }
        } catch (error) {
          logger.error(`Index cleanup failed for ${modelName}`, { error: error.message });
        }
      }

      this.performanceMetrics.indexesDropped += indexesDropped;
      
      return {
        success: true,
        indexesDropped,
        note: 'Redundant index detection implemented - manual review recommended before dropping'
      };
    } catch (error) {
      logger.error('Index cleanup failed', { error: error.message });
      throw error;
    }
  }

  isIndexRedundant(targetIndex, allIndexes) {
    // Basic redundancy check - a single field index is redundant if there's a compound index starting with the same field
    const targetKeys = Object.keys(targetIndex.key);
    
    if (targetKeys.length === 1) {
      const targetField = targetKeys[0];
      
      return allIndexes.some(otherIndex => {
        if (otherIndex.name === targetIndex.name) return false;
        const otherKeys = Object.keys(otherIndex.key);
        return otherKeys.length > 1 && otherKeys[0] === targetField;
      });
    }
    
    return false;
  }

  /**
   * Get performance metrics and recommendations
   */
  getPerformanceReport() {
    return {
      metrics: this.performanceMetrics,
      recommendations: this.getQueryOptimizationRecommendations(),
      indexingStrategies: Array.from(this.indexingStrategies.entries()).map(([model, strategies]) => ({
        model,
        strategiesCount: strategies.length,
        strategies: strategies.map(s => ({
          name: s.options.name,
          fields: s.fields,
          rationale: s.rationale
        }))
      }))
    };
  }

  /**
   * Run complete database optimization
   */
  async runCompleteOptimization() {
    try {
      logger.info('🚀 Starting complete database optimization...');
      
      const results = {
        startTime: new Date(),
        indexCreation: null,
        slowQueryAnalysis: null,
        indexAnalysis: null,
        cleanup: null,
        endTime: null,
        duration: null
      };

      // Create optimized indexes
      results.indexCreation = await this.createOptimizedIndexes();
      
      // Analyze existing indexes
      results.indexAnalysis = await this.analyzeIndexes();
      
      // Analyze slow queries
      results.slowQueryAnalysis = await this.optimizeSlowQueries();
      
      // Cleanup redundant indexes
      results.cleanup = await this.cleanupIndexes();
      
      results.endTime = new Date();
      results.duration = results.endTime - results.startTime;

      logger.info('✅ Complete database optimization finished', {
        duration: `${results.duration}ms`,
        indexesCreated: results.indexCreation.indexesCreated
      });

      return results;
    } catch (error) {
      logger.error('❌ Complete database optimization failed', { error: error.message });
      errorTracker.captureException(error, {
        tags: { operation: 'complete_database_optimization' }
      });
      throw error;
    }
  }
}

module.exports = new DatabaseOptimizer();