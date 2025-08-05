/**
 * Database Backup Routes
 * Endpoints for database backup and restore operations
 */

const express = require('express');
const router = express.Router();
const backupManager = require('../utils/backupManager');
const logger = require('../utils/logger');

// Get backup status and configuration
router.get('/status', async (req, res) => {
  try {
    const status = backupManager.getStatus();
    
    res.status(200).json({
      ...status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Backup status endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to get backup status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// List all available backups
router.get('/list', async (req, res) => {
  try {
    const backups = await backupManager.listBackups();
    
    res.status(200).json({
      backups,
      count: backups.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('List backups endpoint failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to list backups',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Create a full database backup
router.post('/create/full', async (req, res) => {
  try {
    const { name } = req.body;
    const options = { name };
    
    logger.info('Creating full backup via API', { name });
    
    const result = await backupManager.createFullBackup(options);
    
    res.status(201).json({
      ...result,
      message: 'Full backup created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Full backup creation failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to create full backup',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Create backup of specific collections
router.post('/create/collections', async (req, res) => {
  try {
    const { collections, name } = req.body;
    
    if (!collections || !Array.isArray(collections) || collections.length === 0) {
      return res.status(400).json({
        error: 'Invalid collections parameter',
        message: 'Collections must be a non-empty array',
        timestamp: new Date().toISOString()
      });
    }
    
    const options = { name };
    
    logger.info('Creating collections backup via API', { collections, name });
    
    const result = await backupManager.createCollectionBackup(collections, options);
    
    res.status(201).json({
      ...result,
      message: 'Collections backup created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Collections backup creation failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to create collections backup',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Restore database from backup
router.post('/restore/:backupName', async (req, res) => {
  try {
    const { backupName } = req.params;
    const { drop = false } = req.body;
    
    logger.info('Restoring backup via API', { backupName, drop });
    
    // Add warning for production environment
    if (process.env.NODE_ENV === 'production' && !req.body.confirmProduction) {
      return res.status(400).json({
        error: 'Production restore requires confirmation',
        message: 'Set confirmProduction: true in request body to restore in production',
        timestamp: new Date().toISOString()
      });
    }
    
    const result = await backupManager.restoreBackup(backupName, { drop });
    
    res.status(200).json({
      ...result,
      message: 'Database restored successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Database restore failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to restore database',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Verify backup integrity
router.get('/verify/:backupName', async (req, res) => {
  try {
    const { backupName } = req.params;
    
    const verification = await backupManager.verifyBackup(backupName);
    
    const statusCode = verification.integrity === 'good' ? 200 : 
                      verification.integrity === 'questionable' ? 200 : 503;
    
    res.status(statusCode).json({
      verification,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Backup verification failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to verify backup',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Clean up old backups
router.post('/cleanup', async (req, res) => {
  try {
    logger.info('Starting backup cleanup via API');
    
    const result = await backupManager.cleanupOldBackups();
    
    res.status(200).json({
      ...result,
      message: 'Backup cleanup completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Backup cleanup failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to cleanup backups',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Schedule automatic backups
router.post('/schedule', async (req, res) => {
  try {
    const { full, cleanup } = req.body;
    
    const config = {};
    if (full) config.full = full;
    if (cleanup) config.cleanup = cleanup;
    
    logger.info('Scheduling backups via API', config);
    
    const result = backupManager.scheduleBackups(config);
    
    res.status(200).json({
      ...result,
      message: 'Backup scheduling configured',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Backup scheduling failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to schedule backups',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Stop scheduled backups
router.post('/schedule/stop', async (req, res) => {
  try {
    backupManager.stopScheduledBackups();
    
    res.status(200).json({
      success: true,
      message: 'All scheduled backup jobs stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to stop scheduled backups', { error: error.message });
    res.status(500).json({
      error: 'Failed to stop scheduled backups',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Delete a specific backup
router.delete('/:backupName', async (req, res) => {
  try {
    const { backupName } = req.params;
    
    // Add safety check for production
    if (process.env.NODE_ENV === 'production' && !req.body.confirmDelete) {
      return res.status(400).json({
        error: 'Production deletion requires confirmation',
        message: 'Set confirmDelete: true in request body to delete backup in production',
        timestamp: new Date().toISOString()
      });
    }
    
    const fs = require('fs').promises;
    const path = require('path');
    
    const backupPath = path.join(backupManager.backupDir, backupName);
    
    // Verify backup exists
    try {
      await fs.stat(backupPath);
    } catch (error) {
      return res.status(404).json({
        error: 'Backup not found',
        message: `Backup '${backupName}' does not exist`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Delete backup directory
    await fs.rm(backupPath, { recursive: true, force: true });
    
    logger.info(`Backup deleted via API: ${backupName}`);
    
    res.status(200).json({
      success: true,
      backupName,
      message: 'Backup deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Backup deletion failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to delete backup',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get backup details
router.get('/:backupName', async (req, res) => {
  try {
    const { backupName } = req.params;
    const backups = await backupManager.listBackups();
    
    const backup = backups.find(b => b.name === backupName);
    
    if (!backup) {
      return res.status(404).json({
        error: 'Backup not found',
        message: `Backup '${backupName}' does not exist`,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(200).json({
      backup,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get backup details', { error: error.message });
    res.status(500).json({
      error: 'Failed to get backup details',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;