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
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be 1000 characters or less'),
  body('category')
    .optional()
    .custom((value) => {
      // Allow empty string, null, undefined, or valid ObjectId
      if (!value || value === '') {
        return true;
      }
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Category must be a valid ID');
      }
      return true;
    }),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be boolean'),
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

// Profile validation rules
const validateProfileUpdate = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be 500 characters or less'),
  body('university')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('University must be 100 characters or less'),
  body('major')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Major must be 100 characters or less'),
  body('year')
    .optional()
    .isIn(['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'PhD', 'Other'])
    .withMessage('Invalid year selection'),
  body('interests')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Interests must be an array with maximum 10 items'),
  body('interests.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each interest must be between 1 and 50 characters'),
  body('avatar')
    .optional()
    .trim()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  handleValidationErrors
];

// Preferences validation rules
const validatePreferencesUpdate = [
  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notification preference must be boolean'),
  body('notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notification preference must be boolean'),
  body('notifications.mentions')
    .optional()
    .isBoolean()
    .withMessage('Mentions notification preference must be boolean'),
  body('notifications.threadActivity')
    .optional()
    .isBoolean()
    .withMessage('Thread activity notification preference must be boolean'),
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'system'])
    .withMessage('Theme must be light, dark, or system'),
  body('ai.enabled')
    .optional()
    .isBoolean()
    .withMessage('AI enabled preference must be boolean'),
  body('ai.responseStyle')
    .optional()
    .isIn(['concise', 'detailed', 'adaptive'])
    .withMessage('AI response style must be concise, detailed, or adaptive'),
  body('ai.autoRespond')
    .optional()
    .isBoolean()
    .withMessage('AI auto-respond preference must be boolean'),
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
  validateProfileUpdate,
  validatePreferencesUpdate,
  validateObjectId,
  handleValidationErrors
};