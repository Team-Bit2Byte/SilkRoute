const fc = require('fast-check');
const TranslationService = require('../src/services/TranslationService');
const FrancLanguageDetector = require('../src/services/FrancLanguageDetector');
const LRUCacheManager = require('../src/services/LRUCacheManager');
const BasicConfidenceEstimator = require('../src/services/BasicConfidenceEstimator');
const BasicFallbackHandler = require('../src/services/BasicFallbackHandler');
const { logger } = require('../src/utils/logger');

// Mock translation provider that can simulate various error conditions
class ErrorSimulatingProvider {
  constructor(options = {}) {
    this.errorType = options.errorType || null;
    this.errorRate = options.errorRate || 0;
    this.name = options.name || 'ErrorProvider';
  }

  async translate(text, sourceLang, targetLang) {
    // Simulate specific error types
    if (this.errorType) {
      throw new Error(this.errorType);
    }

    // Simulate random errors
    if (Math.random() < this.errorRate) {
      throw new Error('Random provider error');
    }

    return {
      translatedText: `Translated: ${text}`,
      confidence: 0.85
    };
  }

  async isAvailable() {
    if (this.errorType === 'Provider unavailable') {
      return false;
    }
    return true;
  }

  getSupportedLanguages() {
    return ['hi', 'en', 'ta', 'te', 'bn', 'mr'];
  }
}

describe('Error Logging and Monitoring Property Tests', () => {
  let logSpy;
  let errorLogSpy;
  let warnLogSpy;
  let infoLogSpy;

  beforeEach(() => {
    // Spy on logger methods
    logSpy = jest.spyOn(logger, 'debug').mockImplementation(() => {});
    errorLogSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    warnLogSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    infoLogSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore logger methods
    logSpy.mockRestore();
    errorLogSpy.mockRestore();
    warnLogSpy.mockRestore();
    infoLogSpy.mockRestore();
  });

  /**
   * Property 12: Error Logging and Monitoring
   * For any error condition, the system should log errors with appropriate 
   * severity levels and maintain operational visibility
   * Validates: Requirements 7.3
   */
  describe('Property 12: Error Logging and Monitoring', () => {
    test('should log all translation errors with appropriate severity', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 100 }),
          targetLang: fc.constantFrom('hi', 'ta', 'te'),
          errorType: fc.constantFrom(
            'Provider unavailable',
            'Network timeout',
            'API rate limit exceeded',
            'Invalid response format'
          )
        }),
        async ({ text, targetLang, errorType }) => {
          const languageDetector = new FrancLanguageDetector();
          const cacheManager = new LRUCacheManager();
          const providers = [
            new ErrorSimulatingProvider({ errorType: errorType }),
            new ErrorSimulatingProvider({ errorType: errorType })
          ];
          const confidenceEstimator = new BasicConfidenceEstimator();
          const fallbackHandler = new BasicFallbackHandler();

          const translationService = new TranslationService({
            languageDetector,
            cacheManager,
            providers,
            confidenceEstimator,
            fallbackHandler
          });

          // Clear previous calls
          errorLogSpy.mockClear();

          try {
            await translationService.translate(text, targetLang, 'en');
          } catch (error) {
            // Error is expected
          }

          // Verify error was logged
          expect(errorLogSpy).toHaveBeenCalled();

          // Verify error log contains relevant information
          const errorCalls = errorLogSpy.mock.calls;
          const hasRelevantError = errorCalls.some(call => {
            const logMessage = call[0];
            const logData = call[1];
            
            return (
              (logMessage && logMessage.includes('error')) ||
              (logMessage && logMessage.includes('failed')) ||
              (logData && logData.error) ||
              (logData && logData.type && logData.type.includes('error'))
            );
          });

          expect(hasRelevantError).toBe(true);
        }
      ), { numRuns: 20 });
    });

    test('should log successful operations with info level', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          targetLang: fc.constantFrom('hi', 'ta', 'te')
        }),
        async ({ text, targetLang }) => {
          const languageDetector = new FrancLanguageDetector();
          const cacheManager = new LRUCacheManager();
          const providers = [
            new ErrorSimulatingProvider({ name: 'SuccessProvider' })
          ];
          const confidenceEstimator = new BasicConfidenceEstimator();
          const fallbackHandler = new BasicFallbackHandler();

          const translationService = new TranslationService({
            languageDetector,
            cacheManager,
            providers,
            confidenceEstimator,
            fallbackHandler
          });

          // Clear previous calls
          infoLogSpy.mockClear();

          await translationService.translate(text, targetLang, 'en');

          // Verify info logs were created for successful operation
          expect(infoLogSpy).toHaveBeenCalled();

          // Verify info log contains success indicators
          const infoCalls = infoLogSpy.mock.calls;
          const hasSuccessLog = infoCalls.some(call => {
            const logMessage = call[0];
            const logData = call[1];
            
            return (
              (logMessage && (logMessage.includes('completed') || logMessage.includes('success'))) ||
              (logData && logData.type && (logData.type.includes('success') || logData.type.includes('completed')))
            );
          });

          expect(hasSuccessLog).toBe(true);
        }
      ), { numRuns: 15 });
    });

    test('should log language detection operations', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          text: fc.string({ minLength: 10, maxLength: 100 }),
          shouldSucceed: fc.boolean()
        }),
        async ({ text, shouldSucceed }) => {
          const languageDetector = new FrancLanguageDetector();
          const cacheManager = new LRUCacheManager();
          const providers = [new ErrorSimulatingProvider()];
          const confidenceEstimator = new BasicConfidenceEstimator();
          const fallbackHandler = new BasicFallbackHandler();

          const translationService = new TranslationService({
            languageDetector,
            cacheManager,
            providers,
            confidenceEstimator,
            fallbackHandler
          });

          // Clear previous calls
          logSpy.mockClear();
          infoLogSpy.mockClear();
          errorLogSpy.mockClear();

          try {
            await translationService.detectLanguage(text);
          } catch (error) {
            // Error might occur
          }

          // Verify language detection was logged
          const allCalls = [
            ...logSpy.mock.calls,
            ...infoLogSpy.mock.calls,
            ...errorLogSpy.mock.calls
          ];

          const hasDetectionLog = allCalls.some(call => {
            const logMessage = call[0];
            const logData = call[1];
            
            return (
              (logMessage && logMessage.includes('detection')) ||
              (logMessage && logMessage.includes('detect')) ||
              (logData && logData.type && logData.type.includes('detection'))
            );
          });

          expect(hasDetectionLog).toBe(true);
        }
      ), { numRuns: 15 });
    });

    test('should log cache operations', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          targetLang: fc.constantFrom('hi', 'ta'),
          repetitions: fc.integer({ min: 2, max: 4 })
        }),
        async ({ text, targetLang, repetitions }) => {
          const languageDetector = new FrancLanguageDetector();
          const cacheManager = new LRUCacheManager();
          const providers = [new ErrorSimulatingProvider()];
          const confidenceEstimator = new BasicConfidenceEstimator();
          const fallbackHandler = new BasicFallbackHandler();

          const translationService = new TranslationService({
            languageDetector,
            cacheManager,
            providers,
            confidenceEstimator,
            fallbackHandler
          });

          // Clear previous calls
          infoLogSpy.mockClear();

          // First request (cache miss)
          await translationService.translate(text, targetLang, 'en');

          // Subsequent requests (cache hits)
          for (let i = 1; i < repetitions; i++) {
            await translationService.translate(text, targetLang, 'en');
          }

          // Verify cache operations were logged
          const infoCalls = infoLogSpy.mock.calls;
          const hasCacheLog = infoCalls.some(call => {
            const logMessage = call[0];
            const logData = call[1];
            
            return (
              (logMessage && logMessage.includes('cache')) ||
              (logData && logData.type && logData.type.includes('cache'))
            );
          });

          expect(hasCacheLog).toBe(true);
        }
      ), { numRuns: 15 });
    });

    test('should log health check operations', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          healthCheckCount: fc.integer({ min: 1, max: 5 })
        }),
        async ({ healthCheckCount }) => {
          const languageDetector = new FrancLanguageDetector();
          const cacheManager = new LRUCacheManager();
          const providers = [new ErrorSimulatingProvider()];
          const confidenceEstimator = new BasicConfidenceEstimator();
          const fallbackHandler = new BasicFallbackHandler();

          const translationService = new TranslationService({
            languageDetector,
            cacheManager,
            providers,
            confidenceEstimator,
            fallbackHandler
          });

          // Clear previous calls
          infoLogSpy.mockClear();

          // Perform health checks
          for (let i = 0; i < healthCheckCount; i++) {
            await translationService.getHealth();
          }

          // Verify health checks were logged
          const infoCalls = infoLogSpy.mock.calls;
          const hasHealthLog = infoCalls.some(call => {
            const logMessage = call[0];
            const logData = call[1];
            
            return (
              (logMessage && logMessage.includes('health')) ||
              (logData && logData.type && logData.type.includes('health'))
            );
          });

          expect(hasHealthLog).toBe(true);
        }
      ), { numRuns: 10 });
    });

    test('should include contextual information in error logs', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          targetLang: fc.constantFrom('hi', 'ta', 'te'),
          sourceLang: fc.constantFrom('en', 'hi'),
          errorType: fc.constantFrom('Provider error', 'Network error', 'Timeout error')
        }),
        async ({ text, targetLang, sourceLang, errorType }) => {
          const languageDetector = new FrancLanguageDetector();
          const cacheManager = new LRUCacheManager();
          const providers = [
            new ErrorSimulatingProvider({ errorType: errorType })
          ];
          const confidenceEstimator = new BasicConfidenceEstimator();
          const fallbackHandler = new BasicFallbackHandler();

          const translationService = new TranslationService({
            languageDetector,
            cacheManager,
            providers,
            confidenceEstimator,
            fallbackHandler
          });

          // Clear previous calls
          errorLogSpy.mockClear();

          try {
            await translationService.translate(text, targetLang, sourceLang);
          } catch (error) {
            // Error is expected
          }

          // Verify error logs contain contextual information
          const errorCalls = errorLogSpy.mock.calls;
          const hasContextualInfo = errorCalls.some(call => {
            const logData = call[1];
            
            return logData && (
              logData.targetLang ||
              logData.sourceLang ||
              logData.text ||
              logData.error ||
              logData.type
            );
          });

          expect(hasContextualInfo).toBe(true);
        }
      ), { numRuns: 15 });
    });

    test('should log processing time metrics', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 50 }),
          targetLang: fc.constantFrom('hi', 'ta')
        }),
        async ({ text, targetLang }) => {
          const languageDetector = new FrancLanguageDetector();
          const cacheManager = new LRUCacheManager();
          const providers = [new ErrorSimulatingProvider()];
          const confidenceEstimator = new BasicConfidenceEstimator();
          const fallbackHandler = new BasicFallbackHandler();

          const translationService = new TranslationService({
            languageDetector,
            cacheManager,
            providers,
            confidenceEstimator,
            fallbackHandler
          });

          // Clear previous calls
          infoLogSpy.mockClear();

          await translationService.translate(text, targetLang, 'en');

          // Verify processing time was logged
          const infoCalls = infoLogSpy.mock.calls;
          const hasProcessingTime = infoCalls.some(call => {
            const logData = call[1];
            
            return logData && (
              logData.processingTime !== undefined ||
              logData.duration !== undefined ||
              logData.time !== undefined
            );
          });

          expect(hasProcessingTime).toBe(true);
        }
      ), { numRuns: 15 });
    });

    test('should maintain log consistency across multiple operations', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          operations: fc.array(fc.record({
            type: fc.constantFrom('translate', 'detect', 'health'),
            text: fc.string({ minLength: 1, maxLength: 50 }),
            targetLang: fc.constantFrom('hi', 'ta', 'te')
          }), { minLength: 3, maxLength: 8 })
        }),
        async ({ operations }) => {
          const languageDetector = new FrancLanguageDetector();
          const cacheManager = new LRUCacheManager();
          const providers = [new ErrorSimulatingProvider()];
          const confidenceEstimator = new BasicConfidenceEstimator();
          const fallbackHandler = new BasicFallbackHandler();

          const translationService = new TranslationService({
            languageDetector,
            cacheManager,
            providers,
            confidenceEstimator,
            fallbackHandler
          });

          // Clear previous calls
          logSpy.mockClear();
          infoLogSpy.mockClear();
          errorLogSpy.mockClear();

          // Execute operations
          for (const op of operations) {
            try {
              if (op.type === 'translate') {
                await translationService.translate(op.text, op.targetLang, 'en');
              } else if (op.type === 'detect') {
                await translationService.detectLanguage(op.text);
              } else if (op.type === 'health') {
                await translationService.getHealth();
              }
            } catch (error) {
              // Errors might occur
            }
          }

          // Verify logs were created for all operations
          const totalLogCalls = logSpy.mock.calls.length + 
                               infoLogSpy.mock.calls.length + 
                               errorLogSpy.mock.calls.length;

          expect(totalLogCalls).toBeGreaterThan(0);

          // Verify log structure consistency
          const allCalls = [
            ...logSpy.mock.calls,
            ...infoLogSpy.mock.calls,
            ...errorLogSpy.mock.calls
          ];

          allCalls.forEach(call => {
            // Each log call should have a message and optional data
            expect(call.length).toBeGreaterThanOrEqual(1);
            expect(typeof call[0]).toBe('string');
            
            if (call[1]) {
              expect(typeof call[1]).toBe('object');
            }
          });
        }
      ), { numRuns: 15 });
    });
  });

  describe('Error Severity Classification', () => {
    test('should use appropriate log levels for different error types', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          errorScenarios: fc.array(fc.record({
            text: fc.string({ minLength: 1, maxLength: 30 }),
            targetLang: fc.constantFrom('hi', 'ta'),
            errorType: fc.constantFrom(
              'Provider unavailable',
              'Network timeout',
              'Invalid input',
              'Configuration error'
            )
          }), { minLength: 2, maxLength: 5 })
        }),
        async ({ errorScenarios }) => {
          for (const scenario of errorScenarios) {
            const languageDetector = new FrancLanguageDetector();
            const cacheManager = new LRUCacheManager();
            const providers = [
              new ErrorSimulatingProvider({ errorType: scenario.errorType })
            ];
            const confidenceEstimator = new BasicConfidenceEstimator();
            const fallbackHandler = new BasicFallbackHandler();

            const translationService = new TranslationService({
              languageDetector,
              cacheManager,
              providers,
              confidenceEstimator,
              fallbackHandler
            });

            // Clear previous calls
            errorLogSpy.mockClear();
            warnLogSpy.mockClear();

            try {
              await translationService.translate(scenario.text, scenario.targetLang, 'en');
            } catch (error) {
              // Error is expected
            }

            // Verify appropriate log level was used
            const hasErrorOrWarn = errorLogSpy.mock.calls.length > 0 || warnLogSpy.mock.calls.length > 0;
            expect(hasErrorOrWarn).toBe(true);
          }
        }
      ), { numRuns: 10 });
    });
  });
});

// Tag for property-based test identification
// Feature: multilingual-translation-ai, Property 12: Error Logging and Monitoring