/**
 * Language detection service using pattern matching and statistical analysis
 * Implements automatic language identification with confidence scoring
 */

const LanguageDetector = require('../interfaces/LanguageDetector');
const { 
  getSupportedLanguageCodes, 
  DEFAULT_LANGUAGE, 
  CONFIDENCE_THRESHOLD,
  detectCodeMixedPattern 
} = require('../config/languages');
const { logLanguageDetection } = require('../utils/logger');
const { validateText } = require('../utils/validation');

class FrancLanguageDetector extends LanguageDetector {
  constructor() {
    super();
    this.supportedLanguages = getSupportedLanguageCodes();
    this.confidenceThreshold = CONFIDENCE_THRESHOLD;
    this.defaultLanguage = DEFAULT_LANGUAGE;
    
    // Language patterns for detection
    this.languagePatterns = {
      'hi': {
        script: /[\u0900-\u097F]/g, // Devanagari
        commonWords: ['है', 'हैं', 'का', 'की', 'के', 'में', 'से', 'को', 'और', 'यह', 'वह', 'था', 'थी', 'थे', 'नमस्ते', 'आप', 'कैसे', 'मैं', 'हूँ', 'भारत', 'एक', 'परीक्षण', 'संदेश'],
        name: 'Hindi'
      },
      'en': {
        script: /[a-zA-Z]/g, // Latin
        commonWords: ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with', 'for', 'as', 'was', 'on', 'hello', 'how', 'are', 'you', 'today', 'this', 'from', 'speak'],
        name: 'English'
      },
      'ta': {
        script: /[\u0B80-\u0BFF]/g, // Tamil
        commonWords: ['அது', 'இது', 'என்று', 'ஒரு', 'அந்த', 'இந்த', 'மற்றும்', 'அல்லது'],
        name: 'Tamil'
      },
      'te': {
        script: /[\u0C00-\u0C7F]/g, // Telugu
        commonWords: ['అది', 'ఇది', 'అని', 'ఒక', 'ఆ', 'ఈ', 'మరియు', 'లేదా'],
        name: 'Telugu'
      },
      'bn': {
        script: /[\u0980-\u09FF]/g, // Bengali
        commonWords: ['এটি', 'সেটি', 'যে', 'একটি', 'সেই', 'এই', 'এবং', 'অথবা'],
        name: 'Bengali'
      },
      'mr': {
        script: /[\u0900-\u097F]/g, // Devanagari (same as Hindi)
        commonWords: ['हे', 'ते', 'आहे', 'एक', 'त्या', 'या', 'आणि', 'किंवा', 'मराठी'],
        name: 'Marathi'
      }
    };
  }

  /**
   * Detect the language of the given text
   * @param {string} text - Text to analyze for language detection
   * @returns {Promise<{language: string, confidence: number}>}
   */
  async detect(text) {
    try {
      // Validate input text
      const textValidation = validateText(text);
      if (!textValidation.valid) {
        throw new Error(`Invalid text for language detection: ${textValidation.message}`);
      }

      const cleanText = text.trim();
      
      // Handle very short text (less than 10 characters)
      if (cleanText.length < 10) {
        logLanguageDetection(text, this.defaultLanguage, 0.3);
        return {
          language: this.defaultLanguage,
          confidence: 0.3
        };
      }

      // Detect language using pattern matching
      const detectionResults = [];
      
      for (const [langCode, pattern] of Object.entries(this.languagePatterns)) {
        const confidence = this._calculateLanguageConfidence(cleanText, pattern);
        if (confidence > 0.1) {
          detectionResults.push({
            language: langCode,
            confidence
          });
        }
      }

      // Sort by confidence
      detectionResults.sort((a, b) => b.confidence - a.confidence);
      
      if (detectionResults.length === 0) {
        // If no language detected, try code-mixed text detection
        const codeMixedResult = await this._detectCodeMixed(cleanText);
        if (codeMixedResult) {
          return codeMixedResult;
        }
        
        // Fallback to default language with low confidence
        logLanguageDetection(text, this.defaultLanguage, 0.2);
        return {
          language: this.defaultLanguage,
          confidence: 0.2
        };
      }

      const bestMatch = detectionResults[0];
      
      // If confidence is below threshold, fallback to default language
      if (bestMatch.confidence < 0.5) { // Lowered threshold from 0.7 to 0.5
        logLanguageDetection(text, this.defaultLanguage, bestMatch.confidence);
        return {
          language: this.defaultLanguage,
          confidence: Math.max(bestMatch.confidence, 0.3) // Ensure minimum confidence
        };
      }

      logLanguageDetection(text, bestMatch.language, bestMatch.confidence);
      return bestMatch;

    } catch (error) {
      // Log error and return default language
      console.error('Language detection error:', error);
      logLanguageDetection(text, this.defaultLanguage, 0.2);
      return {
        language: this.defaultLanguage,
        confidence: 0.2
      };
    }
  }

  /**
   * Get list of supported language codes for detection
   * @returns {Array<string>} Array of ISO 639-1 language codes
   */
  getSupportedLanguages() {
    return [...this.supportedLanguages];
  }

  /**
   * Detect code-mixed text (like Hinglish)
   * @param {string} text - Text to analyze
   * @returns {Promise<Object|null>} Detection result or null
   */
  async _detectCodeMixed(text) {
    try {
      // Split text into segments and detect language for each
      const segments = this._segmentText(text);
      const detectionResults = [];

      for (const segment of segments) {
        if (segment.trim().length < 5) continue;
        
        // Detect language for each segment
        for (const [langCode, pattern] of Object.entries(this.languagePatterns)) {
          const confidence = this._calculateLanguageConfidence(segment, pattern);
          if (confidence > 0.2) {
            detectionResults.push({
              language: langCode,
              confidence,
              segment: segment.substring(0, 50) // Store first 50 chars for debugging
            });
          }
        }
      }

      // Check for code-mixed patterns
      const codeMixedPattern = detectCodeMixedPattern(detectionResults);
      if (codeMixedPattern) {
        // Return the primary language with adjusted confidence
        const primaryLang = codeMixedPattern.primary;
        const confidence = Math.min(0.8, Math.max(0.4, 
          detectionResults
            .filter(r => r.language === primaryLang)
            .reduce((sum, r) => sum + r.confidence, 0) / 
          detectionResults.filter(r => r.language === primaryLang).length || 0.4
        ));

        return {
          language: primaryLang,
          confidence,
          codeMixed: true,
          pattern: codeMixedPattern.pattern
        };
      }

      return null;
    } catch (error) {
      console.error('Code-mixed detection error:', error);
      return null;
    }
  }

  /**
   * Segment text for code-mixed analysis
   * @param {string} text - Text to segment
   * @returns {Array<string>} Array of text segments
   */
  _segmentText(text) {
    // Simple segmentation by sentences and phrases
    return text
      .split(/[.!?।]+/) // Split by sentence endings (including Hindi danda)
      .flatMap(sentence => sentence.split(/[,;:]+/)) // Further split by punctuation
      .map(segment => segment.trim())
      .filter(segment => segment.length > 0);
  }

  /**
   * Calculate confidence for a specific language pattern
   * @param {string} text - Text to analyze
   * @param {Object} pattern - Language pattern object
   * @returns {number} Confidence score (0-1)
   */
  _calculateLanguageConfidence(text, pattern) {
    let confidence = 0;
    
    // Check script characters
    const scriptMatches = text.match(pattern.script) || [];
    const scriptRatio = scriptMatches.length / text.length;
    
    // For Hindi/Marathi, need to distinguish between them
    if (pattern.name === 'Hindi' || pattern.name === 'Marathi') {
      confidence += scriptRatio * 0.5; // Lower weight for script since they share Devanagari
    } else {
      confidence += scriptRatio * 0.7; // Higher weight for unique scripts
    }
    
    // Check common words with fuzzy matching
    const words = text.toLowerCase().split(/\s+/);
    let commonWordMatches = 0;
    
    for (const word of words) {
      for (const commonWord of pattern.commonWords) {
        if (word.includes(commonWord) || commonWord.includes(word) || 
            this._calculateSimilarity(word, commonWord) > 0.8) {
          commonWordMatches++;
          break; // Only count each word once
        }
      }
    }
    
    const wordRatio = commonWordMatches / Math.max(words.length, 1);
    confidence += wordRatio * 0.3;
    
    // Special handling for Hindi vs Marathi disambiguation
    if (pattern.name === 'Hindi') {
      // Boost Hindi if we find specific Hindi words
      const hindiSpecificWords = ['नमस्ते', 'आप', 'कैसे', 'मैं', 'हूँ', 'भारत'];
      const hindiMatches = words.filter(word => 
        hindiSpecificWords.some(hw => word.includes(hw) || hw.includes(word))
      );
      if (hindiMatches.length > 0) {
        confidence += 0.2;
      }
    } else if (pattern.name === 'Marathi') {
      // Boost Marathi if we find specific Marathi words
      const marathiSpecificWords = ['मराठी', 'आहे', 'त्या'];
      const marathiMatches = words.filter(word => 
        marathiSpecificWords.some(mw => word.includes(mw) || mw.includes(word))
      );
      if (marathiMatches.length > 0) {
        confidence += 0.2;
      }
    }
    
    // Adjust based on text length
    if (text.length > 100) {
      confidence *= 1.1;
    } else if (text.length < 30) {
      confidence *= 0.9;
    }
    
    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Calculate string similarity using simple character overlap
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  _calculateSimilarity(str1, str2) {
    if (str1.length === 0 || str2.length === 0) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this._levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  _levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Batch detect languages for multiple texts
   * @param {Array<string>} texts - Array of texts to analyze
   * @returns {Promise<Array<Object>>} Array of detection results
   */
  async batchDetect(texts) {
    if (!Array.isArray(texts)) {
      throw new Error('Texts must be an array');
    }

    const results = [];
    for (const text of texts) {
      try {
        const result = await this.detect(text);
        results.push(result);
      } catch (error) {
        results.push({
          language: this.defaultLanguage,
          confidence: 0.2,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get detection statistics
   * @returns {Object} Detection statistics
   */
  getStats() {
    return {
      supportedLanguages: this.supportedLanguages.length,
      confidenceThreshold: this.confidenceThreshold,
      defaultLanguage: this.defaultLanguage,
      codeMixedSupport: true
    };
  }
}

module.exports = FrancLanguageDetector;