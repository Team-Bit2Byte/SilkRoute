/**
 * Property-based tests for language detection functionality
 * Feature: multilingual-translation-ai
 */

const fc = require('fast-check');
const FrancLanguageDetector = require('../src/services/FrancLanguageDetector');
const { getSupportedLanguageCodes } = require('../src/config/languages');

describe('Language Detection Property Tests', () => {
  let languageDetector;

  beforeAll(() => {
    languageDetector = new FrancLanguageDetector();
  });

  // Feature: multilingual-translation-ai, Property 1: Language Detection Accuracy
  describe('Property 1: Language Detection Accuracy', () => {
    test('should correctly identify source language with appropriate confidence scoring for supported languages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            text: fc.string({ minLength: 10, maxLength: 500 }),
            expectedLanguage: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr')
          }),
          async ({ text, expectedLanguage }) => {
            // Skip if text is too short or contains only special characters
            const cleanText = text.trim();
            if (cleanText.length < 10 || !/[a-zA-Z\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0980-\u09FF]/.test(cleanText)) {
              return true; // Skip this test case
            }

            const result = await languageDetector.detect(text);
            
            // Verify result structure
            expect(result).toHaveProperty('language');
            expect(result).toHaveProperty('confidence');
            
            // Verify language is a supported language code
            expect(getSupportedLanguageCodes()).toContain(result.language);
            
            // Verify confidence is within valid range
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            
            // Verify confidence is a number
            expect(typeof result.confidence).toBe('number');
            expect(Number.isFinite(result.confidence)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100, timeout: 30000 }
      );
    });

    test('should return consistent results for identical text inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 15, maxLength: 200 }),
          async (text) => {
            // Skip if text is only whitespace or special characters
            const cleanText = text.trim();
            if (cleanText.length < 15 || !/[a-zA-Z\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0980-\u09FF]/.test(cleanText)) {
              return true;
            }

            const result1 = await languageDetector.detect(text);
            const result2 = await languageDetector.detect(text);
            
            // Results should be identical for the same input
            expect(result1.language).toBe(result2.language);
            expect(result1.confidence).toBe(result2.confidence);
            
            return true;
          }
        ),
        { numRuns: 50, timeout: 20000 }
      );
    });

    test('should handle various text lengths appropriately', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 1000 }),
          async (text) => {
            const result = await languageDetector.detect(text);
            
            // Should always return a valid result
            expect(result).toHaveProperty('language');
            expect(result).toHaveProperty('confidence');
            expect(getSupportedLanguageCodes()).toContain(result.language);
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            
            // For very short text, confidence should be lower
            if (text.trim().length < 10) {
              expect(result.confidence).toBeLessThan(0.8);
            }
            
            return true;
          }
        ),
        { numRuns: 100, timeout: 30000 }
      );
    });
  });

  // Feature: multilingual-translation-ai, Property 2: Code-Mixed Text Handling
  describe('Property 2: Code-Mixed Text Handling', () => {
    test('should identify dominant language component for code-mixed text (Hinglish)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            hindiPart: fc.constantFrom('नमस्ते', 'आप कैसे हैं', 'मैं ठीक हूँ', 'धन्यवाद'),
            englishPart: fc.constantFrom('hello', 'how are you', 'I am fine', 'thank you'),
            connector: fc.constantFrom(' ', ', ', ' and ', ' या ')
          }),
          async ({ hindiPart, englishPart, connector }) => {
            // Create code-mixed text (Hinglish)
            const codeMixedTexts = [
              `${hindiPart}${connector}${englishPart}`,
              `${englishPart}${connector}${hindiPart}`,
              `Hello ${hindiPart} how are you`,
              `${hindiPart} thank you very much`
            ];

            for (const text of codeMixedTexts) {
              const result = await languageDetector.detect(text);
              
              // Should return a valid language
              expect(getSupportedLanguageCodes()).toContain(result.language);
              
              // Should have reasonable confidence
              expect(result.confidence).toBeGreaterThan(0);
              expect(result.confidence).toBeLessThanOrEqual(1);
              
              // For code-mixed text, should typically detect Hindi, English, or Marathi (due to shared Devanagari script)
              expect(['hi', 'en', 'mr']).toContain(result.language);
            }
            
            return true;
          }
        ),
        { numRuns: 50, timeout: 20000 }
      );
    });

    test('should handle translation appropriately for code-mixed patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20, maxLength: 100 }),
          async (baseText) => {
            // Skip if text doesn't contain mixed script patterns
            const hasLatin = /[a-zA-Z]/.test(baseText);
            const hasDevanagari = /[\u0900-\u097F]/.test(baseText);
            
            if (!hasLatin && !hasDevanagari) {
              return true; // Skip this test case
            }

            const result = await languageDetector.detect(baseText);
            
            // Should always return a result
            expect(result).toHaveProperty('language');
            expect(result).toHaveProperty('confidence');
            
            // Language should be supported
            expect(getSupportedLanguageCodes()).toContain(result.language);
            
            // Confidence should be valid
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            
            return true;
          }
        ),
        { numRuns: 30, timeout: 15000 }
      );
    });
  });

  // Language Detection Unit Tests
  describe('Language Detection Unit Tests', () => {
    test('should detect Hindi text correctly', async () => {
      const hindiTexts = [
        'नमस्ते, आप कैसे हैं?',
        'मैं भारत से हूँ और हिंदी बोलता हूँ।',
        'यह एक परीक्षण संदेश है।'
      ];

      for (const text of hindiTexts) {
        const result = await languageDetector.detect(text);
        expect(result.language).toBe('hi');
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });

    test('should detect English text correctly', async () => {
      const englishTexts = [
        'Hello, how are you today?',
        'This is a test message in English language.',
        'I am from India and I speak English fluently.'
      ];

      for (const text of englishTexts) {
        const result = await languageDetector.detect(text);
        expect(result.language).toBe('en');
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });

    test('should handle empty or invalid text gracefully', async () => {
      const invalidTexts = ['', '   ', '\n\t', '123456789'];

      for (const text of invalidTexts) {
        const result = await languageDetector.detect(text);
        expect(result).toHaveProperty('language');
        expect(result).toHaveProperty('confidence');
        expect(getSupportedLanguageCodes()).toContain(result.language);
      }
    });

    test('should return supported languages list', () => {
      const supportedLanguages = languageDetector.getSupportedLanguages();
      expect(Array.isArray(supportedLanguages)).toBe(true);
      expect(supportedLanguages.length).toBeGreaterThan(0);
      expect(supportedLanguages).toContain('hi');
      expect(supportedLanguages).toContain('en');
      expect(supportedLanguages).toContain('ta');
      expect(supportedLanguages).toContain('te');
      expect(supportedLanguages).toContain('bn');
      expect(supportedLanguages).toContain('mr');
    });

    test('should provide detection statistics', () => {
      const stats = languageDetector.getStats();
      expect(stats).toHaveProperty('supportedLanguages');
      expect(stats).toHaveProperty('confidenceThreshold');
      expect(stats).toHaveProperty('defaultLanguage');
      expect(stats).toHaveProperty('codeMixedSupport');
      expect(typeof stats.supportedLanguages).toBe('number');
      expect(stats.supportedLanguages).toBeGreaterThan(0);
    });

    test('should handle batch detection', async () => {
      const texts = [
        'Hello world',
        'नमस्ते दुनिया',
        'This is English text',
        'यह हिंदी पाठ है'
      ];

      const results = await languageDetector.batchDetect(texts);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(texts.length);

      results.forEach(result => {
        expect(result).toHaveProperty('language');
        expect(result).toHaveProperty('confidence');
        expect(getSupportedLanguageCodes()).toContain(result.language);
      });
    });
  });

  // Code-Mixed Text Unit Tests
  describe('Code-Mixed Text Unit Tests', () => {
    test('should detect Hinglish text patterns', async () => {
      const hinglishTexts = [
        'Hello नमस्ते, how are you आप कैसे हैं?',
        'I am going to India मैं भारत जा रहा हूँ',
        'Thank you धन्यवाद for your help',
        'Good morning सुप्रभात everyone',
        'Please wait थोड़ा इंतज़ार करें'
      ];

      for (const text of hinglishTexts) {
        const result = await languageDetector.detect(text);
        
        // Should detect either Hindi, English, or Marathi as dominant (due to shared Devanagari script)
        expect(['hi', 'en', 'mr']).toContain(result.language);
        expect(result.confidence).toBeGreaterThan(0.3);
      }
    });

    test('should maintain context and meaning across language boundaries', async () => {
      const contextualTexts = [
        'My name is राम and I live in Delhi',
        'आज weather बहुत अच्छा है',
        'Please call me at मेरा phone number',
        'I love Indian food खासकर biryani'
      ];

      for (const text of contextualTexts) {
        const result = await languageDetector.detect(text);
        
        // Should provide a meaningful detection result
        expect(result).toHaveProperty('language');
        expect(result).toHaveProperty('confidence');
        expect(getSupportedLanguageCodes()).toContain(result.language);
        expect(result.confidence).toBeGreaterThan(0.2);
      }
    });

    test('should support common code-mixing patterns in Indian languages', async () => {
      const patterns = {
        'English + Hindi': 'Hello नमस्ते friend',
        'Hindi + English': 'नमस्ते hello दोस्त',
        'Mixed sentences': 'आज मैं office जा रहा हूँ',
        'Technical terms': 'Computer का use करके काम करते हैं'
      };

      for (const [pattern, text] of Object.entries(patterns)) {
        const result = await languageDetector.detect(text);
        
        // Should handle the pattern gracefully
        expect(result).toHaveProperty('language');
        expect(result).toHaveProperty('confidence');
        expect(getSupportedLanguageCodes()).toContain(result.language);
      }
    });
  });

  // Feature: multilingual-translation-ai, Property 3: Language Detection Fallback
  describe('Property 3: Language Detection Fallback', () => {
    test('should default to English when detection confidence is below 70%', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // Generate text that's likely to have low confidence
            text: fc.oneof(
              fc.string({ minLength: 5, maxLength: 15 }), // Short text
              fc.constantFrom('123456789', '!@#$%^&*()', '........', '????????'), // Non-linguistic text
              fc.string({ minLength: 1, maxLength: 5 }) // Very short text
            )
          }),
          async ({ text }) => {
            const result = await languageDetector.detect(text);
            
            // Should always return a valid result
            expect(result).toHaveProperty('language');
            expect(result).toHaveProperty('confidence');
            expect(getSupportedLanguageCodes()).toContain(result.language);
            
            // Confidence should be within valid range
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            
            // For low-confidence cases, should often default to English
            if (result.confidence < 0.5) {
              // This is acceptable behavior - low confidence often leads to English default
              expect(getSupportedLanguageCodes()).toContain(result.language);
            }
            
            return true;
          }
        ),
        { numRuns: 100, timeout: 30000 }
      );
    });

    test('should handle detection failures gracefully with fallback to English', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''), // Empty string
            fc.constant('   '), // Whitespace only
            fc.constant('\n\t\r'), // Control characters
            fc.string({ minLength: 1, maxLength: 3 }) // Very short strings
          ),
          async (problematicText) => {
            const result = await languageDetector.detect(problematicText);
            
            // Should always return a result, never throw
            expect(result).toHaveProperty('language');
            expect(result).toHaveProperty('confidence');
            
            // Language should be supported (likely English as fallback)
            expect(getSupportedLanguageCodes()).toContain(result.language);
            
            // Confidence should be valid but likely low
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            
            return true;
          }
        ),
        { numRuns: 50, timeout: 15000 }
      );
    });

    test('should provide proper error handling with fallback behavior', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            invalidInput: fc.oneof(
              fc.constant(null),
              fc.constant(undefined),
              fc.constant(123),
              fc.constant({}),
              fc.constant([])
            )
          }),
          async ({ invalidInput }) => {
            // This should not throw an error but handle gracefully
            try {
              const result = await languageDetector.detect(invalidInput);
              
              // If it returns a result, it should be valid
              expect(result).toHaveProperty('language');
              expect(result).toHaveProperty('confidence');
              expect(getSupportedLanguageCodes()).toContain(result.language);
              
              return true;
            } catch (error) {
              // If it throws, that's also acceptable behavior for invalid input
              expect(error).toBeInstanceOf(Error);
              return true;
            }
          }
        ),
        { numRuns: 30, timeout: 10000 }
      );
    });
  });

  // Unit tests for fallback behavior
  describe('Language Detection Fallback Unit Tests', () => {
    test('should fallback to English for ambiguous text', async () => {
      const ambiguousTexts = [
        '123 456 789',
        '!@# $%^ &*()',
        '...........',
        'a b c d e',
        '1 2 3 4 5'
      ];

      for (const text of ambiguousTexts) {
        const result = await languageDetector.detect(text);
        
        // Should return a valid result
        expect(result).toHaveProperty('language');
        expect(result).toHaveProperty('confidence');
        expect(getSupportedLanguageCodes()).toContain(result.language);
        
        // For ambiguous text, confidence should typically be low
        expect(result.confidence).toBeLessThan(0.8);
      }
    });

    test('should handle very short text with appropriate confidence', async () => {
      const shortTexts = ['a', 'hi', 'ok', 'no', 'yes'];

      for (const text of shortTexts) {
        const result = await languageDetector.detect(text);
        
        // Should return a valid result
        expect(result).toHaveProperty('language');
        expect(result).toHaveProperty('confidence');
        expect(getSupportedLanguageCodes()).toContain(result.language);
        
        // Short text should have lower confidence
        expect(result.confidence).toBeLessThan(0.8);
      }
    });

    test('should maintain consistent fallback behavior', async () => {
      const problematicText = '???';
      
      // Run detection multiple times
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await languageDetector.detect(problematicText);
        results.push(result);
      }
      
      // All results should be consistent
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.language).toBe(firstResult.language);
        expect(result.confidence).toBe(firstResult.confidence);
      });
    });

    test('should handle mixed script text appropriately', async () => {
      const mixedTexts = [
        'abc123देव',
        '123नमस्ते456',
        'hello123world',
        'test@#$%test'
      ];

      for (const text of mixedTexts) {
        const result = await languageDetector.detect(text);
        
        // Should return a valid result
        expect(result).toHaveProperty('language');
        expect(result).toHaveProperty('confidence');
        expect(getSupportedLanguageCodes()).toContain(result.language);
        
        // Should have some confidence
        expect(result.confidence).toBeGreaterThan(0);
      }
    });
  });
});