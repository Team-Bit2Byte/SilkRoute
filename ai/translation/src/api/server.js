const express = require('express');
const { createTranslateRouter } = require('./routes/translate');
const { createHealthRouter } = require('./routes/health');
const { logger } = require('../utils/logger');
const { 
  collectRequestMetrics, 
  collectTranslationMetrics, 
  collectErrorMetrics 
} = require('./monitoring/metrics');

// Import middleware
const {
  validateJsonBody,
  validateTranslationParams,
  validateDetectionParams,
  addRequestId,
  validateContentType,
  validateRequestSize
} = require('./middleware/validation');

const {
  logRequests,
  logTranslationMetrics,
  logHealthMetrics,
  addSecurityHeaders,
  addCorsHeaders,
  trackApiUsage
} = require('./middleware/logging');

const {
  globalErrorHandler,
  notFoundHandler,
  asyncErrorHandler,
  timeoutHandler,
  rateLimitErrorHandler,
  addRequestStartTime
} = require('./middleware/errorHandler');

const {
  createTranslationMiddleware,
  autoTranslateMiddleware,
  translationHelpersMiddleware,
  languageDetectionMiddleware
} = require('./middleware/translation');

/**
 * Create and configure Express.js server for translation API
 * @param {TranslationService} translationService - Configured translation service instance
 * @param {Object} options - Server configuration options
 * @returns {express.Application} Configured Express app
 */
function createTranslationServer(translationService, options = {}) {
  const app = express();

  // Server configuration
  const config = {
    port: options.port || process.env.PORT || 3000,
    timeout: options.timeout || 30000, // 30 seconds
    maxRequestSize: options.maxRequestSize || 1024 * 1024, // 1MB
    enableCors: options.enableCors !== false, // Default true
    enableLogging: options.enableLogging !== false, // Default true
    enableSecurity: options.enableSecurity !== false, // Default true
    ...options
  };

  // Trust proxy if behind reverse proxy
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', true);
  }

  // Add request start time for processing time calculation
  app.use(addRequestStartTime);

  // Add request timeout handling
  app.use(timeoutHandler(config.timeout));

  // Add security headers
  if (config.enableSecurity) {
    app.use(addSecurityHeaders);
  }

  // Add CORS headers
  if (config.enableCors) {
    app.use(addCorsHeaders);
  }

  // Add request ID
  app.use(addRequestId);

  // Parse JSON bodies with size limit
  app.use(express.json({ 
    limit: config.maxRequestSize,
    strict: true,
    type: 'application/json'
  }));

  // Validate request size
  app.use(validateRequestSize(config.maxRequestSize));

  // Validate content type for POST requests
  app.use(validateContentType);

  // Validate JSON body structure
  app.use(validateJsonBody);

  // Add request logging and metrics collection
  if (config.enableLogging) {
    app.use(logRequests);
    app.use(trackApiUsage);
    app.use(collectRequestMetrics);
  }

  // Add translation-specific middleware
  app.use('/api/translate', logTranslationMetrics);
  app.use('/api/translate', logHealthMetrics);
  app.use('/api/translate', collectTranslationMetrics);

  // Add validation middleware
  app.use('/api/translate', validateTranslationParams);
  app.use('/api/translate', validateDetectionParams);

  // Rate limiting error handler
  app.use(rateLimitErrorHandler);

  // Error metrics collection
  app.use(collectErrorMetrics);

  // Mount translation routes
  const translateRouter = createTranslateRouter(translationService);
  app.use('/api/translate', translateRouter);

  // Mount health and monitoring routes
  const healthRouter = createHealthRouter(translationService);
  app.use('/api', healthRouter);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Multilingual Translation AI API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        translate: 'POST /api/translate',
        detect: 'POST /api/translate/detect',
        health: 'GET /api/health',
        status: 'GET /api/status',
        metrics: 'GET /api/metrics',
        providers: 'GET /api/providers',
        cache: 'GET /api/cache'
      },
      documentation: 'https://github.com/multilingual-mandi/translation-ai',
      timestamp: Date.now()
    });
  });

  // Health check endpoint at root level
  app.get('/health', asyncErrorHandler(async (req, res) => {
    const health = await translationService.getHealth();
    const statusCode = health.status === 'unhealthy' ? 503 : 200;
    
    res.status(statusCode).json({
      ...health,
      apiVersion: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: Date.now()
    });
  }));

  // 404 handler for unknown routes
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(globalErrorHandler);

  return app;
}

/**
 * Start the translation server
 * @param {TranslationService} translationService - Configured translation service
 * @param {Object} options - Server options
 * @returns {Promise<http.Server>} Running server instance
 */
async function startTranslationServer(translationService, options = {}) {
  const app = createTranslationServer(translationService, options);
  const port = options.port || process.env.PORT || 3000;

  return new Promise((resolve, reject) => {
    const server = app.listen(port, (err) => {
      if (err) {
        logger.error('Failed to start translation server', {
          error: err.message,
          port,
          type: 'server_start_error'
        });
        reject(err);
      } else {
        logger.info('Translation server started successfully', {
          port,
          environment: process.env.NODE_ENV || 'development',
          pid: process.pid,
          uptime: process.uptime(),
          type: 'server_started'
        });
        resolve(server);
      }
    });

    // Handle server errors
    server.on('error', (err) => {
      logger.error('Server error', {
        error: err.message,
        code: err.code,
        port,
        type: 'server_error'
      });
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully', {
        type: 'server_shutdown'
      });
      
      server.close(() => {
        logger.info('Server closed successfully', {
          type: 'server_closed'
        });
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully', {
        type: 'server_shutdown'
      });
      
      server.close(() => {
        logger.info('Server closed successfully', {
          type: 'server_closed'
        });
        process.exit(0);
      });
    });
  });
}

/**
 * Create translation router for integration with existing Express apps
 * @param {TranslationService} translationService - Configured translation service
 * @param {Object} options - Middleware options
 * @returns {Function} Express router function
 */
function createTranslationRouter(translationService, options = {}) {
  const router = express.Router();

  // Apply basic middleware
  router.use(addRequestId);
  router.use(express.json({ limit: options.maxRequestSize || '1mb' }));
  router.use(validateJsonBody);

  // Mount translation routes
  const translateRouter = createTranslateRouter(translationService);
  router.use('/', translateRouter);

  return router;
}

module.exports = {
  createTranslationServer,
  startTranslationServer,
  createTranslationRouter,
  // Export individual middleware functions for flexible integration
  middleware: {
    translation: createTranslationMiddleware,
    autoTranslate: autoTranslateMiddleware,
    helpers: translationHelpersMiddleware,
    languageDetection: languageDetectionMiddleware,
    // Validation middleware
    validateJsonBody,
    validateTranslationParams,
    validateDetectionParams,
    addRequestId,
    validateContentType,
    validateRequestSize,
    // Logging middleware
    logRequests,
    logTranslationMetrics,
    logHealthMetrics,
    addSecurityHeaders,
    addCorsHeaders,
    trackApiUsage,
    // Error handling middleware
    globalErrorHandler,
    notFoundHandler,
    asyncErrorHandler,
    timeoutHandler,
    rateLimitErrorHandler,
    addRequestStartTime,
    // Metrics middleware
    collectRequestMetrics,
    collectTranslationMetrics,
    collectErrorMetrics
  }
};