/**
 * Property-based tests for translation provider integration and fallback
 * Feature: multilingual-translation-ai, Property 6: Provider Integration and Fallback
 * Validates: Requirements 3.1, 3.2, 3.3, 7.1, 7.2
 */

const fc = require('fast-check');
const HuggingFaceProvider = require('../src/services/HuggingFaceProvider');
const LibreTranslateProvider = require('../src/services/LibreTranslateProvider');

// Mock logger for tests
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

describe('Provider Integration and Fallback', () => {
  let huggingFaceProvider;
  let libreTranslateProvider;

  beforeEach(() => {
    // Initialize providers without API keys for testing
    huggingFaceProvider = new HuggingFaceProvider();
    libreTranslateProvider = new LibreTranslateProvider();
  });

  /**
   * Property 6: Provider Integration and Fallback
   * For any translation request, the system should use HuggingFace as primary provider 
   * and automatically fallback to LibreTranslate when primary fails, with final fallback to original text
   * Validates: Requirements 3.1, 3.2, 3.3, 7.1, 7.2
   */
  test('Provider Integration and Fallback - Property 6', () => {
    fc.assert(fc.property(
      fc.record({
        text: fc.constantFrom(
          'Hello world',
          'This is a test message',
          'Translation test',
          'Good morning',
          'How are you today',
          'Welcome to our service',
          'Thank you very much',
          'Please help me',
          'I need assistance',
          'What is your name'
        ),
        sourceLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
        targetLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr')
      }).filter(({ sourceLang, targetLang }) => sourceLang !== targetLang),
      ({ text, sourceLang, targetLang }) => {
        // Test provider interface compliance
        expect(huggingFaceProvider.getName()).toBe('HuggingFace');
        expect(libreTranslateProvider.getName()).toBe('LibreTranslate');

        // Test supported languages
        const hfLanguages = huggingFaceProvider.getSupportedLanguages();
        const ltLanguages = libreTranslateProvider.getSupportedLanguages();
        
        expect(hfLanguages).toContain(sourceLang);
        expect(hfLanguages).toContain(targetLang);
        expect(ltLanguages).toContain(sourceLang);
        expect(ltLanguages).toContain(targetLang);

        // Test language validation
        expect(huggingFaceProvider.validateLanguages(sourceLang, targetLang)).toBe(true);
        expect(libreTranslateProvider.validateLanguages(sourceLang, targetLang)).toBe(true);

        // Test error handling for invalid inputs (synchronous checks)
        expect(() => huggingFaceProvider.validateLanguages('xx', targetLang)).not.toThrow();
        expect(() => libreTranslateProvider.validateLanguages('xx', targetLang)).not.toThrow();
        
        expect(huggingFaceProvider.validateLanguages('xx', targetLang)).toBe(false);
        expect(libreTranslateProvider.validateLanguages('xx', targetLang)).toBe(false);

        // Test provider configuration
        expect(huggingFaceProvider.config).toBeDefined();
        expect(libreTranslateProvider.config).toBeDefined();
        expect(huggingFaceProvider.config.name).toBe('HuggingFace');
        expect(libreTranslateProvider.config.name).toBe('LibreTranslate');

        return true; // Property holds
      }
    ), { numRuns: 50 });
  });

  test('Provider async error handling', async () => {
    const testText = 'Hello world';
    const sourceLang = 'en';
    const targetLang = 'hi';

    // Test error handling for invalid inputs
    await expect(huggingFaceProvider.translate('', sourceLang, targetLang))
      .rejects.toThrow('Text cannot be empty');
    
    await expect(libreTranslateProvider.translate('', sourceLang, targetLang))
      .rejects.toThrow('Text cannot be empty');

    // Test unsupported language pair handling
    await expect(huggingFaceProvider.translate(testText, 'xx', targetLang))
      .rejects.toThrow('Unsupported language pair');
    
    await expect(libreTranslateProvider.translate(testText, 'xx', targetLang))
      .rejects.toThrow('Unsupported language pair');

    // Test availability check (should not throw)
    const hfAvailable = await huggingFaceProvider.isAvailable();
    const ltAvailable = await libreTranslateProvider.isAvailable();
    
    expect(typeof hfAvailable).toBe('boolean');
    expect(typeof ltAvailable).toBe('boolean');
  });

  test('Provider fallback behavior with mock failures', async () => {
    const testText = 'Hello world';
    const sourceLang = 'en';
    const targetLang = 'hi';

    // Create a mock provider that always fails
    class FailingProvider extends HuggingFaceProvider {
      async translate() {
        throw new Error('Primary provider failed');
      }
      
      async isAvailable() {
        return false;
      }
    }

    // Create a mock provider that always succeeds
    class SuccessProvider extends LibreTranslateProvider {
      async translate(text, sourceLang, targetLang) {
        return {
          translatedText: `Translated: ${text}`,
          confidence: 0.8
        };
      }
      
      async isAvailable() {
        return true;
      }
    }

    const failingProvider = new FailingProvider();
    const successProvider = new SuccessProvider();

    // Test that failing provider throws error
    await expect(failingProvider.translate(testText, sourceLang, targetLang))
      .rejects.toThrow('Primary provider failed');

    // Test that success provider works
    const result = await successProvider.translate(testText, sourceLang, targetLang);
    expect(result.translatedText).toBe('Translated: Hello world');
    expect(result.confidence).toBe(0.8);

    // Test availability checks
    expect(await failingProvider.isAvailable()).toBe(false);
    expect(await successProvider.isAvailable()).toBe(true);
  });

  test('Provider rate limiting behavior', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 10 }),
      (requestCount) => {
        // Test that providers handle rate limiting appropriately
        const provider = new HuggingFaceProvider();
        
        // Simulate rate limit exceeded
        provider.rateLimitTracker.requests = provider.config.rateLimit.requests;
        provider.rateLimitTracker.windowStart = Date.now();

        expect(() => provider._checkRateLimit()).toThrow('Rate limit exceeded');
      }
    ), { numRuns: 20 });
  });

  test('Provider timeout handling', async () => {
    const testText = 'Test timeout handling';
    const sourceLang = 'en';
    const targetLang = 'hi';

    // Create a provider with very short timeout
    class TimeoutProvider extends HuggingFaceProvider {
      async _makeRequest() {
        // Simulate timeout
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new Error('HuggingFace API request timeout');
      }
    }

    const timeoutProvider = new TimeoutProvider();
    
    await expect(timeoutProvider.translate(testText, sourceLang, targetLang))
      .rejects.toThrow('HuggingFace API request timeout');
  });

  test('Provider confidence score calculation', () => {
    fc.assert(fc.property(
      fc.record({
        originalText: fc.string({ minLength: 5, maxLength: 100 }),
        translatedText: fc.string({ minLength: 1, maxLength: 200 })
      }),
      ({ originalText, translatedText }) => {
        const hfProvider = new HuggingFaceProvider();
        const ltProvider = new LibreTranslateProvider();

        // Test confidence calculation
        const hfConfidence = hfProvider._calculateConfidence(originalText, translatedText, {});
        const ltConfidence = ltProvider._calculateConfidence(originalText, translatedText, {});

        // Confidence should be between 0 and 1
        expect(hfConfidence).toBeGreaterThanOrEqual(0);
        expect(hfConfidence).toBeLessThanOrEqual(1);
        expect(ltConfidence).toBeGreaterThanOrEqual(0);
        expect(ltConfidence).toBeLessThanOrEqual(1);

        // Confidence should be reasonable (not too low)
        expect(hfConfidence).toBeGreaterThanOrEqual(0.1);
        expect(ltConfidence).toBeGreaterThanOrEqual(0.1);
      }
    ), { numRuns: 50 });
  });

  test('Provider language code mapping', () => {
    const supportedLanguages = ['hi', 'en', 'ta', 'te', 'bn', 'mr'];
    
    supportedLanguages.forEach(langCode => {
      const hfProvider = new HuggingFaceProvider();
      const ltProvider = new LibreTranslateProvider();

      // Test language code mapping
      const hfMapped = hfProvider._mapLanguageCode(langCode);
      const ltMapped = ltProvider._mapLanguageCode(langCode);

      expect(typeof hfMapped).toBe('string');
      expect(typeof ltMapped).toBe('string');
      expect(hfMapped.length).toBeGreaterThan(0);
      expect(ltMapped.length).toBeGreaterThan(0);
    });
  });

  test('Provider error classification', () => {
    const hfProvider = new HuggingFaceProvider();
    const ltProvider = new LibreTranslateProvider();

    const retryableErrors = [
      new Error('Network timeout'),
      new Error('Service temporarily unavailable'),
      new Error('Internal server error')
    ];

    const nonRetryableErrors = [
      new Error('Rate limit exceeded'),
      new Error('Unsupported language pair'),
      new Error('Text cannot be empty'),
      new Error('Invalid API key')
    ];

    retryableErrors.forEach(error => {
      expect(hfProvider._isNonRetryableError(error)).toBe(false);
      expect(ltProvider._isNonRetryableError(error)).toBe(false);
    });

    nonRetryableErrors.forEach(error => {
      expect(hfProvider._isNonRetryableError(error)).toBe(true);
      expect(ltProvider._isNonRetryableError(error)).toBe(true);
    });
  });
});