/**
 * Property-based tests for cache management functionality
 * Feature: multilingual-translation-ai
 */

const fc = require('fast-check');
const LRUCacheManager = require('../src/services/LRUCacheManager');

describe('Cache Management Property Tests', () => {
  let cacheManager;

  beforeEach(() => {
    cacheManager = new LRUCacheManager(100, 60000);
  });

  afterEach(() => {
    cacheManager.clear();
  });

  // Feature: multilingual-translation-ai, Property 9: Cache Hit Behavior
  describe('Property 9: Cache Hit Behavior', () => {
    test('**Validates: Requirements 5.1** - should return cached translation when same parameters are used', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 200 }),
            sourceLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
            targetLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
            translatedText: fc.string({ minLength: 1, maxLength: 200 }),
            confidenceScore: fc.float({ min: 0.0, max: 1.0 })
          }),
          async ({ text, sourceLang, targetLang, translatedText, confidenceScore }) => {
            // Skip if source and target are the same
            if (sourceLang === targetLang) {
              return true;
            }

            // Create translation data to cache
            const translationData = {
              originalText: text,
              translatedText: translatedText,
              sourceLang: sourceLang,
              targetLang: targetLang,
              confidenceScore: confidenceScore,
              timestamp: Date.now()
            };

            // Generate cache key
            const cacheKey = cacheManager.generateKey(text, sourceLang, targetLang);

            // Store in cache
            const setResult = cacheManager.set(cacheKey, translationData);
            expect(setResult).toBe(true);

            // Retrieve from cache
            const cachedResult = cacheManager.get(cacheKey);

            // Verify cache hit
            expect(cachedResult).not.toBeNull();
            expect(cachedResult.originalText).toBe(text);
            expect(cachedResult.translatedText).toBe(translatedText);
            expect(cachedResult.sourceLang).toBe(sourceLang);
            expect(cachedResult.targetLang).toBe(targetLang);
            expect(cachedResult.confidenceScore).toBe(confidenceScore);

            // Verify cache statistics show hit
            const stats = cacheManager.getStats();
            expect(stats.hits).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
  // Feature: multilingual-translation-ai, Property 10: Cache Management
  describe('Property 10: Cache Management', () => {
    test('**Validates: Requirements 5.2, 5.3, 5.4, 5.5** - should properly manage cache size, TTL, and eviction', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            entries: fc.array(
              fc.record({
                text: fc.string({ minLength: 1, maxLength: 50 }),
                sourceLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
                targetLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
                translatedText: fc.string({ minLength: 1, maxLength: 50 }),
                confidenceScore: fc.float({ min: 0.0, max: 1.0 })
              }),
              { minLength: 1, maxLength: 20 }
            )
          }),
          async ({ entries }) => {
            // Create a small cache for testing eviction
            const smallCache = new LRUCacheManager(5, 1000); // 5 entries max, 1 second TTL

            // Add entries to cache
            const addedKeys = [];
            for (const entry of entries) {
              if (entry.sourceLang !== entry.targetLang) {
                const translationData = {
                  originalText: entry.text,
                  translatedText: entry.translatedText,
                  sourceLang: entry.sourceLang,
                  targetLang: entry.targetLang,
                  confidenceScore: entry.confidenceScore,
                  timestamp: Date.now()
                };

                const cacheKey = smallCache.generateKey(entry.text, entry.sourceLang, entry.targetLang);
                const setResult = smallCache.set(cacheKey, translationData);
                expect(setResult).toBe(true);
                addedKeys.push(cacheKey);
              }
            }

            // Verify cache size doesn't exceed maximum
            const stats = smallCache.getStats();
            expect(stats.size).toBeLessThanOrEqual(5);

            // If we added more than 5 entries, verify eviction occurred
            if (addedKeys.length > 5) {
              expect(stats.evictions).toBeGreaterThan(0);
              
              // Verify oldest entries were evicted (first entries should not be in cache)
              const firstKey = addedKeys[0];
              const firstEntry = smallCache.get(firstKey);
              expect(firstEntry).toBeNull();
            }

            // Verify most recent entries are still in cache
            if (addedKeys.length > 0) {
              const lastKey = addedKeys[addedKeys.length - 1];
              const lastEntry = smallCache.get(lastKey);
              expect(lastEntry).not.toBeNull();
            }

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    test('should handle TTL expiration correctly', async () => {
      // Create cache with very short TTL for testing
      const shortTTLCache = new LRUCacheManager(100, 50); // 50ms TTL

      const translationData = {
        originalText: 'test text',
        translatedText: 'परीक्षण पाठ',
        sourceLang: 'en',
        targetLang: 'hi',
        confidenceScore: 0.9,
        timestamp: Date.now()
      };

      const cacheKey = shortTTLCache.generateKey('test text', 'en', 'hi');

      // Store in cache
      const setResult = shortTTLCache.set(cacheKey, translationData);
      expect(setResult).toBe(true);

      // Verify it's immediately available
      let cachedResult = shortTTLCache.get(cacheKey);
      expect(cachedResult).not.toBeNull();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify it's expired
      cachedResult = shortTTLCache.get(cacheKey);
      expect(cachedResult).toBeNull();

      // Verify stats show expiration
      const stats = shortTTLCache.getStats();
      expect(stats.expirations).toBeGreaterThan(0);
    });
  });
});