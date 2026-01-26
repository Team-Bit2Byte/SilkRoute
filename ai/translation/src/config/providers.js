/**
 * Provider configuration for translation services
 * Defines settings and endpoints for external translation APIs
 */

const PROVIDER_CONFIG = {
  huggingface: {
    name: 'HuggingFace',
    baseUrl: 'https://api-inference.huggingface.co/models',
    models: {
      // Using Sarvam AI's translation model for Indian languages
      'sarvam-translate': 'sarvamai/sarvam-translate',
      // Fallback to general multilingual models
      'mbart-large': 'facebook/mbart-large-50-many-to-many-mmt',
      'nllb-200': 'facebook/nllb-200-distilled-600M'
    },
    defaultModel: 'sarvam-translate',
    timeout: 10000,
    retries: 2,
    rateLimit: {
      requests: 100,
      window: 60000 // 1 minute
    },
    headers: {
      'Content-Type': 'application/json'
    }
  },
  
  libretranslate: {
    name: 'LibreTranslate',
    baseUrl: 'https://libretranslate.de/translate',
    // Alternative endpoints for better Indian language support
    alternativeEndpoints: [
      'https://translate.argosopentech.com/translate',
      'https://libretranslate.com/translate'
    ],
    timeout: 10000,
    retries: 2,
    rateLimit: {
      requests: 60,
      window: 60000 // 1 minute
    },
    headers: {
      'Content-Type': 'application/json'
    }
  }
};

const PROVIDER_PRIORITY = ['huggingface', 'libretranslate'];

const TIMEOUT_CONFIG = {
  api: 10000,        // 10 seconds for API requests
  detection: 2000,   // 2 seconds for language detection
  cache: 500,        // 500ms for cache operations
  total: 15000       // 15 seconds total request timeout
};

const RETRY_CONFIG = {
  maxRetries: 2,
  backoffMultiplier: 1.5,
  initialDelay: 1000
};

/**
 * Get provider configuration
 * @param {string} providerName - Name of the provider
 * @returns {Object|null} Provider configuration or null if not found
 */
function getProviderConfig(providerName) {
  return PROVIDER_CONFIG[providerName] || null;
}

/**
 * Get all available provider names
 * @returns {Array<string>} Array of provider names
 */
function getAvailableProviders() {
  return Object.keys(PROVIDER_CONFIG);
}

/**
 * Get provider priority order
 * @returns {Array<string>} Array of provider names in priority order
 */
function getProviderPriority() {
  return [...PROVIDER_PRIORITY];
}

/**
 * Get timeout configuration
 * @param {string} type - Timeout type (api, detection, cache, total)
 * @returns {number} Timeout in milliseconds
 */
function getTimeout(type) {
  return TIMEOUT_CONFIG[type] || TIMEOUT_CONFIG.total;
}

/**
 * Get retry configuration
 * @returns {Object} Retry configuration object
 */
function getRetryConfig() {
  return { ...RETRY_CONFIG };
}

/**
 * Calculate backoff delay for retries
 * @param {number} attempt - Current attempt number (0-based)
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {number} multiplier - Backoff multiplier
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt, baseDelay = RETRY_CONFIG.initialDelay, multiplier = RETRY_CONFIG.backoffMultiplier) {
  return Math.floor(baseDelay * Math.pow(multiplier, attempt));
}

/**
 * Validate provider configuration
 * @param {string} providerName - Provider name to validate
 * @returns {boolean} True if configuration is valid
 */
function validateProviderConfig(providerName) {
  const config = getProviderConfig(providerName);
  if (!config) return false;
  
  return !!(config.name && config.baseUrl && config.timeout);
}

module.exports = {
  PROVIDER_CONFIG,
  PROVIDER_PRIORITY,
  TIMEOUT_CONFIG,
  RETRY_CONFIG,
  getProviderConfig,
  getAvailableProviders,
  getProviderPriority,
  getTimeout,
  getRetryConfig,
  calculateBackoffDelay,
  validateProviderConfig
};