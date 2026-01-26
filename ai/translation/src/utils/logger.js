/**
 * Centralized logging utility for the translation service
 * Provides structured logging with different severity levels
 */

const winston = require('winston');
const path = require('path');

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
};

// Add colors to winston
winston.addColors(logColors);

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'multilingual-translation-ai'
  },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          let log = `${timestamp} [${service}] ${level}: ${message}`;
          
          // Add metadata if present
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          if (metaStr) {
            log += `\n${metaStr}`;
          }
          
          return log;
        })
      )
    }),
    
    // Write error logs to file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write all logs to combined file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

/**
 * Log translation request
 * @param {string} text - Original text
 * @param {string} sourceLang - Source language
 * @param {string} targetLang - Target language
 * @param {string} provider - Translation provider used
 */
function logTranslationRequest(text, sourceLang, targetLang, provider) {
  logger.info('Translation request', {
    textLength: text.length,
    sourceLang,
    targetLang,
    provider,
    type: 'translation_request'
  });
}

/**
 * Log translation success
 * @param {string} provider - Translation provider used
 * @param {number} confidence - Translation confidence score
 * @param {number} duration - Request duration in milliseconds
 * @param {boolean} cached - Whether result was cached
 */
function logTranslationSuccess(provider, confidence, duration, cached = false) {
  logger.info('Translation completed successfully', {
    provider,
    confidence,
    duration,
    cached,
    type: 'translation_success'
  });
}

/**
 * Log translation error
 * @param {Error} error - Error object
 * @param {string} provider - Translation provider that failed
 * @param {Object} context - Additional context information
 */
function logTranslationError(error, provider, context = {}) {
  logger.error('Translation failed', {
    error: error.message,
    stack: error.stack,
    provider,
    ...context,
    type: 'translation_error'
  });
}

/**
 * Log language detection
 * @param {string} text - Text that was analyzed
 * @param {string} detectedLang - Detected language
 * @param {number} confidence - Detection confidence
 */
function logLanguageDetection(text, detectedLang, confidence) {
  logger.debug('Language detection', {
    textLength: text.length,
    detectedLang,
    confidence,
    type: 'language_detection'
  });
}

/**
 * Log cache operation
 * @param {string} operation - Cache operation (hit, miss, set, evict)
 * @param {string} key - Cache key
 * @param {Object} metadata - Additional metadata
 */
function logCacheOperation(operation, key, metadata = {}) {
  logger.debug('Cache operation', {
    operation,
    key: key.substring(0, 50) + '...', // Truncate long keys
    ...metadata,
    type: 'cache_operation'
  });
}

/**
 * Log API provider status
 * @param {string} provider - Provider name
 * @param {boolean} available - Whether provider is available
 * @param {number} responseTime - Response time in milliseconds
 */
function logProviderStatus(provider, available, responseTime) {
  const level = available ? 'info' : 'warn';
  logger[level]('Provider status check', {
    provider,
    available,
    responseTime,
    type: 'provider_status'
  });
}

/**
 * Log performance metrics
 * @param {Object} metrics - Performance metrics object
 */
function logPerformanceMetrics(metrics) {
  logger.info('Performance metrics', {
    ...metrics,
    type: 'performance_metrics'
  });
}

/**
 * Log system health check
 * @param {Object} healthStatus - Health status object
 */
function logHealthCheck(healthStatus) {
  const level = healthStatus.status === 'healthy' ? 'info' : 'warn';
  logger[level]('Health check', {
    ...healthStatus,
    type: 'health_check'
  });
}

/**
 * Log confidence calculation
 * @param {Object} translationData - Translation data used for calculation
 * @param {number} confidenceScore - Calculated confidence score
 * @param {string} notes - Additional notes about the calculation
 */
function logConfidenceCalculation(translationData, confidenceScore, notes) {
  logger.debug('Confidence calculation', {
    originalLength: translationData.originalText?.length || 0,
    translatedLength: translationData.translatedText?.length || 0,
    sourceLang: translationData.sourceLang,
    targetLang: translationData.targetLang,
    confidenceScore,
    notes,
    type: 'confidence_calculation'
  });
}

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = {
  logger,
  logTranslationRequest,
  logTranslationSuccess,
  logTranslationError,
  logLanguageDetection,
  logCacheOperation,
  logProviderStatus,
  logPerformanceMetrics,
  logHealthCheck,
  logConfidenceCalculation
};