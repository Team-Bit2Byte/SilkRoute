/**
 * Interface for cache management components
 * Defines the contract for translation caching functionality
 */
class CacheManager {
  constructor() {
    if (this.constructor === CacheManager) {
      throw new Error('CacheManager is an abstract class and cannot be instantiated directly');
    }
  }

  /**
   * Retrieve cached translation
   * @param {string} key - Cache key
   * @returns {Object|null} Cached translation object or null if not found
   */
  get(key) {
    throw new Error('get() method must be implemented by subclass');
  }

  /**
   * Store translation in cache
   * @param {string} key - Cache key
   * @param {Object} value - Translation data to cache
   * @param {number} ttl - Time to live in milliseconds (default: 24 hours)
   * @returns {boolean} Success status
   */
  set(key, value, ttl = 86400000) {
    throw new Error('set() method must be implemented by subclass');
  }

  /**
   * Generate cache key from translation parameters
   * @param {string} text - Original text
   * @param {string} sourceLang - Source language code
   * @param {string} targetLang - Target language code
   * @returns {string} Generated cache key
   */
  generateKey(text, sourceLang, targetLang) {
    throw new Error('generateKey() method must be implemented by subclass');
  }

  /**
   * Remove expired entries from cache
   * @returns {number} Number of entries removed
   */
  cleanup() {
    throw new Error('cleanup() method must be implemented by subclass');
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics (hits, misses, size, etc.)
   */
  getStats() {
    throw new Error('getStats() method must be implemented by subclass');
  }

  /**
   * Clear all cache entries
   * @returns {boolean} Success status
   */
  clear() {
    throw new Error('clear() method must be implemented by subclass');
  }

  /**
   * Check if cache key exists
   * @param {string} key - Cache key to check
   * @returns {boolean} True if key exists
   */
  has(key) {
    throw new Error('has() method must be implemented by subclass');
  }
}

module.exports = CacheManager;