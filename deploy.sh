#!/bin/bash

echo "🚀 Preparing Boardroom Booking App for Render Deployment"
echo "=================================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if all required files exist
echo "📋 Checking required files..."

required_files=(
    "backend/server.js"
    "backend/package.json"
    "frontend/package.json"
    "frontend/vite.config.ts"
    "render.yaml"
    "DEPLOYMENT.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ Missing: $file"
        exit 1
    fi
done

echo ""
echo "✅ All required files found!"
echo ""

# Check if .env files exist and warn about them
if [ -f "backend/.env" ]; then
    echo "⚠️  Warning: backend/.env file found. Make sure it's in .gitignore!"
fi

if [ -f "frontend/.env" ]; then
    echo "⚠️  Warning: frontend/.env file found. Make sure it's in .gitignore!"
fi

echo ""
echo "📝 Next Steps:"
echo "1. Push your code to GitHub:"
echo "   git add ."
echo "   git commit -m 'Prepare for Render deployment'"
echo "   git push origin main"
echo ""
echo "2. Set up MongoDB Atlas:"
echo "   - Create account at https://www.mongodb.com/atlas"
echo "   - Create a cluster and database"
echo "   - Get your connection string"
echo ""
echo "3. Deploy to Render:"
echo "   - Go to https://render.com"
echo "   - Create account and connect your GitHub repo"
echo "   - Follow the deployment guide in DEPLOYMENT.md"
echo ""
echo "4. Set environment variables in Render:"
echo "   - MONGODB_URI: Your Atlas connection string"
echo "   - JWT_SECRET: A strong secret key"
echo "   - CORS_ORIGIN: Your frontend URL"
echo ""
echo "🎉 Ready for deployment!" 