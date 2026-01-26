/**
 * Interface for language detection components
 * Defines the contract for automatic language identification
 */
class LanguageDetector {
  constructor() {
    if (this.constructor === LanguageDetector) {
      throw new Error('LanguageDetector is an abstract class and cannot be instantiated directly');
    }
  }

  /**
   * Detect the language of the given text
   * @param {string} text - Text to analyze for language detection
   * @returns {Promise<{language: string, confidence: number}>}
   */
  async detect(text) {
    throw new Error('detect() method must be implemented by subclass');
  }

  /**
   * Get list of supported language codes for detection
   * @returns {Array<string>} Array of ISO 639-1 language codes
   */
  getSupportedLanguages() {
    throw new Error('getSupportedLanguages() method must be implemented by subclass');
  }

  /**
   * Validate if text is suitable for language detection
   * @param {string} text - Text to validate
   * @returns {boolean}
   */
  validateText(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }
    
    const trimmed = text.trim();
    return trimmed.length > 0 && trimmed.length <= 10000;
  }

  /**
   * Check if detected language confidence meets minimum threshold
   * @param {number} confidence - Confidence score (0-1)
   * @param {number} threshold - Minimum threshold (default: 0.7)
   * @returns {boolean}
   */
  isConfidenceAcceptable(confidence, threshold = 0.7) {
    return confidence >= threshold;
  }
}

module.exports = LanguageDetector;