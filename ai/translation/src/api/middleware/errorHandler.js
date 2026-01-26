const { logger } = require('../../utils/logger');

/**
 * Express.js middleware for error handling
 */

/**
 * Global error handler middleware
 * Must be the last middleware in the chain
 */
function globalErrorHandler(err, req, res, next) {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const startTime = req.startTime || Date.now();
  const processingTime = Date.now() - startTime;

  // Log the error
  logger.error('Unhandled error in API request', {
    requestId,
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
    headers: req.headers,
    processingTime,
    type: 'unhandled_error'
  });

  // Determine error type and response
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let errorMessage = 'An internal server error occurred';
  let details = undefined;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    errorMessage = 'Request validation failed';
    details = { validationErrors: err.errors };
  } else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    errorMessage = 'Invalid JSON in request body';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    errorCode = 'REQUEST_TOO_LARGE';
    errorMessage = 'Request body too large';
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    statusCode = 503;
    errorCode = 'SERVICE_UNAVAILABLE';
    errorMessage = 'External service unavailable';
  } else if (err.name === 'TimeoutError') {
    statusCode = 504;
    errorCode = 'GATEWAY_TIMEOUT';
    errorMessage = 'Request timeout';
  } else if (err.statusCode && err.statusCode >= 400 && err.statusCode < 600) {
    // Use error's status code if it's a valid HTTP status
    statusCode = err.statusCode;
    errorCode = err.code || 'HTTP_ERROR';
    errorMessage = err.message || errorMessage;
  }

  // Add development details if in development mode
  if (process.env.NODE_ENV === 'development') {
    details = {
      ...details,
      originalError: err.message,
      stack: err.stack,
      errorName: err.name,
      errorCode: err.code
    };
  }

  // Send error response
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: errorMessage,
      details: details
    },
    requestId,
    timestamp: Date.now(),
    processingTime
  });
}

/**
 * Middleware to handle 404 errors (route not found)
 */
function notFoundHandler(req, res, next) {
  const requestId = req.headers['x-request-id'] || 'unknown';

  logger.warn('Route not found', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    type: 'route_not_found'
  });

  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      details: {
        method: req.method,
        path: req.path,
        availableRoutes: [
          'POST /api/translate',
          'GET /api/translate/health',
          'POST /api/translate/detect'
        ]
      }
    },
    requestId,
    timestamp: Date.now()
  });
}

/**
 * Middleware to handle async errors
 * Wraps async route handlers to catch rejected promises
 */
function asyncErrorHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware to handle timeout errors
 */
function timeoutHandler(timeout = 30000) { // Default 30 seconds
  return (req, res, next) => {
    const requestId = req.headers['x-request-id'] || 'unknown';
    
    // Set timeout for the request
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.error('Request timeout', {
          requestId,
          method: req.method,
          path: req.path,
          timeout,
          type: 'request_timeout'
        });

        res.status(504).json({
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timed out',
            details: {
              timeout: timeout,
              timeoutUnit: 'milliseconds'
            }
          },
          requestId,
          timestamp: Date.now()
        });
      }
    }, timeout);

    // Clear timeout when response is sent
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      clearTimeout(timer);
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

/**
 * Middleware to handle rate limiting errors
 */
function rateLimitErrorHandler(err, req, res, next) {
  if (err && err.type === 'rate-limit') {
    const requestId = req.headers['x-request-id'] || 'unknown';

    logger.warn('Rate limit exceeded', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      limit: err.limit,
      current: err.current,
      resetTime: err.resetTime,
      type: 'rate_limit_exceeded'
    });

    return res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        details: {
          limit: err.limit,
          current: err.current,
          resetTime: err.resetTime,
          retryAfter: Math.ceil((err.resetTime - Date.now()) / 1000)
        }
      },
      requestId,
      timestamp: Date.now()
    });
  }

  next(err);
}

/**
 * Middleware to add request start time for processing time calculation
 */
function addRequestStartTime(req, res, next) {
  req.startTime = Date.now();
  next();
}

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  asyncErrorHandler,
  timeoutHandler,
  rateLimitErrorHandler,
  addRequestStartTime
};