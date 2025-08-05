# 🚨 Sentry.io Error Tracking Setup Guide

Complete guide to set up Sentry.io error tracking and monitoring for the Boardroom Booking Application.

## 📋 Quick Setup Checklist

- [ ] Create Sentry.io account
- [ ] Create Node.js and React projects
- [ ] Configure environment variables
- [ ] Test error tracking
- [ ] Set up alerts and notifications

## 🚀 Step-by-Step Setup

### 1. Create Sentry Account & Projects

1. **Sign up** at [sentry.io](https://sentry.io) (free tier includes 5,000 errors/month)

2. **Create Backend Project**:
   - Click "Create Project"
   - Select **Node.js** platform
   - Name: `boardroom-booking-backend`
   - Copy the DSN (looks like: `https://abc123@o123456.ingest.sentry.io/7890123`)

3. **Create Frontend Project**:
   - Create another project
   - Select **React** platform  
   - Name: `boardroom-booking-frontend`
   - Copy the DSN

### 2. Configure Environment Variables

#### Backend (.env)
```bash
# Error Tracking with Sentry.io
SENTRY_DSN=https://your_backend_dsn@sentry.io/project_id
```

#### Frontend (.env.development)
```bash
# Error Tracking (Sentry.io)
VITE_SENTRY_DSN=https://your_frontend_dsn@sentry.io/project_id
```

#### Frontend (.env.production)
```bash
# Error Tracking (Sentry.io)
VITE_SENTRY_DSN=https://your_frontend_dsn@sentry.io/project_id
```

### 3. Test Error Tracking

#### Backend Testing
```bash
cd backend
node test-sentry.js
```

#### Frontend Testing
1. Start the development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Navigate to the SentryTest component (add route if needed)
3. Click "Run Integration Tests"
4. Check your Sentry dashboard

### 4. Verify Setup

After running tests, check your Sentry dashboard:
- **Issues Tab**: Should show captured errors
- **Performance Tab**: Should show transactions
- **Breadcrumbs**: Available in error details

## 🔧 Current Integration Features

### Backend Error Tracking
✅ **Automatic Tracking**:
- Authentication errors
- Database errors  
- API endpoint errors
- Performance issues (>1s operations)
- User login/logout events

✅ **Manual Tracking**:
- Custom exceptions with context
- Breadcrumb tracking
- Performance transactions
- User context setting

### Frontend Error Tracking
✅ **Automatic Tracking**:
- React component errors (Error Boundary)
- API call failures
- Navigation events
- Form validation errors

✅ **Manual Tracking**:
- Custom exceptions
- Performance monitoring
- User interactions
- Authentication events

## 📊 Monitoring Capabilities

### Error Tracking
- **Real-time error capture** with full stack traces
- **User context** (ID, email, browser info)
- **Breadcrumb trails** showing user actions before errors
- **Release tracking** for deployment monitoring

### Performance Monitoring
- **API response times** and slow queries
- **Database operation monitoring**
- **Frontend page load times**
- **Custom transaction tracking**

### User Insights
- **Affected users** count per issue
- **Error frequency** and trends
- **Geographic distribution** of errors
- **Browser/device breakdown**

## 🚨 Alert Configuration

### Recommended Alerts

1. **High Error Rate**:
   - Condition: >10 errors in 5 minutes
   - Actions: Email + Slack notification

2. **New Issues**:
   - Condition: First occurrence of new error
   - Actions: Immediate email notification

3. **Performance Degradation**:
   - Condition: >2s average response time
   - Actions: Email to DevOps team

4. **Authentication Failures**:
   - Condition: >5 failed logins in 10 minutes
   - Actions: Email + possible security alert

### Setting Up Alerts

1. Go to **Project Settings > Alerts**
2. Click **Create Alert Rule**
3. Configure conditions and actions
4. Test with sample data

## 🔍 Debugging with Sentry

### Error Analysis Workflow
1. **Issue Detection**: Sentry captures error
2. **Context Review**: Check user, device, breadcrumbs
3. **Stack Trace**: Identify exact error location
4. **Reproduction**: Use breadcrumbs to reproduce issue
5. **Resolution**: Fix and deploy with release tracking

### Best Practices
- **Tag errors** with meaningful categories
- **Add user context** for authenticated users
- **Use breadcrumbs** to trace user journey
- **Set up releases** to track which deployment introduced issues
- **Filter noise** by ignoring expected errors

## 📈 Production Deployment

### Environment Configuration
```bash
# Production settings
NODE_ENV=production
SENTRY_DSN=https://your_production_dsn@sentry.io/project_id

# Sample rates for production (reduce data volume)
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 10% of profiles
```

### Release Tracking
```bash
# Create release in Sentry
npx @sentry/cli releases new "boardroom-app@1.0.0"
npx @sentry/cli releases set-commits "boardroom-app@1.0.0" --auto
npx @sentry/cli releases deploy "boardroom-app@1.0.0" --env production
```

## 🎛️ Dashboard Setup

### Key Metrics to Monitor
1. **Error Rate**: Errors per minute/hour
2. **User Impact**: Number of affected users
3. **Performance**: Average response times
4. **Release Health**: New issues introduced per release

### Custom Dashboards
- Create dashboards for different teams (Dev, DevOps, Product)
- Set up widgets for key metrics
- Configure time ranges and filters

## 🔒 Security & Privacy

### Data Privacy
- Sentry automatically scrubs sensitive data (passwords, tokens)
- Configure additional scrubbing for custom sensitive fields
- Set data retention periods as per compliance requirements

### Access Control
- Set up team-based access control
- Configure project permissions
- Enable SSO if available

## 📚 Additional Resources

- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/node/)
- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Performance Monitoring Guide](https://docs.sentry.io/product/performance/)
- [Alert Configuration](https://docs.sentry.io/product/alerts/)

## 🆘 Troubleshooting

### Common Issues

**❌ "Sentry not initialized" error**
- Check DSN is set correctly in environment variables
- Verify Sentry packages are installed
- Ensure environment variables are loaded

**❌ No errors appearing in dashboard**
- Verify DSN is correct
- Check network connectivity
- Run test scripts to generate sample errors

**❌ Too many errors/noise**
- Configure `beforeSend` filters
- Add proper error boundaries
- Filter out expected errors (404s, validation errors)

---

## 🎉 You're All Set!

Your Boardroom Booking Application now has enterprise-grade error tracking and monitoring. Sentry will help you:

- **Catch errors** before users report them
- **Monitor performance** across your entire stack
- **Track user impact** of issues
- **Debug faster** with detailed context
- **Improve reliability** through data-driven insights

Happy monitoring! 🚀