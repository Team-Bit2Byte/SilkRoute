/**
 * Interface for confidence estimation in translation results
 * Calculates reliability scores based on translation metadata and heuristics
 */
class ConfidenceEstimator {
  /**
   * Calculate confidence score for a translation
   * @param {Object} translationData - Translation result data
   * @param {string} translationData.originalText - Original source text
   * @param {string} translationData.translatedText - Translated text
   * @param {string} translationData.sourceLang - Source language code
   * @param {string} translationData.targetLang - Target language code
   * @param {Object} translationData.metadata - Additional metadata from translation API
   * @returns {number} Confidence score between 0 and 1
   */
  calculateConfidence(translationData) {
    throw new Error('calculateConfidence method must be implemented');
  }

  /**
   * Determine if a confidence score indicates low confidence
   * @param {number} confidenceScore - Confidence score to evaluate
   * @returns {boolean} True if confidence is considered low
   */
  isLowConfidence(confidenceScore) {
    return confidenceScore < 0.5;
  }

  /**
   * Get default confidence score when calculation fails
   * @returns {number} Default confidence score
   */
  getDefaultConfidence() {
    return 0.5;
  }
}

module.exports = ConfidenceEstimator;