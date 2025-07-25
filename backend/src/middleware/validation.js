// backend/src/middleware/validation.js
const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Registration validation
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Boardroom validation
const validateBoardroom = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('capacity')
    .isInt({ min: 1, max: 500 })
    .withMessage('Capacity must be a number between 1 and 500'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Location must be between 2 and 200 characters'),
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  handleValidationErrors
];

// Booking validation
const validateBooking = [
  body('boardroom')
    .isMongoId()
    .withMessage('Invalid boardroom ID'),
  body('startTime')
    .isISO8601()
    .withMessage('Start time must be a valid datetime'),
  body('endTime')
    .isISO8601()
    .withMessage('End time must be a valid datetime')
    .custom((endTime, { req }) => {
      if (new Date(endTime) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('purpose')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Purpose must be between 2 and 200 characters'),
  body('attendees')
    .isArray({ min: 1 })
    .withMessage('At least one attendee is required'),
  body('attendees.*')
    .isMongoId()
    .withMessage('Invalid attendee ID'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateBoardroom,
  validateBooking
};