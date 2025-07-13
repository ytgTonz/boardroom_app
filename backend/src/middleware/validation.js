const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateRegistration = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const validateBooking = [
  body('boardroom').isMongoId().withMessage('Valid boardroom ID is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('purpose').trim().notEmpty().withMessage('Purpose is required'),
  body('attendees').isInt({ min: 1 }).withMessage('At least 1 attendee is required'),
  handleValidationErrors
];

const validateBoardroom = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateBooking,
  validateBoardroom,
  handleValidationErrors
}; 