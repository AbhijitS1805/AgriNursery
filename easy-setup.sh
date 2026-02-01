#!/bin/bash

# ========================================
# Agri-Nursery ERP - One-Click Setup
# ========================================

echo "🌱 Agri-Nursery ERP - Easy Setup"
echo "================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first:"
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Please install PostgreSQL 14+:"
    echo "   macOS: brew install postgresql@14"
    echo "   Ubuntu: sudo apt-get install postgresql"
    exit 1
fi

echo "✅ PostgreSQL found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install --silent
cd server && npm install --silent && cd ..
cd client && npm install --silent && cd ..
echo "✅ Dependencies installed"
echo ""

# Setup .env file
if [ ! -f server/.env ]; then
    echo "⚙️  Setting up configuration..."
    
    # Get database credentials
    echo ""
    echo "Please enter your PostgreSQL credentials:"
    read -p "Database Host [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "Database Port [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    
    read -p "Database Name [agri_nursery_erp]: " DB_NAME
    DB_NAME=${DB_NAME:-agri_nursery_erp}
    
    read -p "Database User [postgres]: " DB_USER
    DB_USER=${DB_USER:-postgres}
    
    read -sp "Database Password: " DB_PASSWORD
    echo ""
    
    # Create .env file
    cat > server/.env << EOF
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# JWT Secret
JWT_SECRET=$(openssl rand -base64 32)

# App Configuration
CORS_ORIGIN=http://localhost:3000
EOF
    
    echo "✅ Configuration saved to server/.env"
else
    echo "⚠️  server/.env already exists, using existing configuration"
fi

echo ""
echo "🗄️  Initializing database..."
cd server
node scripts/initDatabase.js
cd ..
echo ""

echo "========================================="
echo "🎉 Setup Complete!"
echo "========================================="
echo ""
echo "To start the application:"
echo "  npm run dev"
echo ""
echo "Then open in browser:"
echo "  http://localhost:3000"
echo ""
echo "Default login:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "🌱 Happy Growing!"
