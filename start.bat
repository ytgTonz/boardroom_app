@echo off
echo ========================================
echo Boardroom Booking App Setup
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo After installation, restart this script.
    pause
    exit /b 1
)

echo Node.js is installed.
echo.

echo Installing dependencies...
echo Installing root dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install root dependencies!
    pause
    exit /b 1
)

echo Installing backend dependencies...
cd backend
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install backend dependencies!
    pause
    exit /b 1
)

echo Installing frontend dependencies...
cd ../frontend
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install frontend dependencies!
    pause
    exit /b 1
)

cd ..

echo.
echo Setting up environment...
if not exist "backend\.env" (
    echo Creating .env file from template...
    copy backend\env.example backend\.env
    echo.
    echo IMPORTANT: Please edit backend\.env with your MongoDB connection!
    echo.
    echo For local MongoDB: mongodb://localhost:27017/boardroom_booking
    echo For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/boardroom_booking
    echo.
    pause
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the application:
echo 1. Make sure MongoDB is running
echo 2. Run: npm run dev
echo.
echo This will start:
echo - Backend: http://localhost:5000
echo - Frontend: http://localhost:3000
echo.
pause 