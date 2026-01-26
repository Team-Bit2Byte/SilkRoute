const { logger } = require('../../utils/logger');
const { validateTranslationRequest } = require('../../utils/validation');

/**
 * Express.js middleware for request validation
 */

/**
 * Middleware to validate JSON request body
 */
function validateJsonBody(req, res, next) {
  if (req.method === 'POST' && (!req.body || typeof req.body !== 'object')) {
    logger.warn('Invalid JSON body', {
      method: req.method,
      path: req.path,
      contentType: req.headers['content-type'],
      body: req.body,
      type: 'validation_error'
    });

    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON',
        details: {
          contentType: req.headers['content-type'],
          received: typeof req.body
        }
      },
      timestamp: Date.now()
    });
  }

  next();
}

/**
 * Middleware to validate translation request parameters
 */
function validateTranslationParams(req, res, next) {
  if (req.path === '/translate' && req.method === 'POST') {
    const validation = validateTranslationRequest(req.body);
    
    if (!validation.valid) {
      logger.warn('Translation request validation failed', {
        path: req.path,
        errors: validation.errors,
        body: {
          text: req.body.text ? req.body.text.substring(0, 50) + '...' : undefined,
          targetLang: req.body.targetLang,
          sourceLang: req.body.sourceLang
        },
        type: 'validation_error'
      });

      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Request validation failed',
          details: validation.errors
        },
        timestamp: Date.now()
      });
    }

    // Add validated data to request for downstream use
    req.validatedData = {
      text: req.body.text.trim(),
      targetLang: req.body.targetLang.toLowerCase(),
      sourceLang: req.body.sourceLang ? req.body.sourceLang.toLowerCase() : null,
      options: req.body.options || {}
    };
  }

  next();
}

/**
 * Middleware to validate language detection request parameters
 */
function validateDetectionParams(req, res, next) {
  if (req.path === '/detect' && req.method === 'POST') {
    if (!req.body.text || typeof req.body.text !== 'string') {
      logger.warn('Language detection validation failed', {
        path: req.path,
        textType: typeof req.body.text,
        textLength: req.body.text ? req.body.text.length : 0,
        type: 'validation_error'
      });

      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Text is required and must be a string',
          details: {
            field: 'text',
            received: typeof req.body.text,
            expected: 'string'
          }
        },
        timestamp: Date.now()
      });
    }

    const text = req.body.text.trim();
    if (text.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Text cannot be empty or whitespace only',
          details: {
            field: 'text',
            length: text.length
          }
        },
        timestamp: Date.now()
      });
    }

    // Add validated data to request
    req.validatedData = {
      text: text
    };
  }

  next();
}

/**
 * Middleware to add request ID if not present
 */
function addRequestId(req, res, next) {
  if (!req.headers['x-request-id']) {
    const requestId = `${req.method.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.headers['x-request-id'] = requestId;
  }

  // Add request ID to response headers
  res.set('X-Request-ID', req.headers['x-request-id']);
  
  next();
}

/**
 * Middleware to validate content type for POST requests
 */
function validateContentType(req, res, next) {
  if (req.method === 'POST') {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !contentType.includes('application/json')) {
      logger.warn('Invalid content type', {
        method: req.method,
        path: req.path,
        contentType: contentType,
        type: 'validation_error'
      });

      return res.status(400).json({
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'Content-Type must be application/json',
          details: {
            received: contentType,
            expected: 'application/json'
          }
        },
        timestamp: Date.now()
      });
    }
  }

  next();
}

/**
 * Middleware to validate request size
 */
function validateRequestSize(maxSize = 1024 * 1024) { // Default 1MB
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      logger.warn('Request too large', {
        path: req.path,
        contentLength: contentLength,
        maxSize: maxSize,
        type: 'validation_error'
      });

      return res.status(413).json({
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: 'Request body too large',
          details: {
            received: contentLength,
            maximum: maxSize
          }
        },
        timestamp: Date.now()
      });
    }

    next();
  };
}

module.exports = {
  validateJsonBody,
  validateTranslationParams,
  validateDetectionParams,
  addRequestId,
  validateContentType,
  validateRequestSize
};