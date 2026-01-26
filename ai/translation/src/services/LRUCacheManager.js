/**
 * LRU Cache Manager Implementation
 * Provides Least Recently Used cache with TTL support for translation caching
 */

const CacheManager = require('../interfaces/CacheManager');
const crypto = require('crypto');

/**
 * Node class for doubly linked list used in LRU implementation
 */
class CacheNode {
  constructor(key, value, ttl) {
    this.key = key;
    this.value = value;
    this.expiresAt = Date.now() + ttl;
    this.prev = null;
    this.next = null;
  }

  /**
   * Check if the node has expired
   * @returns {boolean} True if expired
   */
  isExpired() {
    return Date.now() > this.expiresAt;
  }
}

/**
 * LRU Cache Manager with TTL support
 * Implements Least Recently Used eviction policy with time-based expiration
 */
class LRUCacheManager extends CacheManager {
  constructor(maxSize = 10000, defaultTTL = 86400000) { // 24 hours default TTL
    super();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0
    };

    // Create dummy head and tail nodes for doubly linked list
    this.head = new CacheNode('head', null, 0);
    this.tail = new CacheNode('tail', null, 0);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Add node right after head
   * @param {CacheNode} node - Node to add
   */
  _addNode(node) {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next.prev = node;
    this.head.next = node;
  }

  /**
   * Remove an existing node from the linked list
   * @param {CacheNode} node - Node to remove
   */
  _removeNode(node) {
    const prevNode = node.prev;
    const nextNode = node.next;
    prevNode.next = nextNode;
    nextNode.prev = prevNode;
  }

  /**
   * Move certain node to the head
   * @param {CacheNode} node - Node to move to head
   */
  _moveToHead(node) {
    this._removeNode(node);
    this._addNode(node);
  }

  /**
   * Pop the current tail
   * @returns {CacheNode} The tail node
   */
  _popTail() {
    const lastNode = this.tail.prev;
    this._removeNode(lastNode);
    return lastNode;
  }

  /**
   * Retrieve cached translation
   * @param {string} key - Cache key
   * @returns {Object|null} Cached translation object or null if not found
   */
  get(key) {
    const node = this.cache.get(key);
    
    if (!node) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (node.isExpired()) {
      this.cache.delete(key);
      this._removeNode(node);
      this.stats.misses++;
      this.stats.expirations++;
      return null;
    }

    // Move the accessed node to the head
    this._moveToHead(node);
    this.stats.hits++;
    return node.value;
  }

  /**
   * Store translation in cache
   * @param {string} key - Cache key
   * @param {Object} value - Translation data to cache
   * @param {number} ttl - Time to live in milliseconds
   * @returns {boolean} Success status
   */
  set(key, value, ttl = this.defaultTTL) {
    try {
      const existingNode = this.cache.get(key);

      if (existingNode) {
        // Update existing node
        existingNode.value = value;
        existingNode.expiresAt = Date.now() + ttl;
        this._moveToHead(existingNode);
        return true;
      }

      const newNode = new CacheNode(key, value, ttl);

      // Check if we need to evict
      if (this.cache.size >= this.maxSize) {
        // Remove from the tail
        const tail = this._popTail();
        this.cache.delete(tail.key);
        this.stats.evictions++;
      }

      this._addNode(newNode);
      this.cache.set(key, newNode);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate cache key from translation parameters
   * @param {string} text - Original text
   * @param {string} sourceLang - Source language code
   * @param {string} targetLang - Target language code
   * @returns {string} Generated cache key
   */
  generateKey(text, sourceLang, targetLang) {
    // Create a deterministic hash of the input parameters
    const input = `${text}|${sourceLang}|${targetLang}`;
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Remove expired entries from cache
   * @returns {number} Number of entries removed
   */
  cleanup() {
    let removedCount = 0;
    const keysToRemove = [];

    // Collect expired keys
    for (const [key, node] of this.cache.entries()) {
      if (node.isExpired()) {
        keysToRemove.push(key);
      }
    }

    // Remove expired entries
    for (const key of keysToRemove) {
      const node = this.cache.get(key);
      if (node) {
        this.cache.delete(key);
        this._removeNode(node);
        removedCount++;
        this.stats.expirations++;
      }
    }

    return removedCount;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Clear all cache entries
   * @returns {boolean} Success status
   */
  clear() {
    try {
      this.cache.clear();
      this.head.next = this.tail;
      this.tail.prev = this.head;
      this.stats = {
        hits: 0,
        misses: 0,
        evictions: 0,
        expirations: 0
      };
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if cache key exists and is not expired
   * @param {string} key - Cache key to check
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    if (node.isExpired()) {
      this.cache.delete(key);
      this._removeNode(node);
      this.stats.expirations++;
      return false;
    }

    return true;
  }
}

module.exports = LRUCacheManager;