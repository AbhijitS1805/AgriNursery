# Production Deployment Guide
## Agri-Nursery ERP System

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Security Configuration](#security-configuration)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Security Requirements
- [ ] Change all default passwords
- [ ] Generate strong JWT_SECRET
- [ ] Configure SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Configure CORS for production domain
- [ ] Disable default admin account
- [ ] Create production admin user
- [ ] Review and update .env.production

### Infrastructure Requirements
- [ ] PostgreSQL 13+ installed
- [ ] Node.js 18+ installed
- [ ] Nginx installed (for reverse proxy)
- [ ] PM2 installed globally
- [ ] Backup storage configured
- [ ] Log rotation configured

### Application Requirements
- [ ] All environment variables configured
- [ ] Database migrations tested
- [ ] API endpoints tested
- [ ] Frontend build created
- [ ] Health checks working

---

## Environment Setup

### 1. System Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 4 GB
- Disk: 50 GB SSD
- OS: Ubuntu 22.04 LTS / CentOS 8 / RHEL 8

**Recommended:**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 100 GB SSD
- OS: Ubuntu 22.04 LTS

### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 15
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2

# Install build tools
sudo apt install -y build-essential
```

### 3. Configure Environment Variables

```bash
cd /var/www/agri-nursery/server

# Copy production environment template
cp .env.production .env

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" > jwt_secret.txt

# Edit .env with your production values
nano .env
```

**Required variables to update:**
- `JWT_SECRET` - Use generated secret from jwt_secret.txt
- `DB_PASSWORD` - Strong database password
- `CORS_ORIGIN` - Your production domain
- `ADMIN_EMAIL` - Your admin email
- `BACKUP_DIR` - Backup storage path

---

## Database Setup

### 1. Create PostgreSQL User and Database

```bash
sudo -u postgres psql

-- Create database user
CREATE USER agri_nursery_user WITH PASSWORD 'STRONG_PASSWORD_HERE';

-- Create database
CREATE DATABASE agri_nursery_erp OWNER agri_nursery_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE agri_nursery_erp TO agri_nursery_user;

-- Exit
\q
```

### 2. Run Migrations

```bash
cd /var/www/agri-nursery/server

# Run all migrations in order
for migration in database/migrations/*.sql; do
    echo "Running $migration..."
    psql -U agri_nursery_user -d agri_nursery_erp -f "$migration"
done
```

### 3. Create Production Admin User

```bash
# Use the create-admin script
node scripts/create-admin.js

# Follow prompts to create admin user
# Username: your-admin
# Email: admin@yourdomain.com
# Password: [strong password]
```

### 4. Disable Default Admin

```bash
psql -U agri_nursery_user -d agri_nursery_erp

-- Disable default admin
UPDATE users SET is_active = FALSE WHERE is_default_user = TRUE;

-- Verify security checks
SELECT * FROM v_production_security_checks;

-- Should show all PASS
\q
```

### 5. Configure Automated Backups

```bash
# Create backup directory
sudo mkdir -p /var/backups/agri-nursery
sudo chown agri_nursery_user:agri_nursery_user /var/backups/agri-nursery

# Test backup script
./scripts/backup-database.sh

# Schedule daily backups (cron)
crontab -e

# Add this line (backup daily at 2 AM):
0 2 * * * /var/www/agri-nursery/server/scripts/backup-database.sh >> /var/log/agri-backup.log 2>&1
```

---

## Application Deployment

### Method 1: Using PM2 (Recommended)

```bash
cd /var/www/agri-nursery/server

# Install dependencies
npm ci --only=production

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it outputs

# Check status
pm2 status
pm2 logs agri-nursery-api
```

### Method 2: Using Docker

```bash
cd /var/www/agri-nursery

# Build and start containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f api

# Run migrations
docker-compose exec api npm run migrate
```

### Frontend Deployment

```bash
cd /var/www/agri-nursery/client

# Install dependencies
npm ci

# Build for production
npm run build

# Output will be in dist/ folder
# Copy to nginx web root or configure nginx to serve from dist/
```

---

## Security Configuration

### 1. Nginx Configuration

```bash
# Copy nginx configuration
sudo cp /var/www/agri-nursery/server/nginx.conf /etc/nginx/sites-available/agri-nursery

# Update domain name in config
sudo nano /etc/nginx/sites-available/agri-nursery
# Replace 'yourdomain.com' with your actual domain

# Enable site
sudo ln -s /etc/nginx/sites-available/agri-nursery /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 2. SSL/TLS with Let's Encrypt

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Auto-renewal is configured via cron automatically
```

### 3. Firewall Configuration

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL (only from localhost)
sudo ufw allow from 127.0.0.1 to any port 5432

# Check status
sudo ufw status
```

### 4. Security Hardening

```bash
# Secure PostgreSQL
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Ensure 'local' connections use 'md5' or 'scram-sha-256'

# Restart PostgreSQL
sudo systemctl restart postgresql

# Set proper file permissions
cd /var/www/agri-nursery/server
chmod 600 .env
chmod 700 scripts/*.sh
chmod 755 logs/
```

---

## Monitoring & Maintenance

### 1. Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# Check health endpoint
curl http://localhost:5000/health
curl http://localhost:5000/health/detailed

# View logs
pm2 logs agri-nursery-api --lines 100

# Log rotation with PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 2. Database Monitoring

```bash
# Check database size
psql -U agri_nursery_user -d agri_nursery_erp -c "\l+"

# Check table sizes
psql -U agri_nursery_user -d agri_nursery_erp -c "
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Check active connections
psql -U agri_nursery_user -d agri_nursery_erp -c "
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE datname = 'agri_nursery_erp';
"
```

### 3. Backup Verification

```bash
# List backups
ls -lh /var/backups/agri-nursery/

# Test restore (on staging environment)
./scripts/restore-database.sh --list
./scripts/restore-database.sh --latest

# Verify backup integrity
gunzip -t /var/backups/agri-nursery/latest.sql.gz
```

### 4. Log Management

```bash
# Application logs
tail -f /var/www/agri-nursery/server/logs/combined.log
tail -f /var/www/agri-nursery/server/logs/error.log

# Nginx logs
tail -f /var/log/nginx/agri-nursery-access.log
tail -f /var/log/nginx/agri-nursery-error.log

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-15-main.log

# Configure log rotation
sudo nano /etc/logrotate.d/agri-nursery
```

---

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

```bash
# Check PM2 logs
pm2 logs agri-nursery-api --err --lines 50

# Check environment variables
pm2 env 0

# Verify database connection
psql -U agri_nursery_user -d agri_nursery_erp -c "SELECT 1;"

# Check port availability
sudo lsof -i :5000
```

#### 2. Database Connection Errors

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Verify credentials
psql -U agri_nursery_user -d agri_nursery_erp

# Check pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

#### 3. 502 Bad Gateway (Nginx)

```bash
# Check if application is running
pm2 status

# Check nginx error log
sudo tail -f /var/log/nginx/error.log

# Test upstream connection
curl http://localhost:5000/health

# Verify nginx configuration
sudo nginx -t
```

#### 4. High Memory Usage

```bash
# Check PM2 memory
pm2 status

# Restart application
pm2 restart agri-nursery-api

# Adjust max memory restart in ecosystem.config.js
# max_memory_restart: '500M'
```

#### 5. Slow Database Queries

```bash
# Enable slow query log
psql -U agri_nursery_user -d agri_nursery_erp

-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Analyze table
ANALYZE users;
ANALYZE batches;

-- Vacuum database
VACUUM ANALYZE;
```

---

## Emergency Procedures

### 1. Complete System Restart

```bash
# Stop application
pm2 stop all

# Restart PostgreSQL
sudo systemctl restart postgresql

# Restart Nginx
sudo systemctl restart nginx

# Start application
pm2 start ecosystem.config.js --env production

# Verify
curl http://localhost:5000/health
```

### 2. Database Recovery from Backup

```bash
# Stop application
pm2 stop all

# Restore database
./scripts/restore-database.sh --latest

# Verify data
psql -U agri_nursery_user -d agri_nursery_erp -c "SELECT COUNT(*) FROM users;"

# Start application
pm2 start all
```

### 3. Rollback Deployment

```bash
# If using PM2 deployment
pm2 deploy production revert 1

# Or manually
cd /var/www/agri-nursery
git reset --hard HEAD~1
npm ci --only=production
pm2 restart all
```

---

## Performance Optimization

### 1. Database Indexing

```sql
-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY abs(correlation) DESC;

-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_batches_status ON batches(status);
CREATE INDEX CONCURRENTLY idx_inventory_batch_id ON inventory(batch_id);
```

### 2. Application Caching

Consider adding Redis for session storage and caching:

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis in .env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. CDN for Static Assets

- Use CloudFlare or AWS CloudFront for static assets
- Configure CORS headers properly
- Enable browser caching

---

## Support & Contacts

**System Administrator:** ${ADMIN_EMAIL}  
**Support Email:** ${SUPPORT_EMAIL}  
**Emergency Contact:** [Your 24/7 contact]

**Documentation:**
- API Documentation: `/docs/AUTHENTICATION_GUIDE.md`
- User Manual: `/docs/USER_MANUAL.md`
- Database Schema: `/docs/DATABASE_SCHEMA.md`

---

## Deployment Checklist

Before going live:
- [ ] All security checks pass (`SELECT * FROM v_production_security_checks;`)
- [ ] Backups automated and tested
- [ ] SSL certificates valid
- [ ] Monitoring configured
- [ ] Health checks passing
- [ ] Load testing completed
- [ ] All default passwords changed
- [ ] Firewall configured
- [ ] Log rotation configured
- [ ] Emergency procedures documented
- [ ] Team trained on operations

**Date Deployed:** _____________  
**Deployed By:** _____________  
**Version:** _____________
