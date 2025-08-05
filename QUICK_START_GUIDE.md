# 🚀 Quick Start Guide - Boardroom Booking Backend

## **30-Second Setup**

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# 3. Start development server
npm run dev

# 4. Test the API
curl http://localhost:5000/api/health
```

## **Essential Environment Variables**
```bash
# Minimum required for development
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters
MONGODB_URI=mongodb://localhost:27017/boardroom_booking
PORT=5000
```

## **First API Calls**

### **1. Register a User**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### **2. Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### **3. Get Boardrooms**
```bash
# Use the token from login response
curl -X GET http://localhost:5000/api/boardrooms \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## **Key Endpoints**
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/boardrooms` - List boardrooms
- `POST /api/bookings` - Create booking
- `GET /api/health` - Check API status

## **Testing Commands**
```bash
npm test              # Run all tests
npm run test:coverage # Run with coverage
npm run dev          # Start development server
```

## **Common Issues**
- **Database connection**: Ensure MongoDB is running
- **JWT errors**: Check JWT_SECRET is 32+ characters
- **Rate limiting**: Wait or adjust limits in .env

## **Full Documentation**
See `BACKEND_API_DOCUMENTATION.md` for complete API reference.