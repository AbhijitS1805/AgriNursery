# Quick Start Guide

## First Time Setup

### 1. Install PostgreSQL
If you don't have PostgreSQL installed:

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database User
```bash
# Login to PostgreSQL
psql postgres

# Create user (replace with your password)
CREATE USER agri_user WITH PASSWORD 'your_secure_password';
ALTER USER agri_user CREATEDB;
\q
```

### 3. Clone and Install
```bash
git clone <repository-url>
cd AgriNursery
npm run setup
```

### 4. Configure Environment
```bash
cd server
cp .env.example .env
nano .env  # Edit with your settings
```

### 5. Initialize Database
```bash
npm run db:init
```

### 6. Start Application
```bash
# From root directory
npm run dev
```

Visit http://localhost:3000

## Common Commands

```bash
# Install all dependencies
npm run setup

# Start development servers
npm run dev

# Start backend only
npm run server

# Start frontend only
npm run client

# Initialize/Reset database
npm run db:init

# Build for production
npm run build

# Start production server
npm start
```

## Troubleshooting

### Database Connection Failed
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env` file
- Check database exists: `psql -l`

### Port Already in Use
- Backend (5000): Change PORT in `server/.env`
- Frontend (3000): Change port in `client/vite.config.js`

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules
rm -rf server/node_modules
rm -rf client/node_modules
npm run setup
```

## Next Steps

1. Login with default credentials (admin/admin123)
2. Create your first plant variety
3. Set up polyhouse infrastructure
4. Create a production batch
5. Explore the dashboard!

For detailed documentation, see [README.md](./README.md)
