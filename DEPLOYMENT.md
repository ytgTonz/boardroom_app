# Deployment Guide for Render

This guide will help you deploy the Boardroom Booking App to Render.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **MongoDB Atlas Account**: For the database (free tier available)
3. **GitHub Repository**: Your code should be in a GitHub repository

## Step 1: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Create a database user with read/write permissions
4. Get your connection string
5. Whitelist your IP address (or use 0.0.0.0/0 for all IPs)

## Step 2: Deploy Backend API

1. **Create New Web Service**:
   - Go to your Render dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Backend Service**:
   - **Name**: `boardroom-booking-api`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free

3. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A strong secret key (generate one)
   - `CORS_ORIGIN`: `https://your-frontend-url.onrender.com`

4. **Deploy**: Click "Create Web Service"

## Step 3: Deploy Frontend

1. **Create New Static Site**:
   - Go to your Render dashboard
   - Click "New +" → "Static Site"
   - Connect your GitHub repository

2. **Configure Frontend Service**:
   - **Name**: `boardroom-booking-app`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Plan**: Free

3. **Environment Variables**:
   - `VITE_API_URL`: `https://your-backend-url.onrender.com/api`

4. **Deploy**: Click "Create Static Site"

## Step 4: Update CORS Configuration

After both services are deployed:

1. Go to your backend service settings
2. Update the `CORS_ORIGIN` environment variable with your frontend URL
3. Redeploy the backend service

## Step 5: Test the Deployment

1. Visit your frontend URL
2. Register a new account
3. Test booking functionality
4. Verify admin features work

## Environment Variables Reference

### Backend Variables
```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/boardroom_booking
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=https://your-frontend-url.onrender.com
```

### Frontend Variables
```env
VITE_API_URL=https://your-backend-url.onrender.com/api
```

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check build logs in Render dashboard
   - Ensure all dependencies are in package.json
   - Verify Node.js version compatibility

2. **Database Connection Issues**:
   - Verify MongoDB Atlas connection string
   - Check IP whitelist in Atlas
   - Ensure database user has correct permissions

3. **CORS Errors**:
   - Update CORS_ORIGIN with correct frontend URL
   - Redeploy backend after updating environment variables

4. **API 404 Errors**:
   - Verify API routes are correct
   - Check that backend is running
   - Ensure frontend is calling correct API URL

### Monitoring

- **Backend Logs**: Available in Render dashboard
- **Frontend Build Logs**: Check build status in dashboard
- **Health Check**: Visit `/api/health` endpoint

## Security Considerations

1. **JWT Secret**: Use a strong, unique secret
2. **MongoDB Security**: Enable authentication and network access controls
3. **Environment Variables**: Never commit secrets to Git
4. **HTTPS**: Render provides SSL certificates automatically

## Scaling

- **Free Tier**: Suitable for development and small projects
- **Paid Plans**: Available for higher traffic and custom domains
- **Database**: Consider MongoDB Atlas paid plans for production

## Custom Domains

1. **Backend**: Add custom domain in Render dashboard
2. **Frontend**: Configure custom domain for static site
3. **SSL**: Render provides automatic SSL certificates

## Backup Strategy

1. **Database**: MongoDB Atlas provides automated backups
2. **Code**: Use Git for version control
3. **Environment Variables**: Document all variables in this guide

## Support

- **Render Documentation**: [docs.render.com](https://docs.render.com)
- **MongoDB Atlas**: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)
- **Application Issues**: Check logs and error messages 