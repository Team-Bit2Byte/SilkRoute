const { logger } = require('../utils/logger');
const { 
  validateTranslationRequest, 
  isValidLanguageCode, 
  extractFormatting, 
  restoreFormatting, 
  intelligentChunk,
  analyzeTextStructure 
} = require('../utils/validation');

/**
 * Core translation service that orchestrates all components
 * Provides translate(), detectLanguage(), and getHealth() methods
 */
class TranslationService {
  constructor(options = {}) {
    this.languageDetector = options.languageDetector;
    this.cacheManager = options.cacheManager;
    this.providers = options.providers || [];
    this.confidenceEstimator = options.confidenceEstimator;
    this.fallbackHandler = options.fallbackHandler;
    
    // Configuration
    this.maxTextLength = options.maxTextLength || 1000;
    this.chunkSize = options.chunkSize || 800;
    this.minConfidenceThreshold = options.minConfidenceThreshold || 0.5;
    
    // Validate required dependencies
    this._validateDependencies();
  }

  /**
   * Translate text from source language to target language
   * @param {string} text - Text to translate
   * @param {string} targetLang - Target language code
   * @param {string|null} sourceLang - Source language code (auto-detect if null)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Translation result
   */
  async translate(text, targetLang, sourceLang = null, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validationResult = this._validateTranslationInput(text, targetLang, sourceLang);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // Detect source language if not provided
      let detectedSourceLang = sourceLang;
      if (!sourceLang) {
        const detection = await this.detectLanguage(text);
        detectedSourceLang = detection.language;
        
        logger.info('Language detected', {
          text: text.substring(0, 50) + '...',
          detectedLanguage: detectedSourceLang,
          confidence: detection.confidence,
          type: 'language_detection'
        });
      }

      // Check if source and target are the same
      if (detectedSourceLang === targetLang) {
        return this._createSameLanguageResponse(text, detectedSourceLang, startTime);
      }

      // Check cache first
      const cacheKey = this.cacheManager.generateKey(text, detectedSourceLang, targetLang);
      const cachedResult = this.cacheManager.get(cacheKey);
      
      if (cachedResult) {
        logger.info('Cache hit for translation', {
          cacheKey,
          sourceLang: detectedSourceLang,
          targetLang,
          type: 'cache_hit'
        });
        
        return {
          ...cachedResult,
          cached: true,
          timestamp: Date.now(),
          processingTime: Date.now() - startTime
        };
      }

      // Handle large text by chunking
      if (text.length > this.maxTextLength) {
        return await this._translateLargeText(text, detectedSourceLang, targetLang, options, startTime);
      }

      // Perform translation using providers with fallback
      const translationResult = await this.fallbackHandler.handleProviderFallback(
        this.providers,
        text,
        detectedSourceLang,
        targetLang,
        options
      );

      // Calculate confidence score
      const confidenceScore = this.confidenceEstimator.calculateConfidence({
        originalText: text,
        translatedText: translationResult.translatedText,
        sourceLang: detectedSourceLang,
        targetLang: targetLang,
        metadata: translationResult.metadata || {}
      });

      // Create final response
      const response = {
        originalText: text,
        translatedText: translationResult.translatedText,
        sourceLang: detectedSourceLang,
        targetLang: targetLang,
        confidenceScore: confidenceScore,
        cached: false,
        provider: translationResult.provider,
        fallbackUsed: translationResult.fallbackUsed || false,
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
        metadata: {
          ...translationResult.metadata,
          confidenceLevel: this.confidenceEstimator.getConfidenceLevel(confidenceScore),
          isLowConfidence: this.confidenceEstimator.isLowConfidence(confidenceScore)
        }
      };

      // Cache the result if confidence is above threshold
      if (confidenceScore >= this.minConfidenceThreshold) {
        this.cacheManager.set(cacheKey, {
          translatedText: response.translatedText,
          sourceLang: response.sourceLang,
          targetLang: response.targetLang,
          confidenceScore: response.confidenceScore,
          provider: response.provider,
          timestamp: response.timestamp
        });
      }

      logger.info('Translation completed', {
        sourceLang: detectedSourceLang,
        targetLang,
        confidence: confidenceScore,
        provider: translationResult.provider,
        fallbackUsed: translationResult.fallbackUsed,
        processingTime: response.processingTime,
        type: 'translation_success'
      });

      return response;

    } catch (error) {
      logger.error('Translation failed', {
        error: error.message,
        text: text.substring(0, 50) + '...',
        targetLang,
        sourceLang,
        processingTime: Date.now() - startTime,
        type: 'translation_error'
      });

      throw error;
    }
  }

  /**
   * Detect the language of the given text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Language detection result
   */
  async detectLanguage(text) {
    try {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Text is required for language detection');
      }

      const result = this.languageDetector.detect(text.trim());
      
      logger.debug('Language detection completed', {
        text: text.substring(0, 50) + '...',
        detectedLanguage: result.language,
        confidence: result.confidence,
        type: 'language_detection_success'
      });

      return result;

    } catch (error) {
      logger.error('Language detection failed', {
        error: error.message,
        text: text.substring(0, 50) + '...',
        type: 'language_detection_error'
      });

      // Return fallback to English
      return {
        language: 'en',
        confidence: 0.1,
        fallback: true,
        error: error.message
      };
    }
  }

  /**
   * Get health status of the translation service
   * @returns {Promise<Object>} Health status information
   */
  async getHealth() {
    const health = {
      status: 'healthy',
      timestamp: Date.now(),
      providers: {},
      cache: {
        status: 'unknown',
        size: 0
      },
      languageDetector: {
        status: 'unknown',
        supportedLanguages: []
      }
    };

    try {
      // Check provider health
      for (const provider of this.providers) {
        const providerName = provider.constructor.name;
        try {
          const isAvailable = await provider.isAvailable();
          health.providers[providerName] = {
            status: isAvailable ? 'available' : 'unavailable',
            supportedLanguages: provider.getSupportedLanguages()
          };
        } catch (error) {
          health.providers[providerName] = {
            status: 'error',
            error: error.message
          };
        }
      }

      // Check cache health
      try {
        // Test cache with a simple operation
        const testKey = 'health_check_' + Date.now();
        this.cacheManager.set(testKey, { test: true }, 1000);
        const testResult = this.cacheManager.get(testKey);
        
        health.cache = {
          status: testResult ? 'available' : 'unavailable',
          size: this.cacheManager.size || 0
        };
      } catch (error) {
        health.cache = {
          status: 'error',
          error: error.message
        };
      }

      // Check language detector health
      try {
        health.languageDetector = {
          status: 'available',
          supportedLanguages: this.languageDetector.getSupportedLanguages()
        };
      } catch (error) {
        health.languageDetector = {
          status: 'error',
          error: error.message
        };
      }

      // Determine overall health
      const hasAvailableProvider = Object.values(health.providers).some(p => p.status === 'available');
      const cacheWorking = health.cache.status === 'available';
      const languageDetectorWorking = health.languageDetector.status === 'available';

      if (!hasAvailableProvider) {
        health.status = 'unhealthy';
        health.reason = 'No translation providers available';
      } else if (!languageDetectorWorking) {
        health.status = 'degraded';
        health.reason = 'Language detection unavailable';
      } else if (!cacheWorking) {
        health.status = 'degraded';
        health.reason = 'Cache unavailable';
      }

      logger.info('Health check completed', {
        status: health.status,
        availableProviders: Object.keys(health.providers).filter(p => health.providers[p].status === 'available').length,
        totalProviders: Object.keys(health.providers).length,
        type: 'health_check'
      });

      return health;

    } catch (error) {
      logger.error('Health check failed', {
        error: error.message,
        type: 'health_check_error'
      });

      return {
        status: 'error',
        timestamp: Date.now(),
        error: error.message
      };
    }
  }

  /**
   * Validate translation input parameters
   * @param {string} text - Text to validate
   * @param {string} targetLang - Target language to validate
   * @param {string|null} sourceLang - Source language to validate
   * @returns {Object} Validation result
   * @private
   */
  _validateTranslationInput(text, targetLang, sourceLang) {
    // Validate text
    if (!text || typeof text !== 'string') {
      return { valid: false, error: 'Text is required and must be a string' };
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return { valid: false, error: 'Text cannot be empty or whitespace only' };
    }

    if (trimmedText.length > this.maxTextLength * 2) { // Allow some buffer for chunking
      return { valid: false, error: `Text is too long. Maximum length is ${this.maxTextLength * 2} characters` };
    }

    // Validate target language
    if (!targetLang || typeof targetLang !== 'string') {
      return { valid: false, error: 'Target language is required and must be a string' };
    }

    if (!isValidLanguageCode(targetLang)) {
      return { valid: false, error: `Invalid target language code: ${targetLang}` };
    }

    // Validate source language if provided
    if (sourceLang !== null && sourceLang !== undefined) {
      if (typeof sourceLang !== 'string') {
        return { valid: false, error: 'Source language must be a string or null' };
      }

      if (!isValidLanguageCode(sourceLang)) {
        return { valid: false, error: `Invalid source language code: ${sourceLang}` };
      }
    }

    return { valid: true };
  }

  /**
   * Create response for same language translation
   * @param {string} text - Original text
   * @param {string} language - Language code
   * @param {number} startTime - Start time for processing time calculation
   * @returns {Object} Same language response
   * @private
   */
  _createSameLanguageResponse(text, language, startTime) {
    return {
      originalText: text,
      translatedText: text,
      sourceLang: language,
      targetLang: language,
      confidenceScore: 0.95,
      cached: false,
      provider: 'same_language',
      fallbackUsed: false,
      timestamp: Date.now(),
      processingTime: Date.now() - startTime,
      metadata: {
        confidenceLevel: 'high',
        isLowConfidence: false,
        sameLanguage: true
      }
    };
  }

  /**
   * Handle translation of large text by chunking
   * @param {string} text - Large text to translate
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @param {Object} options - Translation options
   * @param {number} startTime - Start time
   * @returns {Promise<Object>} Translation result
   * @private
   */
  async _translateLargeText(text, sourceLang, targetLang, options, startTime) {
    logger.info('Handling large text translation', {
      textLength: text.length,
      chunkSize: this.chunkSize,
      sourceLang,
      targetLang,
      type: 'large_text_translation'
    });

    // Analyze text structure for formatting preservation
    const textAnalysis = analyzeTextStructure(text);
    
    // Extract formatting if present
    let processedText = text;
    let formatMap = null;
    
    if (textAnalysis.hasFormatting) {
      const formatResult = extractFormatting(text);
      processedText = formatResult.text;
      formatMap = formatResult.formatMap;
      
      logger.debug('Formatting extracted for preservation', {
        originalLength: text.length,
        processedLength: processedText.length,
        formatMarkers: formatMap.size,
        type: 'formatting_extraction'
      });
    }

    // Use intelligent chunking that preserves boundaries
    const chunks = intelligentChunk(processedText, this.chunkSize);
    const translatedChunks = [];
    const chunkResults = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Translate each chunk
        const chunkResult = await this.fallbackHandler.handleProviderFallback(
          this.providers,
          chunk.text,
          sourceLang,
          targetLang,
          options
        );

        translatedChunks.push(chunkResult.translatedText);
        chunkResults.push({
          ...chunkResult,
          chunkIndex: i,
          originalBoundaries: chunk.boundaries
        });

      } catch (error) {
        logger.error('Chunk translation failed', {
          chunkIndex: i,
          chunkLength: chunk.text.length,
          error: error.message,
          type: 'chunk_translation_error'
        });

        // Use original chunk as fallback
        translatedChunks.push(chunk.text);
        chunkResults.push({
          translatedText: chunk.text,
          confidence: 0.1,
          provider: 'fallback',
          fallbackUsed: true,
          error: error.message,
          chunkIndex: i,
          originalBoundaries: chunk.boundaries
        });
      }
    }

    // Combine translated chunks with proper spacing
    let combinedTranslation = this._combineChunks(translatedChunks, chunks, textAnalysis);

    // Restore formatting if it was extracted
    if (formatMap && formatMap.size > 0) {
      combinedTranslation = restoreFormatting(combinedTranslation, formatMap);
      
      logger.debug('Formatting restored after translation', {
        restoredMarkers: formatMap.size,
        finalLength: combinedTranslation.length,
        type: 'formatting_restoration'
      });
    }

    // Calculate overall confidence (average of chunk confidences)
    const avgConfidence = chunkResults.reduce((sum, result) => sum + (result.confidence || 0.1), 0) / chunkResults.length;

    // Calculate final confidence score
    const confidenceScore = this.confidenceEstimator.calculateConfidence({
      originalText: text,
      translatedText: combinedTranslation,
      sourceLang: sourceLang,
      targetLang: targetLang,
      metadata: {
        chunked: true,
        chunkCount: chunks.length,
        avgChunkConfidence: avgConfidence,
        formattingPreserved: formatMap && formatMap.size > 0,
        textAnalysis: textAnalysis
      }
    });

    return {
      originalText: text,
      translatedText: combinedTranslation,
      sourceLang: sourceLang,
      targetLang: targetLang,
      confidenceScore: confidenceScore,
      cached: false,
      provider: 'chunked_translation',
      fallbackUsed: chunkResults.some(r => r.fallbackUsed),
      timestamp: Date.now(),
      processingTime: Date.now() - startTime,
      metadata: {
        chunked: true,
        chunkCount: chunks.length,
        avgChunkConfidence: avgConfidence,
        formattingPreserved: formatMap && formatMap.size > 0,
        textAnalysis: textAnalysis,
        confidenceLevel: this.confidenceEstimator.getConfidenceLevel(confidenceScore),
        isLowConfidence: this.confidenceEstimator.isLowConfidence(confidenceScore),
        chunkResults: chunkResults.map(r => ({
          provider: r.provider,
          confidence: r.confidence,
          fallbackUsed: r.fallbackUsed,
          boundaries: r.originalBoundaries
        }))
      }
    };
  }

  /**
   * Combine translated chunks with appropriate spacing
   * @param {Array<string>} translatedChunks - Array of translated chunk texts
   * @param {Array<Object>} originalChunks - Original chunk objects with metadata
   * @param {Object} textAnalysis - Text structure analysis
   * @returns {string} Combined translation
   * @private
   */
  _combineChunks(translatedChunks, originalChunks, textAnalysis) {
    if (translatedChunks.length === 1) {
      return translatedChunks[0];
    }

    let combined = '';
    
    for (let i = 0; i < translatedChunks.length; i++) {
      const chunk = translatedChunks[i];
      
      if (i === 0) {
        combined = chunk;
      } else {
        // Determine appropriate spacing based on text structure
        let separator = ' ';
        
        if (textAnalysis.hasParagraphs) {
          // Use paragraph breaks for structured text
          separator = '\n\n';
        } else if (textAnalysis.hasLists) {
          // Use line breaks for lists
          separator = '\n';
        }
        
        combined += separator + chunk;
      }
    }
    
    return combined;
  }

  /**
   * Validate required dependencies
   * @private
   */
  _validateDependencies() {
    if (!this.languageDetector) {
      throw new Error('Language detector is required');
    }
    if (!this.cacheManager) {
      throw new Error('Cache manager is required');
    }
    if (!this.confidenceEstimator) {
      throw new Error('Confidence estimator is required');
    }
    if (!this.fallbackHandler) {
      throw new Error('Fallback handler is required');
    }
    if (!this.providers || this.providers.length === 0) {
      throw new Error('At least one translation provider is required');
    }
  }
}

module.exports = TranslationService;