#!/bin/bash

###############################################################################
# Database Restore Script for Agri-Nursery ERP
# Restores PostgreSQL database from backup files
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
DB_NAME="${DB_NAME:-agri_nursery_erp}"
DB_USER="${DB_USER:-$(whoami)}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/agri-nursery}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

error() { echo -e "${RED}[ERROR]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"; }

# Show usage
usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Restore Agri-Nursery ERP database from backup

OPTIONS:
    -f, --file FILE     Backup file to restore from
    -l, --latest        Restore from latest backup
    --list              List available backups
    -h, --help          Show this help message

EXAMPLES:
    $0 --latest                              # Restore from latest backup
    $0 -f agri_nursery_backup_20260131.sql.gz  # Restore specific backup
    $0 --list                                # List all backups

EOF
}

# List available backups
list_backups() {
    log "Available backups in $BACKUP_DIR:"
    echo "=================================="
    
    find "$BACKUP_DIR" -name "agri_nursery_backup_*.sql.gz" -type f -printf '%T+ %p\n' | \
        sort -r | \
        while read -r line; do
            date=$(echo "$line" | awk '{print $1}')
            file=$(echo "$line" | awk '{print $2}')
            size=$(du -h "$file" | cut -f1)
            echo "$(basename "$file") - $date - Size: $size"
        done
    
    echo "=================================="
}

# Restore from backup
restore_backup() {
    local backup_file=$1
    
    # Check if file exists
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi
    
    warn "⚠️  WARNING: This will COMPLETELY REPLACE the current database!"
    warn "Database: $DB_NAME"
    warn "Backup file: $(basename "$backup_file")"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled by user"
        exit 0
    fi
    
    log "Starting database restore..."
    
    # Drop existing connections
    log "Terminating existing connections..."
    psql -U "$DB_USER" -d postgres -c "
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '$DB_NAME'
        AND pid <> pg_backend_pid();
    " 2>/dev/null || true
    
    # Restore database
    log "Restoring database from backup..."
    if gunzip -c "$backup_file" | psql -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        success "Database restored successfully"
        
        # Verify restoration
        log "Verifying database..."
        table_count=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
        success "Database contains $table_count tables"
        
        return 0
    else
        error "Database restoration failed"
        return 1
    fi
}

# Main execution
main() {
    local backup_file=""
    local use_latest=false
    local list_only=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--file)
                backup_file="$2"
                shift 2
                ;;
            -l|--latest)
                use_latest=true
                shift
                ;;
            --list)
                list_only=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # List backups if requested
    if [ "$list_only" = true ]; then
        list_backups
        exit 0
    fi
    
    # Determine backup file
    if [ "$use_latest" = true ]; then
        backup_file="${BACKUP_DIR}/latest.sql.gz"
        if [ ! -f "$backup_file" ]; then
            error "No latest backup found"
            exit 1
        fi
    elif [ -z "$backup_file" ]; then
        error "No backup file specified"
        usage
        exit 1
    elif [[ "$backup_file" != /* ]]; then
        # If relative path, assume it's in backup directory
        backup_file="${BACKUP_DIR}/${backup_file}"
    fi
    
    restore_backup "$backup_file"
}

main "$@"
