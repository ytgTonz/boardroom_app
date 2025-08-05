/**
 * Database Backup Manager
 * Automated backup and restore functionality for MongoDB
 */

const mongoose = require('mongoose');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
const logger = require('./logger');
const errorTracker = require('./sentryConfig');

class BackupManager {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
    this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 7; // Keep 7 days of backups
    this.compressionEnabled = process.env.BACKUP_COMPRESSION !== 'false';
    this.scheduledJobs = new Map();
    
    this.backupTypes = {
      FULL: 'full',
      INCREMENTAL: 'incremental',
      COLLECTIONS: 'collections'
    };

    this.initializeBackupDirectory();
  }

  async initializeBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.info(`📁 Backup directory initialized: ${this.backupDir}`);
    } catch (error) {
      logger.error('Failed to initialize backup directory', { error: error.message });
      errorTracker.captureException(error, {
        tags: { operation: 'backup_init' }
      });
    }
  }

  /**
   * Create a full database backup
   */
  async createFullBackup(options = {}) {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = options.name || `full-backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      logger.info('🔄 Starting full database backup...', { backupName });

      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });

      // Get MongoDB connection details
      const mongoUri = process.env.MONGODB_URI || mongoose.connection.client.s.url;
      const dbName = mongoose.connection.db.databaseName;

      // Create mongodump command
      const dumpArgs = [
        '--uri', mongoUri,
        '--out', backupPath
      ];

      if (this.compressionEnabled) {
        dumpArgs.push('--gzip');
      }

      // Execute mongodump
      const result = await this.executeCommand('mongodump', dumpArgs);

      // Create metadata file
      const metadata = {
        backupName,
        type: this.backupTypes.FULL,
        timestamp: new Date().toISOString(),
        database: dbName,
        compressed: this.compressionEnabled,
        size: await this.calculateDirectorySize(backupPath),
        duration: Date.now() - startTime,
        collections: await this.getCollectionList(),
        mongoVersion: (await mongoose.connection.db.admin().buildInfo()).version
      };

      await fs.writeFile(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      logger.info('✅ Full database backup completed successfully', {
        backupName,
        duration: `${Date.now() - startTime}ms`,
        size: this.formatBytes(metadata.size)
      });

      errorTracker.addBreadcrumb({
        category: 'backup',
        message: 'Full backup completed',
        level: 'info',
        data: { backupName, duration: metadata.duration }
      });

      return {
        success: true,
        backupName,
        path: backupPath,
        metadata
      };
    } catch (error) {
      logger.error('❌ Full database backup failed', {
        backupName,
        error: error.message,
        duration: `${Date.now() - startTime}ms`
      });

      errorTracker.captureException(error, {
        tags: { operation: 'full_backup' },
        extra: { backupName }
      });

      throw error;
    }
  }

  /**
   * Create backup of specific collections
   */
  async createCollectionBackup(collections, options = {}) {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = options.name || `collections-backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      logger.info('🔄 Starting collections backup...', { 
        backupName, 
        collections: collections.join(', ') 
      });

      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });

      const mongoUri = process.env.MONGODB_URI || mongoose.connection.client.s.url;
      const dbName = mongoose.connection.db.databaseName;

      const backupResults = [];

      // Backup each collection individually
      for (const collection of collections) {
        try {
          const collectionPath = path.join(backupPath, collection);
          await fs.mkdir(collectionPath, { recursive: true });

          const dumpArgs = [
            '--uri', mongoUri,
            '--collection', collection,
            '--out', collectionPath
          ];

          if (this.compressionEnabled) {
            dumpArgs.push('--gzip');
          }

          await this.executeCommand('mongodump', dumpArgs);
          
          const collectionSize = await this.calculateDirectorySize(collectionPath);
          backupResults.push({
            name: collection,
            size: collectionSize,
            success: true
          });

          logger.debug(`Collection ${collection} backed up successfully`);
        } catch (error) {
          logger.error(`Failed to backup collection ${collection}`, { error: error.message });
          backupResults.push({
            name: collection,
            error: error.message,
            success: false
          });
        }
      }

      // Create metadata file
      const metadata = {
        backupName,
        type: this.backupTypes.COLLECTIONS,
        timestamp: new Date().toISOString(),
        database: dbName,
        collections: backupResults,
        compressed: this.compressionEnabled,
        totalSize: await this.calculateDirectorySize(backupPath),
        duration: Date.now() - startTime,
        successful: backupResults.filter(r => r.success).length,
        failed: backupResults.filter(r => !r.success).length
      };

      await fs.writeFile(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      logger.info('✅ Collections backup completed', {
        backupName,
        successful: metadata.successful,
        failed: metadata.failed,
        duration: `${Date.now() - startTime}ms`
      });

      return {
        success: true,
        backupName,
        path: backupPath,
        metadata
      };
    } catch (error) {
      logger.error('❌ Collections backup failed', {
        backupName,
        error: error.message
      });

      errorTracker.captureException(error, {
        tags: { operation: 'collections_backup' },
        extra: { backupName, collections }
      });

      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupName, options = {}) {
    const startTime = Date.now();
    const backupPath = path.join(this.backupDir, backupName);

    try {
      logger.info('🔄 Starting database restore...', { backupName });

      // Verify backup exists
      const metadataPath = path.join(backupPath, 'metadata.json');
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      logger.info('Backup metadata loaded', {
        type: metadata.type,
        originalTimestamp: metadata.timestamp,
        collections: metadata.collections?.length || 'all'
      });

      const mongoUri = process.env.MONGODB_URI || mongoose.connection.client.s.url;

      // Create mongorestore command
      const restoreArgs = [
        '--uri', mongoUri
      ];

      if (options.drop) {
        restoreArgs.push('--drop');
      }

      if (metadata.compressed) {
        restoreArgs.push('--gzip');
      }

      // Add backup directory
      restoreArgs.push(path.join(backupPath, metadata.database || mongoose.connection.db.databaseName));

      // Execute mongorestore
      await this.executeCommand('mongorestore', restoreArgs);

      const duration = Date.now() - startTime;

      logger.info('✅ Database restore completed successfully', {
        backupName,
        duration: `${duration}ms`
      });

      errorTracker.addBreadcrumb({
        category: 'backup',
        message: 'Database restore completed',
        level: 'info',
        data: { backupName, duration }
      });

      return {
        success: true,
        backupName,
        metadata,
        duration
      };
    } catch (error) {
      logger.error('❌ Database restore failed', {
        backupName,
        error: error.message
      });

      errorTracker.captureException(error, {
        tags: { operation: 'restore_backup' },
        extra: { backupName }
      });

      throw error;
    }
  }

  /**
   * List all available backups
   */
  async listBackups() {
    try {
      const backups = [];
      const entries = await fs.readdir(this.backupDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const metadataPath = path.join(this.backupDir, entry.name, 'metadata.json');
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);

            backups.push({
              name: entry.name,
              ...metadata,
              path: path.join(this.backupDir, entry.name)
            });
          } catch (error) {
            // If metadata doesn't exist, add basic info
            const stats = await fs.stat(path.join(this.backupDir, entry.name));
            backups.push({
              name: entry.name,
              timestamp: stats.ctime.toISOString(),
              size: await this.calculateDirectorySize(path.join(this.backupDir, entry.name)),
              type: 'unknown',
              hasMetadata: false
            });
          }
        }
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return backups;
    } catch (error) {
      logger.error('Failed to list backups', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete old backups based on retention policy
   */
  async cleanupOldBackups() {
    try {
      logger.info('🧹 Starting backup cleanup...');

      const backups = await this.listBackups();
      
      if (backups.length <= this.maxBackups) {
        logger.info('No cleanup needed', { 
          currentBackups: backups.length, 
          maxBackups: this.maxBackups 
        });
        return { deleted: 0, kept: backups.length };
      }

      const backupsToDelete = backups.slice(this.maxBackups);
      let deletedCount = 0;

      for (const backup of backupsToDelete) {
        try {
          await fs.rm(backup.path, { recursive: true, force: true });
          deletedCount++;
          logger.info(`Deleted old backup: ${backup.name}`);
        } catch (error) {
          logger.error(`Failed to delete backup ${backup.name}`, { error: error.message });
        }
      }

      logger.info('✅ Backup cleanup completed', {
        deleted: deletedCount,
        kept: backups.length - deletedCount
      });

      return {
        deleted: deletedCount,
        kept: backups.length - deletedCount
      };
    } catch (error) {
      logger.error('Backup cleanup failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Schedule automatic backups using cron
   */
  scheduleBackups(config = {}) {
    const defaultConfig = {
      full: '0 2 * * *', // Daily at 2 AM
      cleanup: '0 3 * * 0' // Weekly cleanup on Sunday at 3 AM
    };

    const scheduleConfig = { ...defaultConfig, ...config };

    try {
      // Schedule full backups
      if (scheduleConfig.full) {
        const fullBackupJob = cron.schedule(scheduleConfig.full, async () => {
          try {
            logger.info('⏰ Scheduled full backup starting...');
            await this.createFullBackup({ name: `scheduled-full-${Date.now()}` });
          } catch (error) {
            logger.error('Scheduled full backup failed', { error: error.message });
            errorTracker.captureException(error, {
              tags: { operation: 'scheduled_backup' }
            });
          }
        }, {
          scheduled: false,
          timezone: process.env.TZ || 'UTC'
        });

        this.scheduledJobs.set('full_backup', fullBackupJob);
        fullBackupJob.start();
        logger.info('📅 Full backup scheduled', { cron: scheduleConfig.full });
      }

      // Schedule cleanup
      if (scheduleConfig.cleanup) {
        const cleanupJob = cron.schedule(scheduleConfig.cleanup, async () => {
          try {
            logger.info('⏰ Scheduled cleanup starting...');
            await this.cleanupOldBackups();
          } catch (error) {
            logger.error('Scheduled cleanup failed', { error: error.message });
          }
        }, {
          scheduled: false,
          timezone: process.env.TZ || 'UTC'
        });

        this.scheduledJobs.set('cleanup', cleanupJob);
        cleanupJob.start();
        logger.info('📅 Backup cleanup scheduled', { cron: scheduleConfig.cleanup });
      }

      return {
        success: true,
        jobs: Array.from(this.scheduledJobs.keys())
      };
    } catch (error) {
      logger.error('Failed to schedule backups', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop scheduled backup jobs
   */
  stopScheduledBackups() {
    for (const [name, job] of this.scheduledJobs) {
      job.stop();
      logger.info(`Stopped scheduled job: ${name}`);
    }
    this.scheduledJobs.clear();
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      const metadataPath = path.join(backupPath, 'metadata.json');

      // Check if metadata exists and is valid
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      // Check if backup files exist
      const backupExists = await fs.stat(backupPath);
      
      // Calculate current size and compare with metadata
      const currentSize = await this.calculateDirectorySize(backupPath);
      const sizeDifference = Math.abs(currentSize - metadata.size);
      const sizeVariancePercentage = (sizeDifference / metadata.size) * 100;

      const verification = {
        backupName,
        exists: true,
        metadataValid: true,
        originalSize: metadata.size,
        currentSize,
        sizeVariance: sizeVariancePercentage,
        integrity: sizeVariancePercentage < 5 ? 'good' : 'questionable', // 5% tolerance
        timestamp: metadata.timestamp,
        type: metadata.type
      };

      logger.info('Backup verification completed', verification);
      return verification;
    } catch (error) {
      logger.error(`Backup verification failed for ${backupName}`, { error: error.message });
      return {
        backupName,
        exists: false,
        error: error.message,
        integrity: 'failed'
      };
    }
  }

  // Helper methods
  async executeCommand(command, args) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async calculateDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          totalSize += await this.calculateDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      logger.warn(`Could not calculate size for ${dirPath}`, { error: error.message });
    }
    
    return totalSize;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getCollectionList() {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      return collections.map(col => col.name);
    } catch (error) {
      logger.warn('Could not get collection list', { error: error.message });
      return [];
    }
  }

  getStatus() {
    return {
      backupDirectory: this.backupDir,
      maxBackups: this.maxBackups,
      compressionEnabled: this.compressionEnabled,
      scheduledJobs: Array.from(this.scheduledJobs.keys()),
      backupTypes: Object.values(this.backupTypes)
    };
  }
}

module.exports = new BackupManager();