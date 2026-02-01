# Free Deployment Guide - Agri-Nursery ERP
**For Testing & Development**

## Overview

This guide shows how to deploy your Agri-Nursery ERP system using **100% free services** for testing and development.

---

## 🎯 Recommended Stack (All Free)

| Component | Service | Free Tier |
|-----------|---------|-----------|
| **Backend API** | Railway / Render | 500 hours/month or $5 credit |
| **Frontend** | Vercel / Netlify | Unlimited for personal projects |
| **Database** | Railway PostgreSQL | 500 hours/month |
| **SSL/HTTPS** | Automatic | Included free |
| **Domain** | Provided subdomain | Free .up.railway.app / .onrender.com |

---

## Option 1: Railway (Recommended - Easiest)

**Why Railway?**
- Deploy backend + database together
- Automatic HTTPS
- GitHub integration
- Free $5 credit/month (enough for testing)
- PostgreSQL included

### Step 1: Prepare Your Code

```bash
cd /Users/abhijit.shahane/Code/zendesk/AgriNursery

# Create a railway.json configuration
cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd server && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF

# Create Procfile for Railway
cat > Procfile << 'EOF'
web: cd server && npm start
EOF
```

### Step 2: Push to GitHub

```bash
# Initialize git if not already
git init
git add .
git commit -m "Prepare for Railway deployment"

# Create GitHub repo and push
# (Create repo at github.com/new first)
git remote add origin https://github.com/YOUR_USERNAME/agri-nursery.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Railway

1. **Sign up:** Go to [railway.app](https://railway.app) (use GitHub login)

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your `agri-nursery` repository
   - Click "Deploy"

3. **Add PostgreSQL:**
   - In your project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway auto-provisions the database

4. **Configure Environment Variables:**
   Click on your backend service → Variables → Add:
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=0247c7d0c9815abe32e485a737acd94bd6906e6ab5366bbaf4ab8e3da0c4fe4998145fc5fda948098b003af5be4bfff9421cea85fecabd5f8924be349c1e4228
   CORS_ORIGIN=https://your-frontend.vercel.app
   ```

5. **Run Database Migrations:**
   - Go to your backend service
   - Click "Settings" → "Deployments"
   - Add custom start command:
   ```bash
   cd server && for f in database/migrations/*.sql; do psql $DATABASE_URL -f "$f"; done && npm start
   ```

6. **Get Your API URL:**
   - Click on your service
   - Copy the URL (e.g., `https://agri-nursery-api.up.railway.app`)

### Step 4: Deploy Frontend on Vercel

```bash
cd client

# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Setup and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? agri-nursery
# - Directory? ./
# - Override settings? No
```

Update the API URL in your frontend:

```bash
# Create .env.production in client folder
cat > .env.production << EOF
VITE_API_URL=https://your-backend.up.railway.app/api
EOF

# Deploy again with environment
vercel --prod
```

**Your app is live!** 🎉
- Frontend: `https://agri-nursery.vercel.app`
- Backend: `https://agri-nursery-api.up.railway.app`

---

## Option 2: Render (Alternative - Also Free)

### Backend on Render

1. **Sign up:** [render.com](https://render.com)

2. **Create Web Service:**
   - New → Web Service
   - Connect your GitHub repo
   - Configure:
     ```
     Name: agri-nursery-api
     Environment: Node
     Build Command: cd server && npm install
     Start Command: cd server && npm start
     Plan: Free
     ```

3. **Add PostgreSQL:**
   - Dashboard → New → PostgreSQL
   - Name: `agri-nursery-db`
   - Plan: Free
   - Copy the Internal Database URL

4. **Environment Variables:**
   ```
   NODE_ENV=production
   DATABASE_URL=<paste internal database URL>
   JWT_SECRET=0247c7d0c9815abe32e485a737acd94bd6906e6ab5366bbaf4ab8e3da0c4fe4998145fc5fda948098b003af5be4bfff9421cea85fecabd5f8924be349c1e4228
   CORS_ORIGIN=https://your-frontend.vercel.app
   ```

5. **Run Migrations:**
   - Shell tab in your web service
   ```bash
   cd server
   for f in database/migrations/*.sql; do 
     psql $DATABASE_URL -f "$f"
   done
   ```

### Frontend on Netlify

```bash
cd client

# Build the frontend
npm run build

# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist

# Update API URL
# Create client/.env.production
VITE_API_URL=https://agri-nursery-api.onrender.com/api

# Rebuild and redeploy
npm run build
netlify deploy --prod --dir=dist
```

---

## Option 3: Fly.io (Best Performance)

### Deploy Backend + Database

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Navigate to server directory
cd server

# Launch app
fly launch

# Follow prompts:
# - App name? agri-nursery-api
# - Region? Choose closest to you
# - Add PostgreSQL? Yes
# - Deploy now? No

# Configure environment
fly secrets set JWT_SECRET="0247c7d0c9815abe32e485a737acd94bd6906e6ab5366bbaf4ab8e3da0c4fe4998145fc5fda948098b003af5be4bfff9421cea85fecabd5f8924be349c1e4228"
fly secrets set NODE_ENV=production
fly secrets set CORS_ORIGIN=https://your-frontend.vercel.app

# Deploy
fly deploy
```

### Run Migrations on Fly.io

```bash
# SSH into your app
fly ssh console

# Run migrations
cd server
for f in database/migrations/*.sql; do 
  psql $DATABASE_URL -f "$f"
done
exit
```

---

## Option 4: Quick Local Testing with ngrok

**Test your local app with HTTPS instantly:**

```bash
# Install ngrok
brew install ngrok  # macOS
# OR download from ngrok.com

# Sign up and get auth token from ngrok.com

# Start your backend locally
cd server
npm start

# In another terminal, expose it
ngrok http 5000

# You'll get a public URL like:
# https://abc123.ngrok.io

# Update frontend .env
VITE_API_URL=https://abc123.ngrok.io/api

# Start frontend
cd client
npm run dev
```

**Frontend with ngrok:**
```bash
# In another terminal
cd client
npm run dev  # Runs on port 3000

# Expose frontend
ngrok http 3000

# Access your app at:
# https://xyz789.ngrok.io
```

---

## Quick Comparison

| Platform | Backend | Database | Setup Time | Free Tier | Best For |
|----------|---------|----------|------------|-----------|----------|
| **Railway** | ✅ | ✅ PostgreSQL | 5 min | $5 credit/mo | Easiest, all-in-one |
| **Render** | ✅ | ✅ PostgreSQL | 10 min | 750 hrs/mo | Stable, good docs |
| **Fly.io** | ✅ | ✅ PostgreSQL | 15 min | 3 apps free | Best performance |
| **Vercel** | ❌ | ❌ | 2 min | Unlimited | Frontend only |
| **Netlify** | ❌ | ❌ | 2 min | 100GB/mo | Frontend only |
| **ngrok** | Local | Local | 1 min | 1 tunnel | Quick testing |

---

## Post-Deployment Checklist

### 1. Update Environment Variables

Make sure to set these on your hosting platform:

```bash
# Required
NODE_ENV=production
DATABASE_URL=<auto-provided by platform>
JWT_SECRET=<your 128-char secret>

# Update these
CORS_ORIGIN=https://your-frontend-domain.com
ADMIN_EMAIL=your-email@example.com
```

### 2. Run Database Migrations

**Railway/Render (via Shell):**
```bash
cd server
for f in database/migrations/*.sql; do 
  psql $DATABASE_URL -f "$f"
done
```

**Or create a migration script:**
```bash
# Add to package.json
"scripts": {
  "migrate": "for f in database/migrations/*.sql; do psql $DATABASE_URL -f \"$f\"; done"
}

# Then run:
npm run migrate
```

### 3. Create Admin User

**SSH into your deployed app:**
```bash
# Railway
railway run bash

# Render
# Use the Shell tab in dashboard

# Fly.io
fly ssh console

# Then run:
cd server
node scripts/create-admin.js
```

### 4. Test Your Deployment

```bash
# Test health endpoint
curl https://your-backend.railway.app/health

# Test login
curl -X POST https://your-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Visit frontend
open https://your-frontend.vercel.app
```

### 5. Update Frontend API URL

**In client/.env.production:**
```bash
VITE_API_URL=https://your-backend.railway.app/api
```

**Rebuild and redeploy:**
```bash
npm run build
vercel --prod
```

---

## Monitoring Free Deployments

### Railway
- Dashboard shows logs in real-time
- Metrics: CPU, Memory, Network
- Deployment history

### Render
- Logs tab (last 7 days free)
- Metrics: Response time, errors
- Shell access for debugging

### Vercel/Netlify
- Deployment logs
- Analytics (free tier limited)
- Edge network stats

---

## Common Issues & Solutions

### Issue: Database migrations not running

**Solution:**
```bash
# Connect to your database directly
# Railway: Copy DATABASE_URL from variables
psql "postgresql://user:pass@host:port/db" 

# Run migrations manually
\i server/database/migrations/001_initial_schema.sql
# ... repeat for all migrations
```

### Issue: CORS errors

**Solution:**
Update CORS_ORIGIN environment variable:
```bash
# Railway/Render/Fly.io
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Issue: "Cannot find module" errors

**Solution:**
Ensure package.json is in the right place:
```bash
# For Railway/Render, create root package.json:
{
  "name": "agri-nursery",
  "scripts": {
    "start": "cd server && npm start",
    "install": "cd server && npm install"
  }
}
```

### Issue: App sleeps on free tier

**Solutions:**
- Railway: $5 credit keeps it running
- Render: Free tier sleeps after 15min inactivity
- Use UptimeRobot (free) to ping every 5 minutes:
  - Sign up at uptimerobot.com
  - Add monitor for your backend /health endpoint

---

## Cost Estimate

### All Free Option
```
Railway Backend:        $0 (within $5 credit)
Railway PostgreSQL:     $0 (within $5 credit)
Vercel Frontend:        $0 (unlimited)
Domain:                 $0 (use provided subdomain)
SSL Certificate:        $0 (automatic)
───────────────────────────────────
TOTAL:                  $0/month
```

### If You Exceed Free Tiers
```
Railway (beyond $5):    ~$5/month extra
Render Web Service:     $7/month (if paid)
Render PostgreSQL:      $7/month (if paid)
Custom Domain:          $10/year (optional)
───────────────────────────────────
TOTAL:                  $0-15/month
```

---

## Recommended: Railway + Vercel Setup

**Best free combination for testing:**

1. **Backend + Database on Railway** (all-in-one)
   - Free $5 credit/month
   - Automatic PostgreSQL
   - Easy GitHub deployment

2. **Frontend on Vercel** (unlimited)
   - Instant global CDN
   - Automatic HTTPS
   - Git integration

**Setup time:** ~10 minutes  
**Cost:** $0/month  
**Perfect for:** Testing, demos, small teams

---

## Next Steps After Deployment

1. **Test all features** using the deployed URLs
2. **Share the frontend URL** with testers
3. **Monitor logs** for any errors
4. **Set up UptimeRobot** to prevent sleep (Render)
5. **Consider upgrading** if usage grows

---

## Quick Start Commands

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "Initial"
git remote add origin https://github.com/YOU/agri-nursery.git
git push -u origin main

# 2. Deploy backend on Railway
# Visit railway.app → New Project → Deploy from GitHub

# 3. Deploy frontend on Vercel
cd client
vercel --prod

# Done! 🎉
```

---

## Support Resources

- **Railway:** [docs.railway.app](https://docs.railway.app)
- **Render:** [render.com/docs](https://render.com/docs)
- **Vercel:** [vercel.com/docs](https://vercel.com/docs)
- **Fly.io:** [fly.io/docs](https://fly.io/docs)

Your app will be live on the internet with HTTPS, custom domain, and global CDN - all for FREE! 🚀
