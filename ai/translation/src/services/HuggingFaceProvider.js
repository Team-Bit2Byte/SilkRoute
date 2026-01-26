/**
 * HuggingFace Translation Provider
 * Integrates with HuggingFace Transformers API for translation services
 */

const axios = require('axios');
const TranslationProvider = require('../interfaces/TranslationProvider');
const { getProviderConfig, getTimeout, calculateBackoffDelay } = require('../config/providers');
const { getSupportedLanguageCodes } = require('../config/languages');
const logger = require('../utils/logger');

class HuggingFaceProvider extends TranslationProvider {
  constructor(apiKey = null) {
    super('HuggingFace');
    this.config = getProviderConfig('huggingface');
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY;
    this.supportedLanguages = getSupportedLanguageCodes();
    this.rateLimitTracker = {
      requests: 0,
      windowStart: Date.now()
    };
  }

  /**
   * Translate text using HuggingFace API
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

    const model = this._selectModel(sourceLang, targetLang);
    const url = `${this.config.baseUrl}/${model}`;

    let lastError;
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = calculateBackoffDelay(attempt - 1);
          logger.info(`HuggingFace retry attempt ${attempt} after ${delay}ms delay`);
          await this._sleep(delay);
        }

        const response = await this._makeRequest(url, text, sourceLang, targetLang);
        const translatedText = this._extractTranslation(response);
        const confidence = this._calculateConfidence(text, translatedText, response);

        logger.info(`HuggingFace translation successful: ${sourceLang} -> ${targetLang}`);
        return { translatedText, confidence };

      } catch (error) {
        lastError = error;
        logger.warn(`HuggingFace attempt ${attempt + 1} failed: ${error.message}`);
        
        // Don't retry on certain errors
        if (this._isNonRetryableError(error)) {
          break;
        }
      }
    }

    logger.error(`HuggingFace translation failed after ${this.config.retries + 1} attempts: ${lastError.message}`);
    throw lastError;
  }

  /**
   * Check if HuggingFace API is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const testUrl = `${this.config.baseUrl}/${this.config.models[this.config.defaultModel]}`;
      
      const response = await axios.post(testUrl, {
        inputs: 'test',
        parameters: {
          src_lang: 'en',
          tgt_lang: 'hi'
        }
      }, {
        headers: this._getHeaders(),
        timeout: 5000,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });

      return response.status !== 503; // 503 = Service Unavailable
    } catch (error) {
      logger.warn(`HuggingFace availability check failed: ${error.message}`);
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
   * Make HTTP request to HuggingFace API
   * @private
   */
  async _makeRequest(url, text, sourceLang, targetLang) {
    try {
      const response = await axios.post(url, {
        inputs: text,
        parameters: {
          src_lang: this._mapLanguageCode(sourceLang),
          tgt_lang: this._mapLanguageCode(targetLang),
          max_length: Math.min(text.length * 2, 1000)
        }
      }, {
        headers: this._getHeaders(),
        timeout: getTimeout('api'),
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });

      this._updateRateLimit();

      if (response.status >= 400) {
        const errorMessage = response.data?.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(`HuggingFace API error: ${errorMessage}`);
      }

      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('HuggingFace API request timeout');
      }
      throw error;
    }
  }

  /**
   * Extract translation from API response
   * @private
   */
  _extractTranslation(response) {
    if (Array.isArray(response) && response.length > 0) {
      // Handle array response format
      const result = response[0];
      if (result.translation_text) {
        return result.translation_text;
      }
      if (result.generated_text) {
        return result.generated_text;
      }
    }

    if (response.translation_text) {
      return response.translation_text;
    }

    if (response.generated_text) {
      return response.generated_text;
    }

    throw new Error('Invalid response format from HuggingFace API');
  }

  /**
   * Calculate confidence score based on response
   * @private
   */
  _calculateConfidence(originalText, translatedText, response) {
    let confidence = 0.7; // Base confidence for HuggingFace

    // Adjust based on translation length ratio
    const lengthRatio = translatedText.length / originalText.length;
    if (lengthRatio < 0.3 || lengthRatio > 3.0) {
      confidence -= 0.2;
    }

    // Check for API confidence scores
    if (Array.isArray(response) && response[0]?.score) {
      confidence = Math.max(confidence, response[0].score);
    }

    // Ensure confidence is within bounds
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Select appropriate model based on language pair
   * @private
   */
  _selectModel(sourceLang, targetLang) {
    // Use Sarvam model for Indian languages
    const indianLanguages = ['hi', 'ta', 'te', 'bn', 'mr'];
    if (indianLanguages.includes(sourceLang) || indianLanguages.includes(targetLang)) {
      return this.config.models['sarvam-translate'];
    }

    // Use NLLB for other language pairs
    return this.config.models['nllb-200'];
  }

  /**
   * Map language codes to HuggingFace format
   * @private
   */
  _mapLanguageCode(langCode) {
    const mapping = {
      'hi': 'hin_Deva',
      'en': 'eng_Latn',
      'ta': 'tam_Taml',
      'te': 'tel_Telu',
      'bn': 'ben_Beng',
      'mr': 'mar_Deva'
    };

    return mapping[langCode] || langCode;
  }

  /**
   * Get request headers
   * @private
   */
  _getHeaders() {
    const headers = { ...this.config.headers };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

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
      'Invalid API key'
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

module.exports = HuggingFaceProvider;