/**
 * Main entry point for the Multilingual Translation AI Module
 * Exports all components and provides easy initialization
 */

// Core Services
const TranslationService = require('./src/services/TranslationService');
const FrancLanguageDetector = require('./src/services/FrancLanguageDetector');
const LRUCacheManager = require('./src/services/LRUCacheManager');
const HuggingFaceProvider = require('./src/services/HuggingFaceProvider');
const LibreTranslateProvider = require('./src/services/LibreTranslateProvider');
const BasicConfidenceEstimator = require('./src/services/BasicConfidenceEstimator');
const BasicFallbackHandler = require('./src/services/BasicFallbackHandler');

// API Server
const { 
  createTranslationServer, 
  startTranslationServer,
  createTranslationRouter,
  middleware 
} = require('./src/api/server');

// Utilities
const { logger } = require('./src/utils/logger');
const validation = require('./src/utils/validation');

// Configuration
const { supportedLanguages, isLanguageSupported } = require('./src/config/languages');
const { providerConfig } = require('./src/config/providers');

/**
 * Create a fully configured translation service with default settings
 * @param {Object} options - Configuration options
 * @returns {TranslationService} Configured translation service
 */
function createTranslationService(options = {}) {
  const config = {
    // Provider configuration
    huggingfaceApiKey: options.huggingfaceApiKey || process.env.HUGGINGFACE_API_KEY,
    libretranslateApiKey: options.libretranslateApiKey || process.env.LIBRETRANSLATE_API_KEY,
    libretranslateUrl: options.libretranslateUrl || process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com',
    
    // Service configuration
    maxTextLength: options.maxTextLength || 1000,
    chunkSize: options.chunkSize || 800,
    minConfidenceThreshold: options.minConfidenceThreshold || 0.5,
    
    // Cache configuration
    cacheMaxSize: options.cacheMaxSize || 10000,
    cacheTTL: options.cacheTTL || 86400000, // 24 hours
    
    // Provider configuration
    primaryProvider: options.primaryProvider || 'huggingface',
    enableFallback: options.enableFallback !== false,
    
    ...options
  };

  // Initialize components
  const languageDetector = new FrancLanguageDetector();
  
  const cacheManager = new LRUCacheManager({
    maxSize: config.cacheMaxSize,
    ttl: config.cacheTTL
  });

  // Initialize providers
  const providers = [];
  
  if (config.primaryProvider === 'huggingface' || config.enableFallback) {
    if (config.huggingfaceApiKey) {
      providers.push(new HuggingFaceProvider({
        apiKey: config.huggingfaceApiKey,
        timeout: config.providerTimeout || 10000
      }));
    } else {
      logger.warn('HuggingFace API key not provided. HuggingFace provider will not be available.');
    }
  }

  if (config.primaryProvider === 'libretranslate' || config.enableFallback) {
    providers.push(new LibreTranslateProvider({
      apiKey: config.libretranslateApiKey,
      apiUrl: config.libretranslateUrl,
      timeout: config.providerTimeout || 10000
    }));
  }

  if (providers.length === 0) {
    throw new Error('At least one translation provider must be configured. Please provide API keys.');
  }

  const confidenceEstimator = new BasicConfidenceEstimator({
    minConfidence: config.minConfidenceThreshold
  });

  const fallbackHandler = new BasicFallbackHandler({
    maxRetries: config.maxRetries || 2,
    retryDelay: config.retryDelay || 1000
  });

  // Create and return translation service
  return new TranslationService({
    languageDetector,
    cacheManager,
    providers,
    confidenceEstimator,
    fallbackHandler,
    maxTextLength: config.maxTextLength,
    chunkSize: config.chunkSize,
    minConfidenceThreshold: config.minConfidenceThreshold
  });
}

/**
 * Create and start a translation API server
 * @param {Object} options - Server configuration options
 * @returns {Promise<http.Server>} Running server instance
 */
async function startServer(options = {}) {
  const config = {
    port: options.port || process.env.PORT || 3000,
    ...options
  };

  // Create translation service
  const translationService = createTranslationService(config);

  // Log startup information
  logger.info('Starting Multilingual Translation AI Server', {
    port: config.port,
    environment: process.env.NODE_ENV || 'development',
    providers: translationService.providers.map(p => p.constructor.name),
    supportedLanguages: Object.keys(supportedLanguages),
    type: 'server_startup'
  });

  // Start server
  const server = await startTranslationServer(translationService, config);

  logger.info('Server started successfully', {
    port: config.port,
    pid: process.pid,
    type: 'server_ready'
  });

  return server;
}

/**
 * Quick start function for development and testing
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Server and service instances
 */
async function quickStart(options = {}) {
  try {
    const translationService = createTranslationService(options);
    const server = await startTranslationServer(translationService, options);

    return {
      server,
      service: translationService,
      stop: () => {
        return new Promise((resolve) => {
          server.close(() => {
            logger.info('Server stopped', { type: 'server_stopped' });
            resolve();
          });
        });
      }
    };
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
      type: 'startup_error'
    });
    throw error;
  }
}

// Export all components
module.exports = {
  // Main functions
  createTranslationService,
  startServer,
  quickStart,

  // Core Services
  TranslationService,
  FrancLanguageDetector,
  LRUCacheManager,
  HuggingFaceProvider,
  LibreTranslateProvider,
  BasicConfidenceEstimator,
  BasicFallbackHandler,

  // API Server
  createTranslationServer,
  startTranslationServer,
  createTranslationRouter,
  middleware,

  // Utilities
  logger,
  validation,

  // Configuration
  supportedLanguages,
  isLanguageSupported,
  providerConfig
};

// If this file is run directly, start the server
if (require.main === module) {
  startServer()
    .then(server => {
      logger.info('Translation server is running', {
        port: server.address().port,
        type: 'server_running'
      });
    })
    .catch(error => {
      logger.error('Failed to start server', {
        error: error.message,
        stack: error.stack,
        type: 'startup_failure'
      });
      process.exit(1);
    });
}