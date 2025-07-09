const errorHandler = (err, req, res, next) => {
  console.error(`Error ${err.status || 500}: ${err.message}`);
  console.error(err.stack);

  // Default error response
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    error = {
      message: 'Validation Error',
      status: 400,
      details: Object.values(err.errors).map(e => e.message)
    };
  } else if (err.name === 'CastError') {
    // MongoDB ObjectId cast error
    error = {
      message: 'Invalid ID format',
      status: 400
    };
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    error = {
      message: 'Duplicate entry',
      status: 409
    };
  } else if (err.name === 'JsonWebTokenError') {
    // JWT error
    error = {
      message: 'Invalid token',
      status: 401
    };
  } else if (err.name === 'TokenExpiredError') {
    // JWT expired
    error = {
      message: 'Token expired',
      status: 401
    };
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && error.status === 500) {
    error.message = 'Internal Server Error';
  }

  res.status(error.status).json({
    error: error.message,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Handle 404 errors
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.status = 404;
  next(error);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};