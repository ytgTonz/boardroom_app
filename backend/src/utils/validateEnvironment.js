/**
 * Environment Variables Validation Utility
 * Ensures all required environment variables are set before application startup
 */

// Using console colors without chalk dependency for compatibility
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

/**
 * Required environment variables for different environments
 */
const REQUIRED_ENV_VARS = {
  development: [
    'JWT_SECRET',
    'MONGODB_URI',
    'PORT'
  ],
  production: [
    'JWT_SECRET',
    'MONGODB_URI',
    'PORT',
    'NODE_ENV',
    'EMAIL_USER',
    'EMAIL_APP_PASSWORD',
    'IMAGEKIT_PUBLIC_KEY',
    'IMAGEKIT_PRIVATE_KEY',
    'IMAGEKIT_URL_ENDPOINT'
  ],
  staging: [
    'JWT_SECRET',
    'MONGODB_URI',
    'PORT',
    'NODE_ENV',
    'EMAIL_USER',
    'EMAIL_APP_PASSWORD'
  ]
};

/**
 * Optional environment variables with descriptions
 */
const OPTIONAL_ENV_VARS = {
  'CORS_ORIGIN': 'CORS origin URL (defaults to http://localhost:3000)',
  'RATE_LIMIT_GENERAL_MAX': 'General API rate limit (defaults based on NODE_ENV)',
  'RATE_LIMIT_AUTH_MAX': 'Authentication rate limit (defaults based on NODE_ENV)',
  'RATE_LIMIT_BOOKING_MAX': 'Booking operations rate limit (defaults based on NODE_ENV)',
  'RATE_LIMIT_EMAIL_MAX': 'Email/notifications rate limit (defaults based on NODE_ENV)',
  'EMAIL_FROM': 'Email from address (has default)',
  'EMAIL_HOST': 'Email SMTP host (defaults to Gmail)',
  'EMAIL_PORT': 'Email SMTP port (defaults to 587)',
  'EMAIL_SECURE': 'Email SMTP secure flag (defaults to false)'
};

/**
 * Validates JWT secret strength
 * @param {string} jwtSecret - The JWT secret to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateJWTSecret(jwtSecret) {
  if (!jwtSecret) return false;
  
  // JWT secret should be at least 32 characters long for security
  if (jwtSecret.length < 32) {
    console.error(chalk.red('❌ JWT_SECRET must be at least 32 characters long for security'));
    return false;
  }
  
  // JWT secret should not be a default/example value
  const insecureSecrets = [
    'your-secret-key',
    'your_jwt_secret_here',
    'supersecret',
    'secret',
    'jwt-secret',
    'changeme'
  ];
  
  if (insecureSecrets.includes(jwtSecret)) {
    console.error(chalk.red('❌ JWT_SECRET appears to be a default/example value. Use a secure random string.'));
    return false;
  }
  
  return true;
}

/**
 * Validates MongoDB URI format
 * @param {string} mongoUri - The MongoDB URI to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateMongoURI(mongoUri) {
  if (!mongoUri) return false;
  
  // Basic MongoDB URI validation
  const mongoUriRegex = /^mongodb(\+srv)?:\/\/.+/;
  if (!mongoUriRegex.test(mongoUri)) {
    console.error(chalk.red('❌ MONGODB_URI format is invalid. Expected: mongodb://... or mongodb+srv://...'));
    return false;
  }
  
  return true;
}

/**
 * Validates email configuration
 * @param {Object} emailConfig - Email configuration object
 * @returns {boolean} - True if valid, false otherwise
 */
function validateEmailConfig(emailConfig) {
  const { EMAIL_USER, EMAIL_APP_PASSWORD } = emailConfig;
  
  if (!EMAIL_USER || !EMAIL_APP_PASSWORD) {
    console.warn(chalk.yellow('⚠️  EMAIL_USER or EMAIL_APP_PASSWORD not set. Email functionality will use test mode.'));
    return true; // Email is optional in development
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(EMAIL_USER)) {
    console.error(chalk.red('❌ EMAIL_USER format is invalid. Expected: valid email address'));
    return false;
  }
  
  return true;
}

/**
 * Validates ImageKit configuration
 * @param {Object} imagekitConfig - ImageKit configuration object
 * @returns {boolean} - True if valid, false otherwise
 */
function validateImageKitConfig(imagekitConfig) {
  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } = imagekitConfig;
  
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    console.warn(chalk.yellow('⚠️  ImageKit configuration incomplete. Image upload functionality may not work.'));
    return true; // ImageKit is optional for basic functionality
  }
  
  // Validate URL endpoint format
  if (IMAGEKIT_URL_ENDPOINT && !IMAGEKIT_URL_ENDPOINT.startsWith('https://ik.imagekit.io/')) {
    console.error(chalk.red('❌ IMAGEKIT_URL_ENDPOINT format is invalid. Expected: https://ik.imagekit.io/...'));
    return false;
  }
  
  return true;
}

/**
 * Main environment validation function
 * @param {string} environment - The current environment (development, staging, production)
 * @returns {boolean} - True if all validations pass, false otherwise
 */
function validateEnvironment(environment = 'development') {
  console.log(chalk.blue(`🔍 Validating environment variables for: ${environment}`));
  
  const requiredVars = REQUIRED_ENV_VARS[environment] || REQUIRED_ENV_VARS.development;
  const missingVars = [];
  const validationErrors = [];
  
  // Check for missing required variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    console.error(chalk.red('❌ Missing required environment variables:'));
    missingVars.forEach(varName => {
      console.error(chalk.red(`   - ${varName}`));
    });
    validationErrors.push('Missing required environment variables');
  }
  
  // Validate JWT secret
  if (process.env.JWT_SECRET && !validateJWTSecret(process.env.JWT_SECRET)) {
    validationErrors.push('Invalid JWT_SECRET');
  }
  
  // Validate MongoDB URI
  if (process.env.MONGODB_URI && !validateMongoURI(process.env.MONGODB_URI)) {
    validationErrors.push('Invalid MONGODB_URI');
  }
  
  // Validate email configuration
  if (!validateEmailConfig({
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD
  })) {
    validationErrors.push('Invalid email configuration');
  }
  
  // Validate ImageKit configuration
  if (!validateImageKitConfig({
    IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY,
    IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY,
    IMAGEKIT_URL_ENDPOINT: process.env.IMAGEKIT_URL_ENDPOINT
  })) {
    validationErrors.push('Invalid ImageKit configuration');
  }
  
  // Display optional variables status
  console.log(chalk.blue('📋 Optional environment variables:'));
  Object.entries(OPTIONAL_ENV_VARS).forEach(([varName, description]) => {
    const status = process.env[varName] ? '✅ Set' : '⚪ Not set (using default)';
    console.log(chalk.gray(`   ${varName}: ${status} - ${description}`));
  });
  
  // Summary
  if (validationErrors.length === 0) {
    console.log(chalk.green(`✅ Environment validation passed for ${environment}`));
    return true;
  } else {
    console.error(chalk.red(`❌ Environment validation failed with ${validationErrors.length} error(s):`));
    validationErrors.forEach(error => {
      console.error(chalk.red(`   - ${error}`));
    });
    
    console.log(chalk.yellow('\n💡 Quick fix guide:'));
    console.log(chalk.yellow('   1. Copy .env.example to .env'));
    console.log(chalk.yellow('   2. Fill in all required values'));
    console.log(chalk.yellow('   3. Generate a secure JWT_SECRET: openssl rand -base64 32'));
    console.log(chalk.yellow('   4. Restart the application'));
    
    return false;
  }
}

/**
 * Generate a secure JWT secret
 * @returns {string} - A secure random JWT secret
 */
function generateSecureJWTSecret() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('base64');
}

module.exports = {
  validateEnvironment,
  validateJWTSecret,
  validateMongoURI,
  validateEmailConfig,
  validateImageKitConfig,
  generateSecureJWTSecret,
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS
};