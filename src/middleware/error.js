const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack);

  // Check if the request expects JSON
  const isApiRequest = req.path.startsWith('/api/');

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    if (isApiRequest) {
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    return res.status(400).render('error', {
      title: 'Error',
      message: 'Validation Error',
      error: { status: 400, message: messages.join(', ') }
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    if (isApiRequest) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate field value entered'
      });
    }
    return res.status(400).render('error', {
      title: 'Error',
      message: 'Duplicate Entry',
      error: { status: 400, message: 'Duplicate field value entered' }
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    if (isApiRequest) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    return res.status(401).render('error', {
      title: 'Error',
      message: 'Authentication Failed',
      error: { status: 401, message: 'Authentication failed' }
    });
  }

  if (err.name === 'TokenExpiredError') {
    if (isApiRequest) {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }
    return res.status(401).render('error', {
      title: 'Error',
      message: 'Authentication Expired',
      error: { status: 401, message: 'Authentication expired' }
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Server Error';

  if (isApiRequest) {
    return res.status(statusCode).json({
      success: false,
      error: message
    });
  }

  return res.status(statusCode).render('error', {
    title: 'Error',
    message: 'Server Error',
    error: {
      status: statusCode,
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : message
    }
  });
};

module.exports = errorHandler;
