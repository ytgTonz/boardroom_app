# Setup Guide for Boardroom Booking App

## Prerequisites Installation

### 1. Install Node.js and npm

**Option A: Download from Official Website**
1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the LTS version (recommended)
3. Run the installer and follow the installation wizard
4. Verify installation by opening a new terminal and running:
   ```bash
   node --version
   npm --version
   ```

**Option B: Using Chocolatey (Windows)**
```bash
choco install nodejs
```

**Option C: Using Winget (Windows)**
```bash
winget install OpenJS.NodeJS
```

### 2. Install MongoDB

**Option A: MongoDB Community Server**
1. Go to [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Download MongoDB Community Server
3. Run the installer and follow the setup wizard
4. Start MongoDB service:
   ```bash
   # Windows (as Administrator)
   net start MongoDB
   ```

**Option B: MongoDB Atlas (Cloud)**
1. Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string

## Project Setup

### 1. Install Dependencies

After installing Node.js and npm, run these commands in the project root:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### 2. Environment Configuration

1. Create environment file for backend:
   ```bash
   cd backend
   copy env.example .env
   ```

2. Edit the `.env` file with your MongoDB connection:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/boardroom_booking
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   NODE_ENV=development
   ```

   **For MongoDB Atlas users:**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/boardroom_booking
   ```

### 3. Start the Application

**Development Mode (Both Backend and Frontend):**
```bash
npm run dev
```

This will start:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000

**Individual Development:**
```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

## Troubleshooting

### Node.js/npm not found
- Make sure Node.js is properly installed
- Restart your terminal after installation
- Check if Node.js is in your PATH

### MongoDB Connection Issues
- Ensure MongoDB service is running
- Check your connection string
- For local MongoDB: `mongodb://localhost:27017/boardroom_booking`
- For Atlas: Use the connection string from your cluster

### Port Already in Use
- Backend port 5000: Change in `backend/.env`
- Frontend port 3000: Change in `frontend/vite.config.ts`

### Dependencies Installation Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Quick Start Script

Create a `start.bat` file (Windows) in the project root:

```batch
@echo off
echo Installing dependencies...
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..

echo Setting up environment...
if not exist "backend\.env" (
    copy backend\env.example backend\.env
    echo Please edit backend\.env with your MongoDB connection
)

echo Starting the application...
npm run dev
```

## Production Deployment

### Backend Deployment
1. Set `NODE_ENV=production` in `.env`
2. Use a strong JWT_SECRET
3. Configure MongoDB Atlas for production
4. Deploy to platforms like Heroku, Railway, or Vercel

### Frontend Deployment
1. Build the application:
   ```bash
   cd frontend
   npm run build
   ```
2. Deploy the `dist` folder to platforms like Vercel, Netlify, or GitHub Pages

## Support

If you encounter any issues:
1. Check the console for error messages
2. Verify all prerequisites are installed
3. Ensure MongoDB is running
4. Check your environment variables
5. Try clearing npm cache and reinstalling dependencies 