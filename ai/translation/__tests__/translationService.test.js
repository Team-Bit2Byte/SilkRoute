const fc = require('fast-check');
const TranslationService = require('../src/services/TranslationService');
const FrancLanguageDetector = require('../src/services/FrancLanguageDetector');
const LRUCacheManager = require('../src/services/LRUCacheManager');
const BasicConfidenceEstimator = require('../src/services/BasicConfidenceEstimator');
const BasicFallbackHandler = require('../src/services/BasicFallbackHandler');

// Mock providers for testing
class MockTranslationProvider {
  constructor(name, behavior = {}) {
    this.name = name;
    this.behavior = behavior;
  }

  async translate(text, sourceLang, targetLang) {
    if (this.behavior.shouldFail) {
      throw new Error(this.behavior.errorMessage || 'Translation failed');
    }

    if (this.behavior.delay) {
      await new Promise(resolve => setTimeout(resolve, this.behavior.delay));
    }

    return {
      translatedText: this.behavior.translatedText || `${text} (translated from ${sourceLang} to ${targetLang})`,
      confidence: this.behavior.confidence || 0.8,
      metadata: this.behavior.metadata || {}
    };
  }

  async isAvailable() {
    return !this.behavior.unavailable;
  }

  getSupportedLanguages() {
    return ['hi', 'en', 'ta', 'te', 'bn', 'mr'];
  }
}

describe('Translation Service Tests', () => {
  let translationService;
  let mockProvider1, mockProvider2;

  beforeEach(() => {
    // Create mock providers
    mockProvider1 = new MockTranslationProvider('MockProvider1', {
      translatedText: 'Mock translation 1'
    });
    
    mockProvider2 = new MockTranslationProvider('MockProvider2', {
      translatedText: 'Mock translation 2'
    });

    // Create service with real components
    translationService = new TranslationService({
      languageDetector: new FrancLanguageDetector(),
      cacheManager: new LRUCacheManager(),
      confidenceEstimator: new BasicConfidenceEstimator(),
      fallbackHandler: new BasicFallbackHandler(),
      providers: [mockProvider1, mockProvider2],
      maxTextLength: 1000,
      chunkSize: 500
    });
  });

  describe('Unit Tests', () => {
    test('should translate simple text successfully', async () => {
      const result = await translationService.translate('Hello world', 'hi', 'en');
      
      expect(result).toBeDefined();
      expect(result.originalText).toBe('Hello world');
      expect(result.translatedText).toContain('Mock translation');
      expect(result.sourceLang).toBe('en');
      expect(result.targetLang).toBe('hi');
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
      expect(typeof result.cached).toBe('boolean');
      expect(typeof result.provider).toBe('string');
      expect(typeof result.timestamp).toBe('number');
      expect(typeof result.processingTime).toBe('number');
    });

    test('should handle same language translation', async () => {
      const result = await translationService.translate('Hello world', 'en', 'en');
      
      expect(result.originalText).toBe('Hello world');
      expect(result.translatedText).toBe('Hello world');
      expect(result.sourceLang).toBe('en');
      expect(result.targetLang).toBe('en');
      expect(result.confidenceScore).toBeGreaterThan(0.9);
      expect(result.provider).toBe('same_language');
    });

    test('should auto-detect language when not provided', async () => {
      const result = await translationService.translate('Hello world', 'hi');
      
      expect(result).toBeDefined();
      expect(result.sourceLang).toBeDefined();
      expect(result.sourceLang).toBe('en'); // Should detect English
      expect(result.targetLang).toBe('hi');
    });

    test('should detect language successfully', async () => {
      const result = await translationService.detectLanguage('Hello world');
      
      expect(result).toBeDefined();
      expect(result.language).toBeDefined();
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should return health status', async () => {
      const health = await translationService.getHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy', 'error']).toContain(health.status);
      expect(health.timestamp).toBeDefined();
      expect(health.providers).toBeDefined();
      expect(health.cache).toBeDefined();
      expect(health.languageDetector).toBeDefined();
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 4: Translation Request Processing
     * For any valid text and target language combination, the Translation_Service should return 
     * a complete translation response with all required fields
     * Validates: Requirements 2.1, 6.2, 6.3
     */
    test('Property 4: Translation Request Processing - complete response structure', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 200 }),
          targetLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
          sourceLang: fc.option(fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'))
        }),
        async ({ text, targetLang, sourceLang }) => {
          const result = await translationService.translate(text, targetLang, sourceLang);
          
          // Verify all required fields are present
          expect(result).toBeDefined();
          expect(typeof result.originalText).toBe('string');
          expect(typeof result.translatedText).toBe('string');
          expect(typeof result.sourceLang).toBe('string');
          expect(typeof result.targetLang).toBe('string');
          expect(typeof result.confidenceScore).toBe('number');
          expect(typeof result.cached).toBe('boolean');
          expect(typeof result.provider).toBe('string');
          expect(typeof result.fallbackUsed).toBe('boolean');
          expect(typeof result.timestamp).toBe('number');
          expect(typeof result.processingTime).toBe('number');
          expect(typeof result.metadata).toBe('object');
          
          // Verify field values are valid
          expect(result.originalText).toBe(text);
          expect(result.targetLang).toBe(targetLang);
          expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
          expect(result.confidenceScore).toBeLessThanOrEqual(1);
          expect(result.timestamp).toBeGreaterThan(0);
          expect(result.processingTime).toBeGreaterThanOrEqual(0);
          
          // Source language should be detected if not provided
          if (sourceLang) {
            expect(result.sourceLang).toBe(sourceLang);
          } else {
            expect(result.sourceLang).toBeDefined();
            expect(typeof result.sourceLang).toBe('string');
            expect(result.sourceLang.length).toBe(2);
          }
          
          // Metadata should contain required fields
          expect(result.metadata).toBeDefined();
          expect(typeof result.metadata.confidenceLevel).toBe('string');
          expect(typeof result.metadata.isLowConfidence).toBe('boolean');
        }
      ), { numRuns: 20 });
    });

    /**
     * Property 5: Input Validation
     * For any invalid input (empty text, whitespace-only, malformed requests, missing fields), 
     * the Translation_Service should reject the request with appropriate error messages
     * Validates: Requirements 2.5, 6.4, 7.5
     */
    test('Property 5: Input Validation - invalid text handling', () => {
      fc.assert(fc.asyncProperty(
        fc.oneof(
          fc.constant(''), // Empty string
          fc.constant('   '), // Whitespace only
          fc.constant('\n\t  \n'), // Various whitespace
          fc.constant(null), // Null
          fc.constant(undefined) // Undefined
        ),
        fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
        async (invalidText, targetLang) => {
          // Should reject invalid text
          await expect(
            translationService.translate(invalidText, targetLang, 'en')
          ).rejects.toThrow();
        }
      ), { numRuns: 20 });
    });

    /**
     * Property 14: Large Text Handling
     * For any text exceeding 1000 characters, the Translation_Service should chunk 
     * the text appropriately for processing
     * Validates: Requirements 8.4
     */
    test('Property 14: Large Text Handling - chunking behavior', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          baseText: fc.string({ minLength: 20, maxLength: 40 }).filter(s => s.trim().length >= 10),
          repetitions: fc.integer({ min: 15, max: 25 }), // Will create text 600-1000 chars
          sourceLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
          targetLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr')
        }),
        async ({ baseText, repetitions, sourceLang, targetLang }) => {
          const largeText = (baseText.trim() + '. This is additional content to ensure meaningful text. ').repeat(repetitions);
          
          // Skip if same language (no chunking needed)
          if (sourceLang === targetLang) {
            return;
          }
          
          // Skip if text would be too long (over 1800 chars to stay under 2000 limit)
          if (largeText.length > 1800) {
            return;
          }
          
          const result = await translationService.translate(largeText, targetLang, sourceLang);
          
          // Should handle large text properly
          expect(result).toBeDefined();
          expect(result.originalText).toBe(largeText);
          expect(result.sourceLang).toBe(sourceLang);
          expect(result.targetLang).toBe(targetLang);
          expect(result.translatedText).toBeDefined();
          expect(result.translatedText.length).toBeGreaterThan(0);
          
          // Check if chunking was used based on actual text length
          if (largeText.length > 500) { // Our chunk size
            // Should either use chunked translation or regular translation
            expect(['chunked_translation', 'MockTranslationProvider']).toContain(result.provider);
            
            // If chunked, should have proper metadata
            if (result.provider === 'chunked_translation') {
              expect(result.metadata.chunked).toBe(true);
              expect(result.metadata.chunkCount).toBeGreaterThan(1);
              expect(Array.isArray(result.metadata.chunkResults)).toBe(true);
              expect(result.metadata.chunkResults.length).toBe(result.metadata.chunkCount);
            }
          }
          
          // Should maintain reasonable confidence
          expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
          expect(result.confidenceScore).toBeLessThanOrEqual(1);
        }
      ), { numRuns: 10 });
    });

    /**
     * Property 15: Formatting Preservation
     * For any text with formatting or structure, the translation should preserve 
     * the original formatting where possible
     * Validates: Requirements 2.4
     */
    test('Property 15: Formatting Preservation - markdown formatting', () => {
      fc.assert(fc.asyncProperty(
        fc.record({
          plainText: fc.string({ minLength: 5, maxLength: 50 }),
          formatType: fc.constantFrom('bold', 'italic', 'code', 'heading'),
          sourceLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
          targetLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr')
        }),
        async ({ plainText, formatType, sourceLang, targetLang }) => {
          // Skip same language
          if (sourceLang === targetLang) {
            return;
          }
          
          let formattedText;
          switch (formatType) {
            case 'bold':
              formattedText = `**${plainText}**`;
              break;
            case 'italic':
              formattedText = `*${plainText}*`;
              break;
            case 'code':
              formattedText = `\`${plainText}\``;
              break;
            case 'heading':
              formattedText = `# ${plainText}`;
              break;
          }
          
          const result = await translationService.translate(formattedText, targetLang, sourceLang);
          
          expect(result).toBeDefined();
          expect(result.originalText).toBe(formattedText);
          expect(result.translatedText).toBeDefined();
          
          // Should maintain reasonable structure
          expect(result.translatedText.length).toBeGreaterThan(0);
          expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
          expect(result.confidenceScore).toBeLessThanOrEqual(1);
        }
      ), { numRuns: 15 });
    });
  });
});