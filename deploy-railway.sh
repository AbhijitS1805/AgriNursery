#!/bin/bash

# Quick deployment script for Railway
# Usage: ./deploy-railway.sh

echo "🚀 Deploying Agri-Nursery ERP to Railway..."

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for Railway deployment"
fi

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "🔐 Logging in to Railway..."
railway login

# Link or create project
echo "🔗 Linking to Railway project..."
railway link

# Add PostgreSQL if not exists
echo "🗄️  Checking for PostgreSQL..."
railway add --database postgres || echo "PostgreSQL already added"

# Set environment variables
echo "⚙️  Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set JWT_SECRET="0247c7d0c9815abe32e485a737acd94bd6906e6ab5366bbaf4ab8e3da0c4fe4998145fc5fda948098b003af5be4bfff9421cea85fecabd5f8924be349c1e4228"

# Deploy
echo "🚢 Deploying to Railway..."
railway up

# Run migrations
echo "🔄 Running database migrations..."
railway run bash -c 'cd server && for f in database/migrations/*.sql; do psql $DATABASE_URL -f "$f"; done'

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📱 Your API is now live. Get the URL:"
echo "   railway status"
echo ""
echo "🔑 Create an admin user:"
echo "   railway run bash -c 'cd server && node scripts/create-admin.js'"
echo ""
echo "📊 View logs:"
echo "   railway logs"
echo ""
