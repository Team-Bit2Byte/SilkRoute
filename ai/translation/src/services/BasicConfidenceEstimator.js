const ConfidenceEstimator = require('../interfaces/ConfidenceEstimator');
const { logConfidenceCalculation } = require('../utils/logger');

/**
 * Basic confidence estimator implementation
 * Calculates confidence based on translation length ratio and metadata analysis
 */
class BasicConfidenceEstimator extends ConfidenceEstimator {
  constructor() {
    super();
    this.lengthRatioThresholds = {
      excellent: { min: 0.7, max: 1.3, score: 0.9 },
      good: { min: 0.5, max: 1.7, score: 0.7 },
      fair: { min: 0.3, max: 2.0, score: 0.5 },
      poor: { score: 0.3 }
    };
  }

  /**
   * Calculate confidence score for a translation
   * @param {Object} translationData - Translation result data
   * @returns {number} Confidence score between 0 and 1
   */
  calculateConfidence(translationData) {
    try {
      const {
        originalText,
        translatedText,
        sourceLang,
        targetLang,
        metadata = {}
      } = translationData;

      // Validate input data
      if (!originalText || !translatedText || !sourceLang || !targetLang) {
        logConfidenceCalculation(translationData, this.getDefaultConfidence(), 'Missing required data');
        return this.getDefaultConfidence();
      }

      // Calculate base confidence from length ratio
      const lengthRatioScore = this._calculateLengthRatioScore(originalText, translatedText);
      
      // Calculate metadata-based adjustments
      const metadataScore = this._calculateMetadataScore(metadata);
      
      // Calculate language pair confidence
      const languagePairScore = this._calculateLanguagePairScore(sourceLang, targetLang);
      
      // Combine scores with weights
      const finalScore = this._combineScores({
        lengthRatio: { score: lengthRatioScore, weight: 0.4 },
        metadata: { score: metadataScore, weight: 0.3 },
        languagePair: { score: languagePairScore, weight: 0.3 }
      });

      // Ensure score is within bounds
      const boundedScore = Math.max(0, Math.min(1, finalScore));
      
      logConfidenceCalculation(translationData, boundedScore, 'Confidence calculated successfully');
      return boundedScore;

    } catch (error) {
      logConfidenceCalculation(translationData, this.getDefaultConfidence(), `Confidence calculation error: ${error.message}`);
      return this.getDefaultConfidence();
    }
  }

  /**
   * Calculate confidence score based on length ratio between original and translated text
   * @param {string} originalText - Original text
   * @param {string} translatedText - Translated text
   * @returns {number} Length ratio score
   * @private
   */
  _calculateLengthRatioScore(originalText, translatedText) {
    const originalLength = originalText.trim().length;
    const translatedLength = translatedText.trim().length;
    
    // Handle edge cases
    if (originalLength === 0 || translatedLength === 0) {
      return 0.1;
    }

    const ratio = translatedLength / originalLength;
    
    // Check against thresholds
    for (const [level, threshold] of Object.entries(this.lengthRatioThresholds)) {
      if (level === 'poor') continue;
      
      if (ratio >= threshold.min && ratio <= threshold.max) {
        return threshold.score;
      }
    }
    
    // Return poor score if no threshold matched
    return this.lengthRatioThresholds.poor.score;
  }

  /**
   * Calculate confidence adjustments based on API metadata
   * @param {Object} metadata - Translation API metadata
   * @returns {number} Metadata-based score
   * @private
   */
  _calculateMetadataScore(metadata) {
    let score = 0.5; // Base score
    
    // Check for API-provided confidence scores
    if (metadata.confidence !== undefined) {
      score = Math.max(score, metadata.confidence);
    }
    
    // Check for translation quality indicators
    if (metadata.quality) {
      const qualityMap = {
        'high': 0.9,
        'medium': 0.7,
        'low': 0.3
      };
      score = Math.max(score, qualityMap[metadata.quality] || 0.5);
    }
    
    // Check for model information
    if (metadata.model) {
      // Prefer specialized models for Indian languages
      if (metadata.model.includes('sarvam') || metadata.model.includes('indic')) {
        score += 0.1;
      }
    }
    
    // Check for processing time (faster usually indicates higher confidence)
    if (metadata.processingTime !== undefined) {
      if (metadata.processingTime < 1000) { // Less than 1 second
        score += 0.05;
      } else if (metadata.processingTime > 5000) { // More than 5 seconds
        score -= 0.1;
      }
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate confidence based on language pair characteristics
   * @param {string} sourceLang - Source language code
   * @param {string} targetLang - Target language code
   * @returns {number} Language pair score
   * @private
   */
  _calculateLanguagePairScore(sourceLang, targetLang) {
    // Same language should have high confidence
    if (sourceLang === targetLang) {
      return 0.95;
    }
    
    // Define language pair confidence mappings
    const languagePairConfidence = {
      // English pairs (generally well-supported)
      'en-hi': 0.8, 'hi-en': 0.8,
      'en-ta': 0.7, 'ta-en': 0.7,
      'en-te': 0.7, 'te-en': 0.7,
      'en-bn': 0.7, 'bn-en': 0.7,
      'en-mr': 0.7, 'mr-en': 0.7,
      
      // Indian language pairs (moderate support)
      'hi-ta': 0.6, 'ta-hi': 0.6,
      'hi-te': 0.6, 'te-hi': 0.6,
      'hi-bn': 0.6, 'bn-hi': 0.6,
      'hi-mr': 0.7, 'mr-hi': 0.7, // Hindi-Marathi closer
      'ta-te': 0.6, 'te-ta': 0.6,
      'ta-bn': 0.5, 'bn-ta': 0.5,
      'ta-mr': 0.5, 'mr-ta': 0.5,
      'te-bn': 0.5, 'bn-te': 0.5,
      'te-mr': 0.5, 'mr-te': 0.5,
      'bn-mr': 0.5, 'mr-bn': 0.5
    };
    
    const pairKey = `${sourceLang}-${targetLang}`;
    return languagePairConfidence[pairKey] || 0.5; // Default for unknown pairs
  }

  /**
   * Combine multiple confidence scores with weights
   * @param {Object} scores - Object with score and weight properties
   * @returns {number} Combined weighted score
   * @private
   */
  _combineScores(scores) {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [component, data] of Object.entries(scores)) {
      totalScore += data.score * data.weight;
      totalWeight += data.weight;
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0.5;
  }

  /**
   * Get confidence level description
   * @param {number} confidenceScore - Confidence score
   * @returns {string} Confidence level description
   */
  getConfidenceLevel(confidenceScore) {
    if (confidenceScore >= 0.8) return 'high';
    if (confidenceScore >= 0.6) return 'medium';
    if (confidenceScore >= 0.4) return 'low';
    return 'very_low';
  }
}

module.exports = BasicConfidenceEstimator;