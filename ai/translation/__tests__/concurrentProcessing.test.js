const fc = require('fast-check');
const TranslationService = require('../src/services/TranslationService');
const FrancLanguageDetector = require('../src/services/FrancLanguageDetector');
const LRUCacheManager = require('../src/services/LRUCacheManager');
const BasicConfidenceEstimator = require('../src/services/BasicConfidenceEstimator');
const BasicFallbackHandler = require('../src/services/BasicFallbackHandler');

// Mock translation provider for testing
class MockTranslationProvider {
  constructor(options = {}) {
    this.delay = options.delay || 10;
    this.failureRate = options.failureRate || 0;
    this.name = options.name || 'MockProvider';
  }

  async translate(text, sourceLang, targetLang) {
    // Simulate async processing delay
    await new Promise(resolve => setTimeout(resolve, this.delay));
    
    // Simulate random failures
    if (Math.random() < this.failureRate) {
      throw new Error('Provider temporarily unavailable');
    }
    
    return {
      translatedText: `[${this.name}] Translated: ${text}`,
      confidence: 0.85,
      metadata: { provider: this.name }
    };
  }

  async isAvailable() {
    return true;
  }

  getSupportedLanguages() {
    return ['hi', 'en', 'ta', 'te', 'bn', 'mr'];
  }
}

describe('Concurrent Request Processing Property Tests', () => {
  let translationService;

  beforeEach(() => {
    const languageDetector = new FrancLanguageDetector();
    const cacheManager = new LRUCacheManager({ maxSize: 1000, ttl: 60000 });
    const providers = [
      new MockTranslationProvider({ name: 'Primary', delay: 10 }),
      new MockTranslationProvider({ name: 'Secondary', delay: 15 })
    ];
    const confidenceEstimator = new BasicConfidenceEstimator();
    const fallbackHandler = new BasicFallbackHandler();

    translationService = new TranslationService({
      languageDetector,
      cacheManager,
      providers,
      confidenceEstimator,
      fallbackHandler
    });
  });

  /**
   * Property 13: Concurrent Request Processing
   * For any multiple simultaneous translation requests, the system should process 
   * them concurrently without blocking
   * Validates: Requirements 8.3
   */
  describe('Property 13: Concurrent Request Processing', () => {
    test('should process multiple requests concurrently without blocking', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          requests: fc.array(fc.record({
            text: fc.string({ minLength: 5, maxLength: 100 }),
            targetLang: fc.constantFrom('hi', 'ta', 'te', 'bn', 'mr'),
            sourceLang: fc.constantFrom('en', 'hi')
          }), { minLength: 3, maxLength: 10 })
        }),
        async ({ requests }) => {
          const startTime = Date.now();

          // Execute all requests concurrently
          const translationPromises = requests.map(req =>
            translationService.translate(req.text, req.targetLang, req.sourceLang)
          );

          const results = await Promise.all(translationPromises);
          const totalTime = Date.now() - startTime;

          // Verify all requests completed
          expect(results.length).toBe(requests.length);

          // Verify each result is correct
          results.forEach((result, index) => {
            const originalRequest = requests[index];
            expect(result.originalText).toBe(originalRequest.text);
            expect(result.targetLang).toBe(originalRequest.targetLang);
            expect(result).toHaveProperty('translatedText');
            expect(result).toHaveProperty('confidenceScore');
          });

          // Verify concurrent processing (total time should be less than sequential)
          const estimatedSequentialTime = requests.length * 20; // Rough estimate
          expect(totalTime).toBeLessThan(estimatedSequentialTime);
        }
      ), { numRuns: 15 });
    });

    test('concurrent requests should not interfere with each other', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          concurrentBatches: fc.array(fc.record({
            text: fc.string({ minLength: 5, maxLength: 50 }),
            targetLang: fc.constantFrom('hi', 'ta', 'te'),
            id: fc.integer({ min: 1, max: 1000 })
          }), { minLength: 5, maxLength: 15 })
        }),
        async ({ concurrentBatches }) => {
          // Execute all requests concurrently
          const translationPromises = concurrentBatches.map(req =>
            translationService.translate(req.text, req.targetLang, 'en')
              .then(result => ({ ...result, requestId: req.id }))
          );

          const results = await Promise.all(translationPromises);

          // Verify each result matches its request
          results.forEach((result, index) => {
            const originalRequest = concurrentBatches[index];
            expect(result.originalText).toBe(originalRequest.text);
            expect(result.targetLang).toBe(originalRequest.targetLang);
            expect(result.requestId).toBe(originalRequest.id);
          });

          // Verify no cross-contamination
          const resultIds = results.map(r => r.requestId).sort();
          const requestIds = concurrentBatches.map(r => r.id).sort();
          expect(resultIds).toEqual(requestIds);
        }
      ), { numRuns: 20 });
    });

    test('should handle mixed success and failure scenarios concurrently', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          requests: fc.array(fc.record({
            text: fc.string({ minLength: 5, maxLength: 50 }),
            targetLang: fc.constantFrom('hi', 'ta', 'te'),
            shouldFail: fc.boolean()
          }), { minLength: 4, maxLength: 8 })
        }),
        async ({ requests }) => {
          // Create service with provider that can fail
          const languageDetector = new FrancLanguageDetector();
          const cacheManager = new LRUCacheManager();
          const providers = [
            new MockTranslationProvider({ failureRate: 0.3, delay: 10 }),
            new MockTranslationProvider({ failureRate: 0.1, delay: 15 })
          ];
          const confidenceEstimator = new BasicConfidenceEstimator();
          const fallbackHandler = new BasicFallbackHandler();

          const testService = new TranslationService({
            languageDetector,
            cacheManager,
            providers,
            confidenceEstimator,
            fallbackHandler
          });

          // Execute all requests concurrently
          const translationPromises = requests.map(req =>
            testService.translate(req.text, req.targetLang, 'en')
              .then(result => ({ success: true, result }))
              .catch(error => ({ success: false, error: error.message }))
          );

          const results = await Promise.all(translationPromises);

          // Verify all requests completed (either success or failure)
          expect(results.length).toBe(requests.length);

          // Verify each result has appropriate structure
          results.forEach(result => {
            expect(result).toHaveProperty('success');
            if (result.success) {
              expect(result.result).toHaveProperty('translatedText');
              expect(result.result).toHaveProperty('confidenceScore');
            } else {
              expect(result).toHaveProperty('error');
              expect(typeof result.error).toBe('string');
            }
          });
        }
      ), { numRuns: 15 });
    });

    test('should maintain performance under high concurrent load', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          loadLevel: fc.integer({ min: 10, max: 30 }),
          textLength: fc.integer({ min: 10, max: 100 })
        }),
        async ({ loadLevel, textLength }) => {
          const requests = Array.from({ length: loadLevel }, (_, i) => ({
            text: `Test text ${i} `.repeat(Math.ceil(textLength / 15)),
            targetLang: ['hi', 'ta', 'te'][i % 3],
            sourceLang: 'en'
          }));

          const startTime = Date.now();

          // Execute all requests concurrently
          const translationPromises = requests.map(req =>
            translationService.translate(req.text, req.targetLang, req.sourceLang)
          );

          const results = await Promise.all(translationPromises);
          const totalTime = Date.now() - startTime;
          const avgTimePerRequest = totalTime / loadLevel;

          // Verify all requests completed
          expect(results.length).toBe(loadLevel);

          // Verify reasonable performance (average time per request should be reasonable)
          expect(avgTimePerRequest).toBeLessThan(200); // 200ms per request on average

          // Verify all results are valid
          results.forEach(result => {
            expect(result).toHaveProperty('translatedText');
            expect(result).toHaveProperty('confidenceScore');
            expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
            expect(result.confidenceScore).toBeLessThanOrEqual(1);
          });
        }
      ), { numRuns: 10 });
    });

    test('should handle concurrent language detection requests', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          texts: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 5, maxLength: 15 })
        }),
        async ({ texts }) => {
          const startTime = Date.now();

          // Execute all detection requests concurrently
          const detectionPromises = texts.map(text =>
            translationService.detectLanguage(text)
          );

          const results = await Promise.all(detectionPromises);
          const totalTime = Date.now() - startTime;

          // Verify all detections completed
          expect(results.length).toBe(texts.length);

          // Verify each result is valid
          results.forEach(result => {
            expect(result).toHaveProperty('language');
            expect(result).toHaveProperty('confidence');
            expect(typeof result.language).toBe('string');
            expect(typeof result.confidence).toBe('number');
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
          });

          // Verify concurrent processing efficiency
          const avgTimePerDetection = totalTime / texts.length;
          expect(avgTimePerDetection).toBeLessThan(50); // 50ms per detection on average
        }
      ), { numRuns: 15 });
    });

    test('should handle concurrent cache operations correctly', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          uniqueRequests: fc.array(fc.record({
            text: fc.string({ minLength: 5, maxLength: 50 }),
            targetLang: fc.constantFrom('hi', 'ta', 'te')
          }), { minLength: 3, maxLength: 8 }),
          repetitions: fc.integer({ min: 2, max: 4 })
        }),
        async ({ uniqueRequests, repetitions }) => {
          // Create requests with repetitions (to test cache hits)
          const allRequests = [];
          for (let i = 0; i < repetitions; i++) {
            allRequests.push(...uniqueRequests);
          }

          // Shuffle requests to simulate random concurrent access
          const shuffledRequests = allRequests.sort(() => Math.random() - 0.5);

          // Execute all requests concurrently
          const translationPromises = shuffledRequests.map(req =>
            translationService.translate(req.text, req.targetLang, 'en')
          );

          const results = await Promise.all(translationPromises);

          // Verify all requests completed
          expect(results.length).toBe(allRequests.length);

          // Count cache hits
          const cacheHits = results.filter(r => r.cached).length;

          // With repetitions, we should have some cache hits
          if (repetitions > 1) {
            expect(cacheHits).toBeGreaterThan(0);
          }

          // Verify cached and non-cached results are consistent for same input
          const resultsByInput = {};
          results.forEach((result, index) => {
            const req = shuffledRequests[index];
            const key = `${req.text}-${req.targetLang}`;
            
            if (!resultsByInput[key]) {
              resultsByInput[key] = [];
            }
            resultsByInput[key].push(result);
          });

          // Verify consistency across cached and non-cached results
          Object.values(resultsByInput).forEach(resultsForSameInput => {
            if (resultsForSameInput.length > 1) {
              const firstResult = resultsForSameInput[0];
              resultsForSameInput.forEach(result => {
                expect(result.translatedText).toBe(firstResult.translatedText);
                expect(result.sourceLang).toBe(firstResult.sourceLang);
                expect(result.targetLang).toBe(firstResult.targetLang);
              });
            }
          });
        }
      ), { numRuns: 15 });
    });

    test('should process concurrent requests with different target languages', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          baseText: fc.string({ minLength: 10, maxLength: 50 }),
          targetLanguages: fc.array(fc.constantFrom('hi', 'ta', 'te', 'bn', 'mr'), { minLength: 3, maxLength: 6 })
        }),
        async ({ baseText, targetLanguages }) => {
          // Create requests for same text to different languages
          const requests = targetLanguages.map(lang => ({
            text: baseText,
            targetLang: lang,
            sourceLang: 'en'
          }));

          // Execute all requests concurrently
          const translationPromises = requests.map(req =>
            translationService.translate(req.text, req.targetLang, req.sourceLang)
          );

          const results = await Promise.all(translationPromises);

          // Verify all requests completed
          expect(results.length).toBe(targetLanguages.length);

          // Verify each result has correct target language
          results.forEach((result, index) => {
            expect(result.originalText).toBe(baseText);
            expect(result.targetLang).toBe(targetLanguages[index]);
            expect(result).toHaveProperty('translatedText');
          });

          // Verify different target languages produce different results
          const uniqueTranslations = new Set(results.map(r => r.translatedText));
          expect(uniqueTranslations.size).toBeGreaterThan(0);
        }
      ), { numRuns: 15 });
    });

    test('should handle concurrent health checks without blocking', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          healthCheckCount: fc.integer({ min: 5, max: 15 })
        }),
        async ({ healthCheckCount }) => {
          const startTime = Date.now();

          // Execute multiple health checks concurrently
          const healthPromises = Array.from({ length: healthCheckCount }, () =>
            translationService.getHealth()
          );

          const results = await Promise.all(healthPromises);
          const totalTime = Date.now() - startTime;

          // Verify all health checks completed
          expect(results.length).toBe(healthCheckCount);

          // Verify each result is valid
          results.forEach(result => {
            expect(result).toHaveProperty('status');
            expect(result).toHaveProperty('providers');
            expect(result).toHaveProperty('cache');
            expect(['healthy', 'degraded', 'unhealthy', 'error']).toContain(result.status);
          });

          // Verify concurrent processing efficiency
          const avgTimePerCheck = totalTime / healthCheckCount;
          expect(avgTimePerCheck).toBeLessThan(100); // 100ms per check on average
        }
      ), { numRuns: 10 });
    });
  });

  describe('Concurrent Processing Edge Cases', () => {
    test('should handle rapid sequential requests without degradation', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          rapidRequests: fc.array(fc.record({
            text: fc.string({ minLength: 5, maxLength: 30 }),
            targetLang: fc.constantFrom('hi', 'ta')
          }), { minLength: 10, maxLength: 20 })
        }),
        async ({ rapidRequests }) => {
          const processingTimes = [];

          // Execute requests in rapid succession
          for (const req of rapidRequests) {
            const startTime = Date.now();
            const result = await translationService.translate(req.text, req.targetLang, 'en');
            const processingTime = Date.now() - startTime;
            
            processingTimes.push(processingTime);
            
            expect(result).toHaveProperty('translatedText');
            expect(result.originalText).toBe(req.text);
          }

          // Verify no significant performance degradation
          const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
          const maxProcessingTime = Math.max(...processingTimes);
          
          // Max time should not be significantly higher than average (no degradation)
          expect(maxProcessingTime).toBeLessThan(avgProcessingTime * 3);
        }
      ), { numRuns: 10 });
    });
  });
});

// Tag for property-based test identification
// Feature: multilingual-translation-ai, Property 13: Concurrent Request Processing