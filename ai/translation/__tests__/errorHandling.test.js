const fc = require('fast-check');
const BasicFallbackHandler = require('../src/services/BasicFallbackHandler');
const TranslationProvider = require('../src/interfaces/TranslationProvider');

// Mock translation provider for testing
class MockTranslationProvider extends TranslationProvider {
  constructor(name, behavior = {}) {
    super();
    this.name = name;
    this.behavior = behavior;
  }

  async translate(text, sourceLang, targetLang) {
    if (this.behavior.shouldFail) {
      const error = new Error(this.behavior.errorMessage || 'Translation failed');
      if (this.behavior.errorCode) {
        error.code = this.behavior.errorCode;
      }
      throw error;
    }

    if (this.behavior.delay) {
      await new Promise(resolve => setTimeout(resolve, this.behavior.delay));
    }

    return {
      translatedText: this.behavior.translatedText || `${text} (translated by ${this.name})`,
      confidence: this.behavior.confidence || 0.8,
      metadata: this.behavior.metadata || {}
    };
  }

  async isAvailable() {
    if (this.behavior.unavailable) {
      return false;
    }
    if (this.behavior.availabilityDelay) {
      await new Promise(resolve => setTimeout(resolve, this.behavior.availabilityDelay));
    }
    return true;
  }

  getSupportedLanguages() {
    return ['hi', 'en', 'ta', 'te', 'bn', 'mr'];
  }
}

describe('Error Handling Tests', () => {
  let fallbackHandler;

  beforeEach(() => {
    fallbackHandler = new BasicFallbackHandler();
  });

  describe('Unit Tests', () => {
    test('should handle single provider success', async () => {
      const provider = new MockTranslationProvider('TestProvider', {
        translatedText: 'Success translation'
      });

      const result = await fallbackHandler.handleProviderFallback(
        [provider],
        'Hello',
        'en',
        'hi'
      );

      expect(result.translatedText).toBe('Success translation');
      expect(result.provider).toBe('MockTranslationProvider');
      expect(result.fallbackUsed).toBe(false);
      expect(result.fallbackLevel).toBe(1);
    });

    test('should fallback to second provider when first fails', async () => {
      const failingProvider = new MockTranslationProvider('FailingProvider', {
        shouldFail: true,
        errorMessage: 'API Error'
      });

      const workingProvider = new MockTranslationProvider('WorkingProvider', {
        translatedText: 'Fallback translation'
      });

      const result = await fallbackHandler.handleProviderFallback(
        [failingProvider, workingProvider],
        'Hello',
        'en',
        'hi'
      );

      expect(result.translatedText).toBe('Fallback translation');
      expect(result.provider).toBe('MockTranslationProvider');
      expect(result.fallbackUsed).toBe(true);
      expect(result.fallbackLevel).toBe(2);
      expect(result.errors).toHaveLength(1);
    }, 10000);

    test('should return original text when all providers fail', async () => {
      const failingProvider1 = new MockTranslationProvider('FailingProvider1', {
        shouldFail: true,
        errorMessage: 'API Error 1'
      });

      const failingProvider2 = new MockTranslationProvider('FailingProvider2', {
        shouldFail: true,
        errorMessage: 'API Error 2'
      });

      const result = await fallbackHandler.handleProviderFallback(
        [failingProvider1, failingProvider2],
        'Hello world',
        'en',
        'hi'
      );

      expect(result.translatedText).toBe('Hello world');
      expect(result.provider).toBe('fallback');
      expect(result.fallbackUsed).toBe(true);
      expect(result.confidence).toBe(0.1);
      expect(result.errors).toHaveLength(2);
    }, 10000);

    test('should handle timeout scenarios', async () => {
      const slowProvider = new MockTranslationProvider('SlowProvider', {
        delay: 2000 // 2 second delay
      });

      await expect(
        fallbackHandler.handleTimeout(
          slowProvider.translate('Hello', 'en', 'hi'),
          1000, // 1 second timeout
          'test operation'
        )
      ).rejects.toThrow('timed out after 1000ms');
    });

    test('should retry with exponential backoff', async () => {
      let attemptCount = 0;
      const flakyOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true, attempts: attemptCount };
      };

      const result = await fallbackHandler.retryWithBackoff(flakyOperation, {
        maxRetries: 3,
        baseDelay: 10 // Short delay for testing
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });

    test('should handle unavailable providers', async () => {
      const unavailableProvider = new MockTranslationProvider('UnavailableProvider', {
        unavailable: true
      });

      const availableProvider = new MockTranslationProvider('AvailableProvider', {
        translatedText: 'Available translation'
      });

      const result = await fallbackHandler.handleProviderFallback(
        [unavailableProvider, availableProvider],
        'Hello',
        'en',
        'hi'
      );

      expect(result.translatedText).toBe('Available translation');
      expect(result.fallbackUsed).toBe(true);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 7: API Error Handling
     * For any external API error (rate limits, timeouts, failures), the system should handle gracefully
     * with appropriate delays, retries, and error responses
     * Validates: Requirements 3.4, 3.5, 7.4
     */
    test('Property 7: API Error Handling - graceful error handling', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 200 }),
          sourceLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
          targetLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
          errorType: fc.constantFrom('api_error', 'network_error', 'unavailable'),
          providerCount: fc.integer({ min: 1, max: 3 })
        }),
        async ({ text, sourceLang, targetLang, errorType, providerCount }) => {
          // Create providers with different error behaviors
          const providers = [];
          for (let i = 0; i < providerCount; i++) {
            const behavior = {};
            
            switch (errorType) {
              case 'api_error':
                behavior.shouldFail = true;
                behavior.errorMessage = 'API internal error';
                break;
              case 'network_error':
                behavior.shouldFail = true;
                behavior.errorCode = 'ECONNREFUSED';
                behavior.errorMessage = 'Connection refused';
                break;
              case 'unavailable':
                behavior.unavailable = true;
                break;
            }
            
            providers.push(new MockTranslationProvider(`Provider${i}`, behavior));
          }

          const result = await fallbackHandler.handleProviderFallback(
            providers,
            text,
            sourceLang,
            targetLang
          );

          // Should always return a valid result
          expect(result).toBeDefined();
          expect(typeof result.translatedText).toBe('string');
          expect(typeof result.confidence).toBe('number');
          expect(typeof result.provider).toBe('string');
          expect(typeof result.fallbackUsed).toBe('boolean');
          expect(typeof result.fallbackLevel).toBe('number');
          expect(Array.isArray(result.errors)).toBe(true);

          // Confidence should be between 0 and 1
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);

          // When all providers fail, should return original text
          if (result.provider === 'fallback') {
            expect(result.translatedText).toBe(text);
            expect(result.confidence).toBe(0.1);
            expect(result.fallbackUsed).toBe(true);
            expect(result.errors.length).toBe(providerCount);
          }
        }
      ), { numRuns: 20 });
    });

    test('Property 7: API Error Handling - timeout behavior', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          operationDelay: fc.integer({ min: 100, max: 1000 }),
          timeoutMs: fc.integer({ min: 200, max: 800 }),
          operationName: fc.string({ minLength: 1, maxLength: 50 })
        }),
        async ({ operationDelay, timeoutMs, operationName }) => {
          const slowOperation = () => new Promise(resolve => 
            setTimeout(() => resolve({ success: true }), operationDelay)
          );

          if (operationDelay > timeoutMs) {
            // Should timeout
            await expect(
              fallbackHandler.handleTimeout(slowOperation(), timeoutMs, operationName)
            ).rejects.toThrow('timed out');
          } else {
            // Should succeed
            const result = await fallbackHandler.handleTimeout(slowOperation(), timeoutMs, operationName);
            expect(result.success).toBe(true);
          }
        }
      ), { numRuns: 10 });
    });

    test('Property 7: API Error Handling - retry mechanism', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          maxRetries: fc.integer({ min: 1, max: 3 }),
          failureCount: fc.integer({ min: 0, max: 4 }),
          baseDelay: fc.integer({ min: 10, max: 50 })
        }),
        async ({ maxRetries, failureCount, baseDelay }) => {
          let attemptCount = 0;
          const operation = async () => {
            attemptCount++;
            if (attemptCount <= failureCount) {
              throw new Error(`Attempt ${attemptCount} failed`);
            }
            return { success: true, attempts: attemptCount };
          };

          const retryOptions = { maxRetries, baseDelay, maxDelay: 200 };

          if (failureCount <= maxRetries) {
            // Should eventually succeed
            const result = await fallbackHandler.retryWithBackoff(operation, retryOptions);
            expect(result.success).toBe(true);
            expect(result.attempts).toBe(failureCount + 1);
          } else {
            // Should fail after all retries
            await expect(
              fallbackHandler.retryWithBackoff(operation, retryOptions)
            ).rejects.toThrow('failed');
            expect(attemptCount).toBe(maxRetries + 1);
          }
        }
      ), { numRuns: 10 });
    });

    test('Property 7: API Error Handling - error logging consistency', () => {
      fc.assert(fc.property(
        fc.record({
          errorMessage: fc.string({ minLength: 1, maxLength: 100 }),
          severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
          context: fc.record({
            provider: fc.string({ minLength: 1, maxLength: 20 }),
            operation: fc.string({ minLength: 1, maxLength: 20 }),
            sourceLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
            targetLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr')
          })
        }),
        ({ errorMessage, severity, context }) => {
          const error = new Error(errorMessage);
          
          // Should not throw when logging errors
          expect(() => {
            fallbackHandler.logError(error, severity, context);
          }).not.toThrow();
        }
      ), { numRuns: 50 });
    });

    test('Property 7: API Error Handling - provider fallback ordering', () => {
      fc.assert(fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 1, maxLength: 3 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
        fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
        async (providerBehaviors, text, sourceLang, targetLang) => {
          const providers = providerBehaviors.map((behavior, index) => {
            const config = {};
            
            switch (behavior) {
              case 0: // Working provider
                config.translatedText = `Translation from provider ${index}`;
                break;
              case 1: // Failing provider
                config.shouldFail = true;
                config.errorMessage = `Provider ${index} failed`;
                break;
              case 2: // Unavailable provider
                config.unavailable = true;
                break;
            }
            
            return new MockTranslationProvider(`Provider${index}`, config);
          });

          const result = await fallbackHandler.handleProviderFallback(
            providers,
            text,
            sourceLang,
            targetLang
          );

          // Should always return a result
          expect(result).toBeDefined();
          expect(result.fallbackLevel).toBeGreaterThan(0);
          expect(result.fallbackLevel).toBeLessThanOrEqual(providers.length + 1);

          // Find first working provider
          const firstWorkingIndex = providerBehaviors.findIndex(b => b === 0);
          
          if (firstWorkingIndex !== -1) {
            // Should use first working provider
            expect(result.fallbackLevel).toBe(firstWorkingIndex + 1);
            expect(result.translatedText).toContain(`provider ${firstWorkingIndex}`);
            expect(result.fallbackUsed).toBe(firstWorkingIndex > 0);
          } else {
            // All providers failed, should return fallback
            expect(result.provider).toBe('fallback');
            expect(result.translatedText).toBe(text);
            expect(result.fallbackUsed).toBe(true);
          }
        }
      ), { numRuns: 10 });
    });
  });
});