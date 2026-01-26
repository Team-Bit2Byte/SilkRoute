const fc = require('fast-check');
const BasicConfidenceEstimator = require('../src/services/BasicConfidenceEstimator');

describe('Confidence Estimation Tests', () => {
  let confidenceEstimator;

  beforeEach(() => {
    confidenceEstimator = new BasicConfidenceEstimator();
  });

  describe('Unit Tests', () => {
    test('should calculate confidence for valid translation data', () => {
      const translationData = {
        originalText: 'Hello world',
        translatedText: 'नमस्ते दुनिया',
        sourceLang: 'en',
        targetLang: 'hi',
        metadata: { confidence: 0.8 }
      };

      const confidence = confidenceEstimator.calculateConfidence(translationData);
      
      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
      expect(typeof confidence).toBe('number');
    });

    test('should return default confidence for missing data', () => {
      const translationData = {
        originalText: '',
        translatedText: '',
        sourceLang: '',
        targetLang: ''
      };

      const confidence = confidenceEstimator.calculateConfidence(translationData);
      expect(confidence).toBe(0.5);
    });

    test('should identify low confidence translations', () => {
      expect(confidenceEstimator.isLowConfidence(0.3)).toBe(true);
      expect(confidenceEstimator.isLowConfidence(0.7)).toBe(false);
      expect(confidenceEstimator.isLowConfidence(0.5)).toBe(false);
    });

    test('should return appropriate confidence levels', () => {
      expect(confidenceEstimator.getConfidenceLevel(0.9)).toBe('high');
      expect(confidenceEstimator.getConfidenceLevel(0.7)).toBe('medium');
      expect(confidenceEstimator.getConfidenceLevel(0.5)).toBe('low');
      expect(confidenceEstimator.getConfidenceLevel(0.2)).toBe('very_low');
    });

    test('should handle same language pairs with high confidence', () => {
      const translationData = {
        originalText: 'Hello world',
        translatedText: 'Hello world',
        sourceLang: 'en',
        targetLang: 'en',
        metadata: {}
      };

      const confidence = confidenceEstimator.calculateConfidence(translationData);
      expect(confidence).toBeGreaterThan(0.8);
    });

    test('should adjust confidence based on length ratio', () => {
      // Good length ratio
      const goodRatio = {
        originalText: 'Hello world',
        translatedText: 'नमस्ते दुनिया',
        sourceLang: 'en',
        targetLang: 'hi',
        metadata: {}
      };

      // Poor length ratio (too short translation)
      const poorRatio = {
        originalText: 'This is a very long sentence with many words',
        translatedText: 'Hi',
        sourceLang: 'en',
        targetLang: 'hi',
        metadata: {}
      };

      const goodConfidence = confidenceEstimator.calculateConfidence(goodRatio);
      const poorConfidence = confidenceEstimator.calculateConfidence(poorRatio);

      expect(goodConfidence).toBeGreaterThan(poorConfidence);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 8: Confidence Score Calculation
     * For any completed translation, the Confidence_Estimator should calculate a score between 0 and 1,
     * flag low confidence translations, and include the score in all responses
     * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
     */
    test('Property 8: Confidence Score Calculation - score bounds and completeness', () => {
      fc.assert(fc.property(
        fc.record({
          originalText: fc.string({ minLength: 1, maxLength: 500 }),
          translatedText: fc.string({ minLength: 1, maxLength: 500 }),
          sourceLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
          targetLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
          metadata: fc.record({
            confidence: fc.option(fc.float({ min: 0, max: 1 })),
            quality: fc.option(fc.constantFrom('high', 'medium', 'low')),
            model: fc.option(fc.string()),
            processingTime: fc.option(fc.integer({ min: 100, max: 10000 }))
          }, { requiredKeys: [] })
        }),
        (translationData) => {
          const confidence = confidenceEstimator.calculateConfidence(translationData);
          
          // Score must be between 0 and 1
          expect(confidence).toBeGreaterThanOrEqual(0);
          expect(confidence).toBeLessThanOrEqual(1);
          expect(typeof confidence).toBe('number');
          expect(Number.isFinite(confidence)).toBe(true);
          
          // Low confidence flagging should be consistent
          const isLow = confidenceEstimator.isLowConfidence(confidence);
          expect(typeof isLow).toBe('boolean');
          expect(isLow).toBe(confidence < 0.5);
          
          // Confidence level should be appropriate
          const level = confidenceEstimator.getConfidenceLevel(confidence);
          expect(['high', 'medium', 'low', 'very_low']).toContain(level);
        }
      ), { numRuns: 100 });
    });

    test('Property 8: Confidence Score Calculation - metadata influence', () => {
      fc.assert(fc.property(
        fc.record({
          originalText: fc.string({ minLength: 10, maxLength: 100 }),
          translatedText: fc.string({ minLength: 10, maxLength: 100 }),
          sourceLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
          targetLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr')
        }),
        fc.record({
          confidence: fc.float({ min: 0, max: 1 }),
          quality: fc.constantFrom('high', 'medium', 'low'),
          model: fc.string(),
          processingTime: fc.integer({ min: 100, max: 5000 })
        }),
        (baseData, metadata) => {
          const withoutMetadata = confidenceEstimator.calculateConfidence({
            ...baseData,
            metadata: {}
          });
          
          const withMetadata = confidenceEstimator.calculateConfidence({
            ...baseData,
            metadata
          });
          
          // Both should be valid scores
          expect(withoutMetadata).toBeGreaterThanOrEqual(0);
          expect(withoutMetadata).toBeLessThanOrEqual(1);
          expect(withMetadata).toBeGreaterThanOrEqual(0);
          expect(withMetadata).toBeLessThanOrEqual(1);
          
          // High quality metadata should generally improve confidence
          if (metadata.quality === 'high' && metadata.confidence > 0.7) {
            expect(withMetadata).toBeGreaterThanOrEqual(withoutMetadata - 0.1); // Allow small variance
          }
        }
      ), { numRuns: 100 });
    });

    test('Property 8: Confidence Score Calculation - length ratio impact', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 20, maxLength: 100 }),
        fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
        fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
        fc.float({ min: 0.1, max: 3.0 }),
        (originalText, sourceLang, targetLang, lengthMultiplier) => {
          // Create translated text with specific length ratio
          const targetLength = Math.max(1, Math.floor(originalText.length * lengthMultiplier));
          const translatedText = 'a'.repeat(targetLength);
          
          const confidence = confidenceEstimator.calculateConfidence({
            originalText,
            translatedText,
            sourceLang,
            targetLang,
            metadata: {}
          });
          
          expect(confidence).toBeGreaterThanOrEqual(0);
          expect(confidence).toBeLessThanOrEqual(1);
          
          // Reasonable length ratios (0.7-1.3) should generally have higher confidence
          // than extreme ratios
          if (lengthMultiplier >= 0.7 && lengthMultiplier <= 1.3) {
            expect(confidence).toBeGreaterThan(0.3); // Should be reasonably confident
          }
        }
      ), { numRuns: 100 });
    });

    test('Property 8: Confidence Score Calculation - error handling', () => {
      fc.assert(fc.property(
        fc.record({
          originalText: fc.option(fc.string()),
          translatedText: fc.option(fc.string()),
          sourceLang: fc.option(fc.string()),
          targetLang: fc.option(fc.string()),
          metadata: fc.option(fc.object())
        }),
        (invalidData) => {
          // Should handle invalid data gracefully
          const confidence = confidenceEstimator.calculateConfidence(invalidData);
          
          // Should always return a valid number
          expect(typeof confidence).toBe('number');
          expect(Number.isFinite(confidence)).toBe(true);
          expect(confidence).toBeGreaterThanOrEqual(0);
          expect(confidence).toBeLessThanOrEqual(1);
          
          // For invalid data, should return default confidence
          if (!invalidData.originalText || !invalidData.translatedText || 
              !invalidData.sourceLang || !invalidData.targetLang) {
            expect(confidence).toBe(0.5);
          }
        }
      ), { numRuns: 100 });
    });

    test('Property 8: Confidence Score Calculation - same language high confidence', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 5, maxLength: 200 }),
        fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
        (text, language) => {
          const confidence = confidenceEstimator.calculateConfidence({
            originalText: text,
            translatedText: text, // Same text for same language
            sourceLang: language,
            targetLang: language,
            metadata: {}
          });
          
          // Same language should have very high confidence
          expect(confidence).toBeGreaterThan(0.8);
          expect(confidence).toBeLessThanOrEqual(1);
        }
      ), { numRuns: 50 });
    });

    test('Property 8: Confidence Score Calculation - consistency', () => {
      fc.assert(fc.property(
        fc.record({
          originalText: fc.string({ minLength: 10, maxLength: 100 }),
          translatedText: fc.string({ minLength: 10, maxLength: 100 }),
          sourceLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
          targetLang: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr'),
          metadata: fc.record({
            confidence: fc.option(fc.float({ min: 0, max: 1 })),
            quality: fc.option(fc.constantFrom('high', 'medium', 'low'))
          }, { requiredKeys: [] })
        }),
        (translationData) => {
          // Multiple calls with same data should return same confidence
          const confidence1 = confidenceEstimator.calculateConfidence(translationData);
          const confidence2 = confidenceEstimator.calculateConfidence(translationData);
          
          expect(confidence1).toBe(confidence2);
        }
      ), { numRuns: 50 });
    });
  });
});