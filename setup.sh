#!/bin/bash

# Agri-Nursery ERP - Setup Script
# This script automates the initial setup process

set -e  # Exit on error

echo "🌱 Welcome to Agri-Nursery ERP Setup"
echo "===================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version) found${NC}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL not found in PATH${NC}"
    echo "Please ensure PostgreSQL 14+ is installed and running."
    echo "macOS: brew install postgresql@14"
    echo "Ubuntu: sudo apt-get install postgresql"
    read -p "Press Enter to continue if PostgreSQL is installed..."
fi

# Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo ""
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies
echo ""
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

# Setup environment file
echo ""
echo "⚙️  Setting up environment configuration..."
if [ ! -f server/.env ]; then
    cp server/.env.example server/.env
    echo -e "${GREEN}✅ Created server/.env file${NC}"
    echo -e "${YELLOW}⚠️  Please edit server/.env with your database credentials${NC}"
else
    echo -e "${YELLOW}⚠️  server/.env already exists, skipping...${NC}"
fi

# Database setup prompt
echo ""
echo "🗄️  Database Setup"
echo "=================="
echo "Before initializing the database, ensure:"
echo "1. PostgreSQL is running"
echo "2. You have database credentials"
echo "3. You've edited server/.env with correct settings"
echo ""
read -p "Have you configured server/.env? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Initialize database now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🔨 Initializing database..."
        cd server
        node scripts/initDatabase.js
        cd ..
        echo -e "${GREEN}✅ Database initialized successfully!${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping database initialization${NC}"
    echo "Run 'npm run db:init' after configuring server/.env"
fi

# Final instructions
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Edit server/.env if you haven't already"
echo "2. Initialize database: npm run db:init (if not done)"
echo "3. Start development: npm run dev"
echo ""
echo "Default login credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo "  ⚠️  CHANGE THESE IN PRODUCTION!"
echo ""
echo "Access points:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:5000"
echo "  API Docs: See API_EXAMPLES.md"
echo ""
echo -e "${GREEN}Happy Growing! 🌱${NC}"
