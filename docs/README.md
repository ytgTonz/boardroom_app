# Boardroom Booking App Documentation

This directory contains all project documentation, guides, and technical references for the Boardroom Booking Application.

## 📖 Documentation Index

### Development & Technical

- **[Logging Guide](./logging.md)** - Comprehensive guide to the structured logging system
  - Frontend logger utility usage
  - Backend Winston logger configuration
  - Environment-specific logging behavior
  - Migration from console.log statements

- **[API Guide](./api-guide.md)** - Complete API reference and usage guide
  - Endpoint documentation
  - Request/response formats
  - Authentication flows
  - Error handling

### Features & Functionality

- **[PWA Features](./pwa-features.md)** - Progressive Web App capabilities
  - Offline functionality
  - Installation prompts
  - Service worker features
  - Caching strategies

### Maintenance & Troubleshooting

- **[Bug Fix Session Summary](./bug-fix-session-summary.md)** - Historical bug fixes and solutions
  - Common issues and resolutions
  - Debugging techniques
  - Performance improvements

## 🏗️ Project Structure

```
boardroom_app/
├── docs/                    # Documentation (you are here)
├── frontend/               # React frontend application
├── backend/                # Node.js/Express backend API
├── shared-packages/        # Shared utilities and services
└── SuperClaude_Framework/  # Development framework
```

## 🔗 Related Documentation

- **Backend Logs**: `backend/logs/` - Winston log files
- **Environment Config**: `.env` files in respective directories
- **Claude Integration**: `.claude/` directory for AI development tools

## 📝 Contributing to Documentation

When adding new documentation:

1. Place files in the appropriate category within `/docs/`
2. Use descriptive filenames with kebab-case (e.g., `new-feature-guide.md`)
3. Update this README.md index
4. Follow markdown best practices
5. Include code examples where applicable

## 🚀 Quick Start

For new developers, recommended reading order:

1. [API Guide](./api-guide.md) - Understand the backend structure
2. [Logging Guide](./logging.md) - Learn the logging system
3. [PWA Features](./pwa-features.md) - Explore advanced features
4. [Bug Fix Summary](./bug-fix-session-summary.md) - Common issues

---

**Last Updated**: August 2025  
**Maintained By**: Development Team