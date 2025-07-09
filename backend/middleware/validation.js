const { body, param, validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Thread validation rules
const validateCreateThread = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  handleValidationErrors
];

// Message validation rules
const validateCreateMessage = [
  param('threadId')
    .isMongoId()
    .withMessage('Invalid thread ID'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be between 1 and 10000 characters'),
  handleValidationErrors
];

// User validation rules
const validateUserSync = [
  body('uid')
    .trim()
    .isLength({ min: 1, max: 128 })
    .withMessage('Invalid user ID'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  handleValidationErrors
];

module.exports = {
  validateCreateThread,
  validateCreateMessage,
  validateUserSync,
  validateObjectId,
  handleValidationErrors
};