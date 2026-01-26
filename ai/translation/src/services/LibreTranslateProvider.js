/**
 * LibreTranslate Translation Provider
 * Integrates with LibreTranslate API for translation services
 */

const axios = require('axios');
const TranslationProvider = require('../interfaces/TranslationProvider');
const { getProviderConfig, getTimeout, calculateBackoffDelay } = require('../config/providers');
const { getSupportedLanguageCodes } = require('../config/languages');
const logger = require('../utils/logger');

class LibreTranslateProvider extends TranslationProvider {
  constructor(apiKey = null) {
    super('LibreTranslate');
    this.config = getProviderConfig('libretranslate');
    this.apiKey = apiKey || process.env.LIBRETRANSLATE_API_KEY;
    this.supportedLanguages = getSupportedLanguageCodes();
    this.currentEndpointIndex = 0;
    this.rateLimitTracker = {
      requests: 0,
      windowStart: Date.now()
    };
  }

  /**
   * Translate text using LibreTranslate API
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language code
   * @param {string} targetLang - Target language code
   * @returns {Promise<{translatedText: string, confidence: number}>}
   */
  async translate(text, sourceLang, targetLang) {
    if (!this.validateLanguages(sourceLang, targetLang)) {
      throw new Error(`Unsupported language pair: ${sourceLang} -> ${targetLang}`);
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Check rate limits
    this._checkRateLimit();

    const endpoints = this._getEndpoints();
    let lastError;

    // Try each endpoint with retries
    for (const endpoint of endpoints) {
      for (let attempt = 0; attempt <= this.config.retries; attempt++) {
        try {
          if (attempt > 0) {
            const delay = calculateBackoffDelay(attempt - 1);
            logger.info(`LibreTranslate retry attempt ${attempt} for ${endpoint} after ${delay}ms delay`);
            await this._sleep(delay);
          }

          const response = await this._makeRequest(endpoint, text, sourceLang, targetLang);
          const translatedText = this._extractTranslation(response);
          const confidence = this._calculateConfidence(text, translatedText, response);

          logger.info(`LibreTranslate translation successful: ${sourceLang} -> ${targetLang} via ${endpoint}`);
          return { translatedText, confidence };

        } catch (error) {
          lastError = error;
          logger.warn(`LibreTranslate attempt ${attempt + 1} failed for ${endpoint}: ${error.message}`);
          
          // Don't retry on certain errors
          if (this._isNonRetryableError(error)) {
            break;
          }
        }
      }
    }

    logger.error(`LibreTranslate translation failed after trying all endpoints: ${lastError.message}`);
    throw lastError;
  }

  /**
   * Check if LibreTranslate API is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const endpoint = this._getEndpoints()[0];
      
      const response = await axios.post(endpoint, {
        q: 'test',
        source: 'en',
        target: 'hi',
        format: 'text'
      }, {
        headers: this._getHeaders(),
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      return response.status === 200;
    } catch (error) {
      logger.warn(`LibreTranslate availability check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get supported language codes
   * @returns {Array<string>}
   */
  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  /**
   * Get available endpoints in priority order
   * @private
   */
  _getEndpoints() {
    const endpoints = [this.config.baseUrl];
    if (this.config.alternativeEndpoints) {
      endpoints.push(...this.config.alternativeEndpoints);
    }
    return endpoints;
  }

  /**
   * Make HTTP request to LibreTranslate API
   * @private
   */
  async _makeRequest(endpoint, text, sourceLang, targetLang) {
    try {
      const requestData = {
        q: text,
        source: this._mapLanguageCode(sourceLang),
        target: this._mapLanguageCode(targetLang),
        format: 'text'
      };

      // Add API key if available
      if (this.apiKey) {
        requestData.api_key = this.apiKey;
      }

      const response = await axios.post(endpoint, requestData, {
        headers: this._getHeaders(),
        timeout: getTimeout('api'),
        validateStatus: (status) => status < 500
      });

      this._updateRateLimit();

      if (response.status >= 400) {
        const errorMessage = response.data?.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`LibreTranslate API error: ${errorMessage}`);
      }

      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('LibreTranslate API request timeout');
      }
      throw error;
    }
  }

  /**
   * Extract translation from API response
   * @private
   */
  _extractTranslation(response) {
    if (response.translatedText) {
      return response.translatedText;
    }

    if (typeof response === 'string') {
      return response;
    }

    throw new Error('Invalid response format from LibreTranslate API');
  }

  /**
   * Calculate confidence score based on response
   * @private
   */
  _calculateConfidence(originalText, translatedText, response) {
    let confidence = 0.6; // Base confidence for LibreTranslate

    // Adjust based on translation length ratio
    const lengthRatio = translatedText.length / originalText.length;
    if (lengthRatio < 0.3 || lengthRatio > 3.0) {
      confidence -= 0.2;
    }

    // Check if translation is identical to original (possible failure)
    if (translatedText.toLowerCase() === originalText.toLowerCase()) {
      confidence = 0.3;
    }

    // Check for API confidence scores (if available)
    if (response.confidence !== undefined) {
      confidence = Math.max(confidence, response.confidence);
    }

    // Ensure confidence is within bounds
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Map language codes to LibreTranslate format
   * @private
   */
  _mapLanguageCode(langCode) {
    // LibreTranslate uses standard ISO 639-1 codes
    const mapping = {
      'hi': 'hi',
      'en': 'en',
      'ta': 'ta',
      'te': 'te',
      'bn': 'bn',
      'mr': 'mr'
    };

    return mapping[langCode] || langCode;
  }

  /**
   * Get request headers
   * @private
   */
  _getHeaders() {
    const headers = { ...this.config.headers };
    
    // LibreTranslate doesn't require special headers for API key
    // API key is sent in request body
    
    return headers;
  }

  /**
   * Check rate limits
   * @private
   */
  _checkRateLimit() {
    const now = Date.now();
    const windowDuration = this.config.rateLimit.window;

    // Reset window if expired
    if (now - this.rateLimitTracker.windowStart > windowDuration) {
      this.rateLimitTracker.requests = 0;
      this.rateLimitTracker.windowStart = now;
    }

    // Check if rate limit exceeded
    if (this.rateLimitTracker.requests >= this.config.rateLimit.requests) {
      const resetTime = this.rateLimitTracker.windowStart + windowDuration;
      const waitTime = resetTime - now;
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds`);
    }
  }

  /**
   * Update rate limit tracker
   * @private
   */
  _updateRateLimit() {
    this.rateLimitTracker.requests++;
  }

  /**
   * Check if error should not be retried
   * @private
   */
  _isNonRetryableError(error) {
    const nonRetryableMessages = [
      'Rate limit exceeded',
      'Unsupported language pair',
      'Text cannot be empty',
      'Invalid API key',
      'Bad request'
    ];

    return nonRetryableMessages.some(msg => error.message.includes(msg));
  }

  /**
   * Sleep utility for delays
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = LibreTranslateProvider;