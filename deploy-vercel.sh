#!/bin/bash

# Quick deployment script for Vercel (Frontend)
# Usage: ./deploy-vercel.sh

echo "🚀 Deploying Agri-Nursery Frontend to Vercel..."

cd client

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Get backend URL
echo ""
read -p "Enter your backend API URL (e.g., https://api.railway.app): " BACKEND_URL

# Create production environment file
echo "⚙️  Creating production environment..."
cat > .env.production << EOF
VITE_API_URL=${BACKEND_URL}/api
EOF

# Login to Vercel
echo "🔐 Logging in to Vercel..."
vercel login

# Deploy
echo "🚢 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Frontend deployed successfully!"
echo ""
echo "📱 Your app is now live!"
echo "   Frontend: Check Vercel dashboard for URL"
echo "   Backend: ${BACKEND_URL}"
echo ""
echo "🔧 Next steps:"
echo "   1. Test the frontend URL"
echo "   2. Login with your admin credentials"
echo "   3. Verify all features work"
echo ""
