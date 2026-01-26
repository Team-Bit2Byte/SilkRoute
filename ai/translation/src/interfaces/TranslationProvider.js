/**
 * Abstract base class for translation providers
 * Defines the interface that all translation providers must implement
 */
class TranslationProvider {
  constructor(name, config = {}) {
    if (this.constructor === TranslationProvider) {
      throw new Error('TranslationProvider is an abstract class and cannot be instantiated directly');
    }
    this.name = name;
    this.config = config;
  }

  /**
   * Translate text from source language to target language
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language code (ISO 639-1)
   * @param {string} targetLang - Target language code (ISO 639-1)
   * @returns {Promise<{translatedText: string, confidence: number}>}
   */
  async translate(text, sourceLang, targetLang) {
    throw new Error('translate() method must be implemented by subclass');
  }

  /**
   * Check if the provider is available and ready to use
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    throw new Error('isAvailable() method must be implemented by subclass');
  }

  /**
   * Get list of supported language codes
   * @returns {Array<string>} Array of ISO 639-1 language codes
   */
  getSupportedLanguages() {
    throw new Error('getSupportedLanguages() method must be implemented by subclass');
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Validate language codes
   * @param {string} sourceLang - Source language code
   * @param {string} targetLang - Target language code
   * @returns {boolean}
   */
  validateLanguages(sourceLang, targetLang) {
    const supported = this.getSupportedLanguages();
    return supported.includes(sourceLang) && supported.includes(targetLang);
  }
}

module.exports = TranslationProvider;