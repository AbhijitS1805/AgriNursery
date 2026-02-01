#!/bin/bash

###############################################################################
# Database Backup Script for Agri-Nursery ERP
# Creates automated PostgreSQL backups with retention policy
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
DB_NAME="${DB_NAME:-agri_nursery_erp}"
DB_USER="${DB_USER:-$(whoami)}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/agri-nursery}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="agri_nursery_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Create backup directory if it doesn't exist
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Check if PostgreSQL is running
check_postgres() {
    log "Checking PostgreSQL connection..."
    if ! psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        error "Cannot connect to PostgreSQL database: $DB_NAME"
        exit 1
    fi
    success "PostgreSQL connection verified"
}

# Create backup
create_backup() {
    log "Starting backup of database: $DB_NAME"
    
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
    
    # Perform backup with pg_dump
    if pg_dump -U "$DB_USER" -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists | gzip > "$BACKUP_PATH"; then
        
        BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        success "Backup created: $BACKUP_FILE (Size: $BACKUP_SIZE)"
        
        # Create a 'latest' symlink
        ln -sf "$BACKUP_FILE" "${BACKUP_DIR}/latest.sql.gz"
        
        return 0
    else
        error "Backup failed"
        return 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    DELETED_COUNT=$(find "$BACKUP_DIR" -name "agri_nursery_backup_*.sql.gz" \
        -type f -mtime +$RETENTION_DAYS -delete -print | wc -l)
    
    if [ "$DELETED_COUNT" -gt 0 ]; then
        success "Deleted $DELETED_COUNT old backup(s)"
    else
        log "No old backups to delete"
    fi
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity..."
    
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
    
    if gunzip -t "$BACKUP_PATH" 2>/dev/null; then
        success "Backup integrity verified"
        return 0
    else
        error "Backup integrity check failed"
        return 1
    fi
}

# Send notification (optional - implement your notification method)
send_notification() {
    local status=$1
    local message=$2
    
    # TODO: Implement notification (email, Slack, etc.)
    # Example for mail:
    # echo "$message" | mail -s "Backup $status: Agri-Nursery ERP" admin@example.com
    
    log "Notification: $status - $message"
}

# Get backup statistics
show_backup_stats() {
    log "Backup Statistics:"
    echo "=================="
    echo "Backup Directory: $BACKUP_DIR"
    echo "Total Backups: $(find "$BACKUP_DIR" -name "agri_nursery_backup_*.sql.gz" | wc -l)"
    echo "Total Size: $(du -sh "$BACKUP_DIR" | cut -f1)"
    echo "Oldest Backup: $(find "$BACKUP_DIR" -name "agri_nursery_backup_*.sql.gz" -type f -printf '%T+ %p\n' | sort | head -n1 | cut -d' ' -f2- | xargs basename 2>/dev/null || echo 'None')"
    echo "Latest Backup: $(find "$BACKUP_DIR" -name "agri_nursery_backup_*.sql.gz" -type f -printf '%T+ %p\n' | sort | tail -n1 | cut -d' ' -f2- | xargs basename 2>/dev/null || echo 'None')"
    echo "=================="
}

# Main execution
main() {
    log "=== Starting Agri-Nursery Database Backup ==="
    
    create_backup_dir
    check_postgres
    
    if create_backup; then
        if verify_backup; then
            cleanup_old_backups
            show_backup_stats
            send_notification "SUCCESS" "Database backup completed successfully"
            success "Backup process completed"
            exit 0
        else
            send_notification "FAILED" "Backup verification failed"
            error "Backup verification failed"
            exit 1
        fi
    else
        send_notification "FAILED" "Backup creation failed"
        error "Backup creation failed"
        exit 1
    fi
}

# Run main function
main "$@"
