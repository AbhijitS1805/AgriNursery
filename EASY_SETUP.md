# 🚀 Easy Setup Guide - Agri-Nursery ERP

## The Easiest Way to Get Started

### Option 1: Automated Setup (Recommended) ⚡

```bash
# 1. Open Terminal and navigate to the project
cd /Users/abhijit.shahane/Code/zendesk/AgriNursery

# 2. Make the setup script executable
chmod +x easy-setup.sh

# 3. Run the setup script
./easy-setup.sh

# 4. Start the application
npm run dev

# 5. Open browser to http://localhost:3000
```

That's it! The script will:
- ✅ Check if Node.js and PostgreSQL are installed
- ✅ Install all dependencies automatically
- ✅ Ask for your database credentials
- ✅ Create configuration file
- ✅ Initialize the database with all tables and seed data
- ✅ Everything ready to use!

---

### Option 2: Manual Setup (Step-by-Step) 📝

If the automated script doesn't work, follow these steps:

#### Step 1: Install Prerequisites

**Install Node.js 18+**
```bash
# macOS
brew install node

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install nodejs npm

# Windows
# Download from https://nodejs.org/
```

**Install PostgreSQL 14+**
```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/
```

#### Step 2: Install Project Dependencies

```bash
# Navigate to project folder
cd /Users/abhijit.shahane/Code/zendesk/AgriNursery

# Install all dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

#### Step 3: Configure Database

Create and edit the configuration file:

```bash
cd server
cp .env.example .env
nano .env  # or use any text editor
```

Edit these values in `server/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agri_nursery_erp
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=change_this_to_a_random_secret
```

#### Step 4: Initialize Database

```bash
# From the server directory
npm run db:init

# Or from root directory
cd /Users/abhijit.shahane/Code/zendesk/AgriNursery
npm run db:init
```

#### Step 5: Start the Application

```bash
# From root directory
npm run dev
```

#### Step 6: Access the Application

Open your browser and go to:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api

**Login with:**
- Username: `admin`
- Password: `admin123`

---

## 🆘 Troubleshooting Common Issues

### Issue 1: "PostgreSQL not found" or "psql: command not found"

**Solution:**
```bash
# macOS - Install PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql
sudo systemctl start postgresql

# Check if it's running
pg_isready
```

### Issue 2: "Database connection failed"

**Solution:**
```bash
# Test PostgreSQL connection
psql -h localhost -U postgres

# If it asks for password, use the one you set during PostgreSQL installation
# If you forgot the password, reset it:

# macOS
psql postgres
ALTER USER postgres PASSWORD 'new_password';

# Ubuntu
sudo -u postgres psql
ALTER USER postgres PASSWORD 'new_password';
```

### Issue 3: "Port 5000 or 3000 already in use"

**Solution:**

**Option A - Kill the process:**
```bash
# Find process on port 5000
lsof -ti:5000 | xargs kill -9

# Find process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Option B - Change the port:**
```bash
# Edit server/.env
PORT=5001  # Change backend port

# Edit client/vite.config.js
server: {
  port: 3001,  // Change frontend port
}
```

### Issue 4: "Module not found" errors

**Solution:**
```bash
# Delete all node_modules and reinstall
rm -rf node_modules
rm -rf server/node_modules
rm -rf client/node_modules
npm run setup
```

### Issue 5: Database initialization fails

**Solution:**
```bash
# Manually create database
psql -U postgres

# In PostgreSQL prompt:
CREATE DATABASE agri_nursery_erp;
\q

# Then run init script again
npm run db:init
```

### Issue 6: "Cannot connect to database - authentication failed"

**Solution:**

Edit `server/.env` and ensure credentials match your PostgreSQL setup:
```env
DB_USER=postgres
DB_PASSWORD=your_actual_password
```

Test connection:
```bash
psql -h localhost -U postgres -d postgres
```

---

## ✅ Quick Verification Checklist

After setup, verify everything is working:

- [ ] Can access http://localhost:3000 (shows login page)
- [ ] Can login with admin/admin123
- [ ] Dashboard shows statistics
- [ ] Can navigate to Batches page
- [ ] Can navigate to Inventory page
- [ ] Backend API responds at http://localhost:5000/health

---

## 🎯 Next Steps After Setup

1. **Explore the Dashboard**
   - View key metrics
   - Check system alerts

2. **Create Your First Batch**
   - Go to Batches → New Batch
   - Fill in batch details
   - Track through lifecycle

3. **Set Up Inventory Items**
   - Go to Inventory → Add Item
   - Create your consumables (fertilizers, pots, etc.)

4. **Configure Polyhouses**
   - Go to Polyhouses
   - View capacity utilization

5. **Create Tasks**
   - Go to Tasks → New Task
   - Schedule recurring activities

---

## 📞 Still Need Help?

### Check the Documentation

1. **README.md** - Comprehensive guide
2. **API_EXAMPLES.md** - API usage examples
3. **ARCHITECTURE.md** - System design details

### Common Commands

```bash
# Start development servers
npm run dev

# Start only backend
npm run server

# Start only frontend
npm run client

# Reinitialize database (⚠️ deletes all data)
npm run db:init

# Build for production
npm run build

# Start production server
npm start
```

---

## 🎓 Video Tutorial (Steps)

If you prefer visual guidance, here's what the setup looks like:

1. **Terminal Setup (2 minutes)**
   - Clone/download project
   - Install dependencies
   - Configure database

2. **Database Initialization (1 minute)**
   - Run init script
   - Verify tables created

3. **Start Application (30 seconds)**
   - Run npm run dev
   - Open browser

4. **First Login (1 minute)**
   - Login with default credentials
   - Explore dashboard

**Total Time: ~5 minutes from zero to running!**

---

## 💡 Pro Tips

1. **Use the automated setup** - It's the fastest way
2. **Keep PostgreSQL running** - Start it on system boot
3. **Use a database GUI** - Tools like pgAdmin or DBeaver help visualize data
4. **Enable auto-save** - In your code editor for faster development
5. **Use two terminal windows** - One for backend logs, one for frontend

---

## 🔒 Security Reminder

**Before going to production:**

- [ ] Change admin password
- [ ] Update JWT_SECRET in .env
- [ ] Enable HTTPS
- [ ] Set up automated backups
- [ ] Configure firewall rules
- [ ] Review all default settings

---

## 🌱 You're Ready!

The setup should take **less than 5 minutes** with the automated script!

**Happy Growing! 🚀**

Need more help? Check the other documentation files in the project root.
