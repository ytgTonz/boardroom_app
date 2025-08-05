#!/bin/sh
# MongoDB Backup Script for Docker Container
# Automated backup with rotation and cleanup

set -e

# Configuration
BACKUP_DIR="/backups"
DB_NAME="boardroom_booking"
RETENTION_DAYS=${BACKUP_RETENTION:-7}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="backup_${TIMESTAMP}"

# Ensure backup directory exists
mkdir -p ${BACKUP_DIR}

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to create backup
create_backup() {
    log "Starting MongoDB backup: ${BACKUP_NAME}"
    
    # Create backup using mongodump
    mongodump \
        --uri="${MONGODB_URI}" \
        --out="${BACKUP_DIR}/${BACKUP_NAME}" \
        --gzip
    
    if [ $? -eq 0 ]; then
        log "Backup completed successfully: ${BACKUP_NAME}"
        
        # Create metadata file
        cat > "${BACKUP_DIR}/${BACKUP_NAME}/metadata.json" << EOF
{
    "backupName": "${BACKUP_NAME}",
    "timestamp": "$(date -Iseconds)",
    "database": "${DB_NAME}",
    "compressed": true,
    "type": "full",
    "retentionDays": ${RETENTION_DAYS}
}
EOF
        
        # Calculate backup size
        BACKUP_SIZE=$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}" | cut -f1)
        log "Backup size: ${BACKUP_SIZE}"
        
        return 0
    else
        log "ERROR: Backup failed"
        return 1
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Starting cleanup of backups older than ${RETENTION_DAYS} days"
    
    # Find and remove backups older than retention period
    find "${BACKUP_DIR}" -name "backup_*" -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} + 2>/dev/null || true
    
    # Count remaining backups
    REMAINING_BACKUPS=$(find "${BACKUP_DIR}" -name "backup_*" -type d | wc -l)
    log "Cleanup completed. Remaining backups: ${REMAINING_BACKUPS}"
}

# Function to verify backup
verify_backup() {
    local backup_path="${BACKUP_DIR}/${BACKUP_NAME}"
    
    if [ -d "${backup_path}" ] && [ -f "${backup_path}/metadata.json" ]; then
        log "Backup verification: PASSED"
        return 0
    else
        log "Backup verification: FAILED"
        return 1
    fi
}

# Main execution
main() {
    log "MongoDB backup script started"
    log "Configuration: DB=${DB_NAME}, Retention=${RETENTION_DAYS} days"
    
    # Check if MongoDB is accessible
    mongosh --eval "db.admin.ping()" "${MONGODB_URI}" > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        log "ERROR: Cannot connect to MongoDB"
        exit 1
    fi
    
    # Create backup
    if create_backup; then
        # Verify backup
        if verify_backup; then
            # Cleanup old backups
            cleanup_old_backups
            log "Backup process completed successfully"
        else
            log "ERROR: Backup verification failed"
            exit 1
        fi
    else
        log "ERROR: Backup creation failed"
        exit 1
    fi
}

# Handle signals for graceful shutdown
trap 'log "Backup script interrupted"; exit 1' INT TERM

# Run backup if called directly
if [ "${1}" = "backup" ]; then
    main
    exit 0
fi

# Setup cron job if BACKUP_SCHEDULE is provided
if [ -n "${BACKUP_SCHEDULE}" ]; then
    log "Setting up scheduled backups with cron: ${BACKUP_SCHEDULE}"
    
    # Create crontab entry
    echo "${BACKUP_SCHEDULE} /backup-script.sh backup >> /var/log/backup.log 2>&1" > /etc/crontabs/root
    
    # Start cron daemon
    log "Starting cron daemon for scheduled backups"
    exec crond -f -l 2
else
    # Run backup once and exit
    main
fi