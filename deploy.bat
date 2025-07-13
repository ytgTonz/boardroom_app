@echo off
echo 🚀 Preparing Boardroom Booking App for Render Deployment
echo ==================================================

REM Check if git is initialized
if not exist ".git" (
    echo ❌ Git repository not found. Please initialize git first:
    echo    git init
    echo    git add .
    echo    git commit -m "Initial commit"
    pause
    exit /b 1
)

REM Check if all required files exist
echo 📋 Checking required files...

set required_files=backend\server.js backend\package.json frontend\package.json frontend\vite.config.ts render.yaml DEPLOYMENT.md

for %%f in (%required_files%) do (
    if exist "%%f" (
        echo ✅ %%f
    ) else (
        echo ❌ Missing: %%f
        pause
        exit /b 1
    )
)

echo.
echo ✅ All required files found!
echo.

REM Check if .env files exist and warn about them
if exist "backend\.env" (
    echo ⚠️  Warning: backend\.env file found. Make sure it's in .gitignore!
)

if exist "frontend\.env" (
    echo ⚠️  Warning: frontend\.env file found. Make sure it's in .gitignore!
)

echo.
echo 📝 Next Steps:
echo 1. Push your code to GitHub:
echo    git add .
echo    git commit -m "Prepare for Render deployment"
echo    git push origin main
echo.
echo 2. Set up MongoDB Atlas:
echo    - Create account at https://www.mongodb.com/atlas
echo    - Create a cluster and database
echo    - Get your connection string
echo.
echo 3. Deploy to Render:
echo    - Go to https://render.com
echo    - Create account and connect your GitHub repo
echo    - Follow the deployment guide in DEPLOYMENT.md
echo.
echo 4. Set environment variables in Render:
echo    - MONGODB_URI: Your Atlas connection string
echo    - JWT_SECRET: A strong secret key
echo    - CORS_ORIGIN: Your frontend URL
echo.
echo 🎉 Ready for deployment!
pause 