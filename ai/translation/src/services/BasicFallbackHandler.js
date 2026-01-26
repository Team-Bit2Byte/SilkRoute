const FallbackHandler = require('../interfaces/FallbackHandler');
const { logTranslationError, logger } = require('../utils/logger');

/**
 * Basic fallback handler implementation
 * Manages provider switching, error logging, and retry mechanisms
 */
class BasicFallbackHandler extends FallbackHandler {
  constructor() {
    super();
    this.defaultRetryOptions = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000, // 10 seconds
      backoffMultiplier: 2
    };
    this.defaultTimeout = 10000; // 10 seconds
  }

  /**
   * Handle translation provider fallback
   * @param {Array} providers - Array of translation providers in priority order
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language code
   * @param {string} targetLang - Target language code
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Translation result or fallback response
   */
  async handleProviderFallback(providers, text, sourceLang, targetLang, options = {}) {
    const errors = [];
    let lastProvider = null;

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      lastProvider = provider.constructor.name;

      try {
        // Check if provider is available
        const isAvailable = await this.handleTimeout(
          provider.isAvailable(),
          2000, // 2 second timeout for availability check
          `${lastProvider} availability check`
        );

        if (!isAvailable) {
          const error = new Error(`Provider ${lastProvider} is not available`);
          errors.push({ provider: lastProvider, error });
          this.logError(error, 'medium', { 
            provider: lastProvider, 
            operation: 'availability_check',
            text: text.substring(0, 100) + '...'
          });
          continue;
        }

        // Attempt translation with retry mechanism
        const result = await this.retryWithBackoff(
          () => this.handleTimeout(
            provider.translate(text, sourceLang, targetLang),
            this.defaultTimeout,
            `${lastProvider} translation`
          ),
          { ...this.defaultRetryOptions, ...options.retryOptions }
        );

        // Log successful fallback if not the first provider
        if (i > 0) {
          logger.info('Fallback provider succeeded', {
            provider: lastProvider,
            fallbackLevel: i + 1,
            previousErrors: errors.length,
            type: 'fallback_success'
          });
        }

        return {
          ...result,
          provider: lastProvider,
          fallbackUsed: i > 0,
          fallbackLevel: i + 1,
          errors: errors
        };

      } catch (error) {
        errors.push({ provider: lastProvider, error });
        
        const severity = this._determineSeverity(error, i, providers.length);
        this.logError(error, severity, {
          provider: lastProvider,
          operation: 'translation',
          fallbackLevel: i + 1,
          text: text.substring(0, 100) + '...',
          sourceLang,
          targetLang
        });

        // If this is the last provider, we'll return the fallback response
        if (i === providers.length - 1) {
          break;
        }
      }
    }

    // All providers failed, return fallback response
    return this._createFallbackResponse(text, sourceLang, targetLang, errors);
  }

  /**
   * Log error with appropriate severity level
   * @param {Error} error - Error to log
   * @param {string} severity - Error severity (low, medium, high, critical)
   * @param {Object} context - Additional context information
   */
  logError(error, severity, context = {}) {
    const severityLevels = {
      low: 'debug',
      medium: 'warn',
      high: 'error',
      critical: 'error'
    };

    const logLevel = severityLevels[severity] || 'error';
    const logMessage = `${severity.toUpperCase()} severity error: ${error.message}`;

    logger[logLevel](logMessage, {
      error: error.message,
      stack: error.stack,
      severity,
      ...context,
      type: 'fallback_error'
    });
  }

  /**
   * Handle timeout scenarios
   * @param {Promise} operation - Operation that might timeout
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} operationName - Name of the operation for logging
   * @returns {Promise<Object>} Operation result or timeout error
   */
  async handleTimeout(operation, timeoutMs, operationName) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const timeoutError = new Error(`Operation '${operationName}' timed out after ${timeoutMs}ms`);
        timeoutError.code = 'TIMEOUT';
        reject(timeoutError);
      }, timeoutMs);

      operation
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Implement retry mechanism with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {Object} retryOptions - Retry configuration
   * @returns {Promise<Object>} Operation result
   */
  async retryWithBackoff(operation, retryOptions = {}) {
    const options = { ...this.defaultRetryOptions, ...retryOptions };
    let lastError;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if not the first attempt
        if (attempt > 0) {
          logger.info('Operation succeeded after retry', {
            attempt: attempt + 1,
            totalAttempts: options.maxRetries + 1,
            type: 'retry_success'
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry on the last attempt
        if (attempt === options.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          options.baseDelay * Math.pow(options.backoffMultiplier, attempt),
          options.maxDelay
        );

        logger.debug('Operation failed, retrying', {
          attempt: attempt + 1,
          totalAttempts: options.maxRetries + 1,
          delay,
          error: error.message,
          type: 'retry_attempt'
        });

        // Wait before retrying
        await this._sleep(delay);
      }
    }

    // All retries exhausted
    logger.error('Operation failed after all retries', {
      totalAttempts: options.maxRetries + 1,
      finalError: lastError.message,
      type: 'retry_exhausted'
    });

    throw lastError;
  }

  /**
   * Determine error severity based on context
   * @param {Error} error - The error that occurred
   * @param {number} providerIndex - Index of the failed provider
   * @param {number} totalProviders - Total number of providers
   * @returns {string} Severity level
   * @private
   */
  _determineSeverity(error, providerIndex, totalProviders) {
    // Critical if all providers failed
    if (providerIndex === totalProviders - 1) {
      return 'critical';
    }

    // High severity for timeout or network errors
    if (error.code === 'TIMEOUT' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return 'high';
    }

    // Medium severity for API errors
    if (error.message.includes('API') || error.message.includes('rate limit')) {
      return 'medium';
    }

    // Low severity for other errors when fallback is available
    return 'low';
  }

  /**
   * Create fallback response when all providers fail
   * @param {string} text - Original text
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @param {Array} errors - Array of errors from all providers
   * @returns {Object} Fallback response
   * @private
   */
  _createFallbackResponse(text, sourceLang, targetLang, errors) {
    logger.error('All translation providers failed, returning original text', {
      sourceLang,
      targetLang,
      textLength: text.length,
      providerErrors: errors.length,
      type: 'complete_fallback'
    });

    return {
      translatedText: text, // Return original text as fallback
      confidence: 0.1, // Very low confidence
      provider: 'fallback',
      fallbackUsed: true,
      fallbackLevel: errors.length + 1,
      errors,
      metadata: {
        fallbackReason: 'All translation providers failed',
        originalText: text,
        attemptedProviders: errors.map(e => e.provider)
      }
    };
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get retry options for specific error types
   * @param {Error} error - Error to analyze
   * @returns {Object} Customized retry options
   */
  getRetryOptionsForError(error) {
    // Rate limit errors need longer delays
    if (error.message.includes('rate limit')) {
      return {
        ...this.defaultRetryOptions,
        baseDelay: 5000, // 5 seconds
        maxDelay: 30000, // 30 seconds
        maxRetries: 2 // Fewer retries for rate limits
      };
    }

    // Network errors can be retried more aggressively
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        ...this.defaultRetryOptions,
        baseDelay: 500, // 0.5 seconds
        maxRetries: 5 // More retries for network issues
      };
    }

    return this.defaultRetryOptions;
  }
}

module.exports = BasicFallbackHandler;