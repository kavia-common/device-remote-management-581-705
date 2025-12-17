// PUBLIC_INTERFACE
/**
 * Global error handling middleware
 * Catches and formats all errors with appropriate status codes
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        statusCode = 409;
        message = 'Resource already exists';
        details = err.detail;
        break;
      case '23503': // Foreign key violation
        statusCode = 400;
        message = 'Invalid reference';
        details = err.detail;
        break;
      case '23502': // Not null violation
        statusCode = 400;
        message = 'Missing required field';
        details = err.column;
        break;
      default:
        statusCode = 500;
        message = 'Database error';
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.details;
  }

  // Custom error messages
  if (err.message) {
    message = err.message;
  }

  // Custom status code
  if (err.statusCode) {
    statusCode = err.statusCode;
  }

  res.status(statusCode).json({
    error: message,
    details: details,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };
