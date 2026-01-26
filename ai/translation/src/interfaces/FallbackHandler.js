/**
 * Interface for handling fallback scenarios in translation service
 * Manages provider switching, error logging, and retry mechanisms
 */
class FallbackHandler {
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
    throw new Error('handleProviderFallback method must be implemented');
  }

  /**
   * Log error with appropriate severity level
   * @param {Error} error - Error to log
   * @param {string} severity - Error severity (low, medium, high, critical)
   * @param {Object} context - Additional context information
   */
  logError(error, severity, context = {}) {
    throw new Error('logError method must be implemented');
  }

  /**
   * Handle timeout scenarios
   * @param {Promise} operation - Operation that might timeout
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} operationName - Name of the operation for logging
   * @returns {Promise<Object>} Operation result or timeout error
   */
  async handleTimeout(operation, timeoutMs, operationName) {
    throw new Error('handleTimeout method must be implemented');
  }

  /**
   * Implement retry mechanism with exponential backoff
   * @param {Function} operation - Operation to retry
   * @param {Object} retryOptions - Retry configuration
   * @returns {Promise<Object>} Operation result
   */
  async retryWithBackoff(operation, retryOptions = {}) {
    throw new Error('retryWithBackoff method must be implemented');
  }
}

module.exports = FallbackHandler;