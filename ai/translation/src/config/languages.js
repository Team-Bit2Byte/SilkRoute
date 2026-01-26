/**
 * Language configuration for the multilingual translation system
 * Defines supported languages and their mappings across different providers
 */

const SUPPORTED_LANGUAGES = {
  'hi': {
    name: 'Hindi',
    code: 'hi',
    nativeName: 'हिन्दी',
    huggingface: 'hi',
    libretranslate: 'hi',
    franc: 'hin'
  },
  'en': {
    name: 'English',
    code: 'en',
    nativeName: 'English',
    huggingface: 'en',
    libretranslate: 'en',
    franc: 'eng'
  },
  'ta': {
    name: 'Tamil',
    code: 'ta',
    nativeName: 'தமிழ்',
    huggingface: 'ta',
    libretranslate: 'ta',
    franc: 'tam'
  },
  'te': {
    name: 'Telugu',
    code: 'te',
    nativeName: 'తెలుగు',
    huggingface: 'te',
    libretranslate: 'te',
    franc: 'tel'
  },
  'bn': {
    name: 'Bengali',
    code: 'bn',
    nativeName: 'বাংলা',
    huggingface: 'bn',
    libretranslate: 'bn',
    franc: 'ben'
  },
  'mr': {
    name: 'Marathi',
    code: 'mr',
    nativeName: 'मराठी',
    huggingface: 'mr',
    libretranslate: 'mr',
    franc: 'mar'
  }
};

const CODE_MIXED_PATTERNS = {
  'hinglish': {
    primary: 'hi',
    secondary: 'en',
    threshold: 0.3,
    description: 'Hindi-English code-mixed text'
  }
};

const DEFAULT_LANGUAGE = 'en';
const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Get all supported language codes
 * @returns {Array<string>} Array of ISO 639-1 language codes
 */
function getSupportedLanguageCodes() {
  return Object.keys(SUPPORTED_LANGUAGES);
}

/**
 * Get language configuration by code
 * @param {string} code - Language code
 * @returns {Object|null} Language configuration or null if not found
 */
function getLanguageConfig(code) {
  return SUPPORTED_LANGUAGES[code] || null;
}

/**
 * Check if language code is supported
 * @param {string} code - Language code to check
 * @returns {boolean} True if supported
 */
function isLanguageSupported(code) {
  return code in SUPPORTED_LANGUAGES;
}

/**
 * Map language code for specific provider
 * @param {string} code - Standard language code
 * @param {string} provider - Provider name (huggingface, libretranslate, franc)
 * @returns {string|null} Provider-specific language code or null
 */
function mapLanguageForProvider(code, provider) {
  const config = getLanguageConfig(code);
  return config ? config[provider] || null : null;
}

/**
 * Get code-mixed pattern configuration
 * @param {string} pattern - Pattern name (e.g., 'hinglish')
 * @returns {Object|null} Pattern configuration or null
 */
function getCodeMixedPattern(pattern) {
  return CODE_MIXED_PATTERNS[pattern] || null;
}

/**
 * Detect if text might be code-mixed based on language detection results
 * @param {Array<Object>} detectionResults - Array of {language, confidence} objects
 * @returns {Object|null} Code-mixed pattern info or null
 */
function detectCodeMixedPattern(detectionResults) {
  if (!detectionResults || detectionResults.length < 2) {
    return null;
  }

  // Check for Hinglish pattern
  const hasHindi = detectionResults.some(r => r.language === 'hi' && r.confidence > 0.2);
  const hasEnglish = detectionResults.some(r => r.language === 'en' && r.confidence > 0.2);
  
  if (hasHindi && hasEnglish) {
    return {
      pattern: 'hinglish',
      ...CODE_MIXED_PATTERNS.hinglish,
      detectedLanguages: detectionResults
    };
  }

  return null;
}

module.exports = {
  SUPPORTED_LANGUAGES,
  CODE_MIXED_PATTERNS,
  DEFAULT_LANGUAGE,
  CONFIDENCE_THRESHOLD,
  getSupportedLanguageCodes,
  getLanguageConfig,
  isLanguageSupported,
  mapLanguageForProvider,
  getCodeMixedPattern,
  detectCodeMixedPattern
};