const { logger } = require('../../utils/logger');

/**
 * Express.js middleware for request logging and monitoring
 */

/**
 * Middleware to log incoming requests
 */
function logRequests(req, res, next) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'];

  // Log request start
  logger.info('Request started', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    contentLength: req.headers['content-length'],
    type: 'request_start'
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const processingTime = Date.now() - startTime;
    
    // Log response
    logger.info('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      processingTime,
      contentLength: res.get('content-length'),
      type: 'request_end'
    });

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Middleware to log translation-specific metrics
 */
function logTranslationMetrics(req, res, next) {
  if (req.path === '/translate' && req.method === 'POST') {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'];

    // Override res.json to capture translation metrics
    const originalJson = res.json;
    res.json = function(data) {
      const processingTime = Date.now() - startTime;

      if (res.statusCode === 200 && data.translatedText) {
        // Log successful translation metrics
        logger.info('Translation metrics', {
          requestId,
          sourceLang: data.sourceLang,
          targetLang: data.targetLang,
          textLength: data.originalText ? data.originalText.length : 0,
          translatedLength: data.translatedText.length,
          confidence: data.confidenceScore,
          provider: data.provider,
          cached: data.cached,
          fallbackUsed: data.fallbackUsed,
          processingTime: data.processingTime,
          totalTime: processingTime,
          chunked: data.metadata && data.metadata.chunked,
          chunkCount: data.metadata && data.metadata.chunkCount,
          type: 'translation_metrics'
        });
      } else if (res.statusCode >= 400) {
        // Log error metrics
        logger.warn('Translation error metrics', {
          requestId,
          statusCode: res.statusCode,
          errorCode: data.error && data.error.code,
          errorMessage: data.error && data.error.message,
          processingTime,
          type: 'translation_error_metrics'
        });
      }

      // Call original json method
      originalJson.call(this, data);
    };
  }

  next();
}

/**
 * Middleware to log health check metrics
 */
function logHealthMetrics(req, res, next) {
  if (req.path === '/health' && req.method === 'GET') {
    const requestId = req.headers['x-request-id'];

    // Override res.json to capture health metrics
    const originalJson = res.json;
    res.json = function(data) {
      if (data.status) {
        const availableProviders = data.providers ? 
          Object.keys(data.providers).filter(p => data.providers[p].status === 'available').length : 0;
        const totalProviders = data.providers ? Object.keys(data.providers).length : 0;

        logger.info('Health check metrics', {
          requestId,
          status: data.status,
          availableProviders,
          totalProviders,
          cacheStatus: data.cache && data.cache.status,
          cacheSize: data.cache && data.cache.size,
          languageDetectorStatus: data.languageDetector && data.languageDetector.status,
          type: 'health_metrics'
        });
      }

      // Call original json method
      originalJson.call(this, data);
    };
  }

  next();
}

/**
 * Middleware to add security headers
 */
function addSecurityHeaders(req, res, next) {
  // Add security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'",
    'X-API-Version': '1.0.0'
  });

  next();
}

/**
 * Middleware to add CORS headers for API access
 */
function addCorsHeaders(req, res, next) {
  // Add CORS headers
  res.set({
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Expose-Headers': 'X-Request-ID, X-API-Version',
    'Access-Control-Max-Age': '86400' // 24 hours
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
}

/**
 * Middleware to track API usage statistics
 */
function trackApiUsage(req, res, next) {
  const requestId = req.headers['x-request-id'];
  
  // Track request by endpoint
  const endpoint = `${req.method} ${req.path}`;
  
  logger.debug('API usage tracked', {
    requestId,
    endpoint,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    timestamp: Date.now(),
    type: 'api_usage'
  });

  next();
}

module.exports = {
  logRequests,
  logTranslationMetrics,
  logHealthMetrics,
  addSecurityHeaders,
  addCorsHeaders,
  trackApiUsage
};