const { body, query, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Auth validators
const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate
];

// Attendance validators
const checkInValidator = [
  body('checkInAt')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('note')
    .optional()
    .isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters'),
  validate
];

const checkOutValidator = [
  body('manualCheckOutAt')
    .notEmpty().withMessage('Check-out time is required')
    .isISO8601().withMessage('Invalid date format'),
  validate
];

const historyValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('from')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('From date must be in YYYY-MM-DD format'),
  query('to')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('To date must be in YYYY-MM-DD format'),
  validate
];

module.exports = {
  registerValidator,
  loginValidator,
  checkInValidator,
  checkOutValidator,
  historyValidator
};