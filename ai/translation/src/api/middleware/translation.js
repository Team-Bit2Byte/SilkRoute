const { logger } = require('../../utils/logger');
const { validateTranslationRequest } = require('../../utils/validation');

/**
 * Express.js middleware functions for translation integration
 * Provides easy-to-use middleware for integrating translation capabilities
 */

/**
 * Create translation middleware for easy integration with existing Express apps
 * @param {TranslationService} translationService - Configured translation service
 * @param {Object} options - Middleware configuration options
 * @returns {Function} Express middleware function
 */
function createTranslationMiddleware(translationService, options = {}) {
  const config = {
    // Request property names
    textProperty: options.textProperty || 'text',
    targetLangProperty: options.targetLangProperty || 'targetLang',
    sourceLangProperty: options.sourceLangProperty || 'sourceLang',
    
    // Response property names
    resultProperty: options.resultProperty || 'translation',
    
    // Behavior options
    skipOnError: options.skipOnError !== false, // Default true
    logRequests: options.logRequests !== false, // Default true
    attachToRequest: options.attachToRequest !== false, // Default true
    attachToResponse: options.attachToResponse !== false, // Default true
    
    // Error handling
    errorHandler: options.errorHandler || null,
    
    ...options
  };

  return async (req, res, next) => {
    const requestId = req.headers['x-request-id'] || `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Extract translation parameters from request
      const text = req.body[config.textProperty] || req.query[config.textProperty];
      const targetLang = req.body[config.targetLangProperty] || req.query[config.targetLangProperty];
      const sourceLang = req.body[config.sourceLangProperty] || req.query[config.sourceLangProperty] || null;

      // Skip if no text or target language provided
      if (!text || !targetLang) {
        if (config.logRequests) {
          logger.debug('Translation middleware skipped - missing parameters', {
            requestId,
            hasText: !!text,
            hasTargetLang: !!targetLang,
            path: req.path,
            type: 'translation_middleware_skip'
          });
        }
        return next();
      }

      if (config.logRequests) {
        logger.info('Translation middleware processing request', {
          requestId,
          text: text.substring(0, 50) + '...',
          targetLang,
          sourceLang,
          path: req.path,
          type: 'translation_middleware_start'
        });
      }

      // Perform translation
      const result = await translationService.translate(text, targetLang, sourceLang, {
        requestId,
        middleware: true
      });

      // Attach result to request object
      if (config.attachToRequest) {
        req[config.resultProperty] = result;
      }

      // Attach result to response locals
      if (config.attachToResponse) {
        res.locals[config.resultProperty] = result;
      }

      if (config.logRequests) {
        logger.info('Translation middleware completed', {
          requestId,
          sourceLang: result.sourceLang,
          targetLang: result.targetLang,
          confidence: result.confidenceScore,
          provider: result.provider,
          cached: result.cached,
          processingTime: result.processingTime,
          type: 'translation_middleware_success'
        });
      }

      next();

    } catch (error) {
      logger.error('Translation middleware error', {
        requestId,
        error: error.message,
        stack: error.stack,
        path: req.path,
        body: req.body,
        type: 'translation_middleware_error'
      });

      if (config.errorHandler) {
        // Use custom error handler
        config.errorHandler(error, req, res, next);
      } else if (config.skipOnError) {
        // Skip on error and continue
        if (config.attachToRequest) {
          req[config.resultProperty] = {
            error: error.message,
            originalText: req.body[config.textProperty] || req.query[config.textProperty],
            fallbackUsed: true
          };
        }
        
        if (config.attachToResponse) {
          res.locals[config.resultProperty] = {
            error: error.message,
            originalText: req.body[config.textProperty] || req.query[config.textProperty],
            fallbackUsed: true
          };
        }
        
        next();
      } else {
        // Pass error to Express error handler
        next(error);
      }
    }
  };
}

/**
 * Middleware to automatically translate request body text fields
 * @param {TranslationService} translationService - Translation service
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
function autoTranslateMiddleware(translationService, options = {}) {
  const config = {
    fields: options.fields || ['text', 'message', 'content'],
    targetLang: options.targetLang || 'en',
    sourceLang: options.sourceLang || null,
    suffix: options.suffix || '_translated',
    skipOnError: options.skipOnError !== false,
    logTranslations: options.logTranslations !== false,
    ...options
  };

  return async (req, res, next) => {
    const requestId = req.headers['x-request-id'] || `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (!req.body || typeof req.body !== 'object') {
        return next();
      }

      const translations = {};
      const translationPromises = [];

      // Process each configured field
      for (const field of config.fields) {
        if (req.body[field] && typeof req.body[field] === 'string') {
          const translationPromise = translationService.translate(
            req.body[field],
            config.targetLang,
            config.sourceLang,
            { requestId, field, autoTranslate: true }
          ).then(result => {
            translations[field + config.suffix] = result.translatedText;
            translations[field + '_meta'] = {
              sourceLang: result.sourceLang,
              confidence: result.confidenceScore,
              provider: result.provider,
              cached: result.cached
            };
          }).catch(error => {
            if (config.skipOnError) {
              translations[field + config.suffix] = req.body[field]; // Keep original
              translations[field + '_meta'] = {
                error: error.message,
                fallbackUsed: true
              };
            } else {
              throw error;
            }
          });

          translationPromises.push(translationPromise);
        }
      }

      // Wait for all translations to complete
      await Promise.all(translationPromises);

      // Add translations to request body
      Object.assign(req.body, translations);

      if (config.logTranslations && Object.keys(translations).length > 0) {
        logger.info('Auto-translation completed', {
          requestId,
          fieldsTranslated: config.fields.filter(f => req.body[f]),
          targetLang: config.targetLang,
          translationCount: Object.keys(translations).length / 2, // Each field has text + meta
          type: 'auto_translate_success'
        });
      }

      next();

    } catch (error) {
      logger.error('Auto-translation middleware error', {
        requestId,
        error: error.message,
        stack: error.stack,
        fields: config.fields,
        type: 'auto_translate_error'
      });

      if (config.skipOnError) {
        next();
      } else {
        next(error);
      }
    }
  };
}

/**
 * Middleware to add translation helper methods to response object
 * @param {TranslationService} translationService - Translation service
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
function translationHelpersMiddleware(translationService, options = {}) {
  return (req, res, next) => {
    const requestId = req.headers['x-request-id'] || `helper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add translate method to response object
    res.translate = async (text, targetLang, sourceLang = null) => {
      try {
        return await translationService.translate(text, targetLang, sourceLang, {
          requestId,
          helper: true
        });
      } catch (error) {
        logger.error('Response translate helper error', {
          requestId,
          error: error.message,
          text: text.substring(0, 50) + '...',
          targetLang,
          sourceLang,
          type: 'translate_helper_error'
        });
        throw error;
      }
    };

    // Add detectLanguage method to response object
    res.detectLanguage = async (text) => {
      try {
        return await translationService.detectLanguage(text);
      } catch (error) {
        logger.error('Response detect language helper error', {
          requestId,
          error: error.message,
          text: text.substring(0, 50) + '...',
          type: 'detect_helper_error'
        });
        throw error;
      }
    };

    // Add jsonTranslated method for translated JSON responses
    res.jsonTranslated = async (data, targetLang, options = {}) => {
      try {
        const translatedData = await translateObjectFields(
          data, 
          targetLang, 
          translationService, 
          { ...options, requestId }
        );
        
        res.json(translatedData);
      } catch (error) {
        logger.error('JSON translated response error', {
          requestId,
          error: error.message,
          targetLang,
          type: 'json_translated_error'
        });
        
        if (options.fallbackToOriginal !== false) {
          res.json(data); // Fallback to original data
        } else {
          throw error;
        }
      }
    };

    next();
  };
}

/**
 * Middleware for language detection on request body fields
 * @param {TranslationService} translationService - Translation service
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
function languageDetectionMiddleware(translationService, options = {}) {
  const config = {
    fields: options.fields || ['text', 'message', 'content'],
    attachTo: options.attachTo || 'body', // 'body' or 'locals'
    suffix: options.suffix || '_lang',
    skipOnError: options.skipOnError !== false,
    ...options
  };

  return async (req, res, next) => {
    const requestId = req.headers['x-request-id'] || `detect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      if (!req.body || typeof req.body !== 'object') {
        return next();
      }

      const detections = {};
      const detectionPromises = [];

      // Process each configured field
      for (const field of config.fields) {
        if (req.body[field] && typeof req.body[field] === 'string') {
          const detectionPromise = translationService.detectLanguage(req.body[field])
            .then(result => {
              detections[field + config.suffix] = result.language;
              detections[field + config.suffix + '_confidence'] = result.confidence;
              detections[field + config.suffix + '_meta'] = result;
            })
            .catch(error => {
              if (config.skipOnError) {
                detections[field + config.suffix] = 'unknown';
                detections[field + config.suffix + '_confidence'] = 0;
                detections[field + config.suffix + '_meta'] = {
                  error: error.message,
                  fallback: true
                };
              } else {
                throw error;
              }
            });

          detectionPromises.push(detectionPromise);
        }
      }

      // Wait for all detections to complete
      await Promise.all(detectionPromises);

      // Attach detections to request or response
      if (config.attachTo === 'body') {
        Object.assign(req.body, detections);
      } else if (config.attachTo === 'locals') {
        Object.assign(res.locals, detections);
      }

      logger.debug('Language detection middleware completed', {
        requestId,
        fieldsProcessed: config.fields.filter(f => req.body[f]),
        detectionsCount: Object.keys(detections).length / 3, // Each field has lang + confidence + meta
        type: 'language_detection_middleware'
      });

      next();

    } catch (error) {
      logger.error('Language detection middleware error', {
        requestId,
        error: error.message,
        stack: error.stack,
        fields: config.fields,
        type: 'language_detection_middleware_error'
      });

      if (config.skipOnError) {
        next();
      } else {
        next(error);
      }
    }
  };
}

/**
 * Helper function to translate object fields recursively
 * @param {Object} obj - Object to translate
 * @param {string} targetLang - Target language
 * @param {TranslationService} translationService - Translation service
 * @param {Object} options - Translation options
 * @returns {Promise<Object>} Translated object
 */
async function translateObjectFields(obj, targetLang, translationService, options = {}) {
  const config = {
    fields: options.fields || ['text', 'message', 'content', 'title', 'description'],
    sourceLang: options.sourceLang || null,
    skipOnError: options.skipOnError !== false,
    maxDepth: options.maxDepth || 3,
    currentDepth: options.currentDepth || 0,
    ...options
  };

  if (config.currentDepth >= config.maxDepth) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => 
      translateObjectFields(item, targetLang, translationService, {
        ...config,
        currentDepth: config.currentDepth + 1
      })
    ));
  }

  if (obj && typeof obj === 'object') {
    const translatedObj = { ...obj };
    const translationPromises = [];

    for (const [key, value] of Object.entries(obj)) {
      if (config.fields.includes(key) && typeof value === 'string') {
        // Translate this field
        const translationPromise = translationService.translate(
          value,
          targetLang,
          config.sourceLang,
          { ...config, field: key }
        ).then(result => {
          translatedObj[key] = result.translatedText;
          translatedObj[key + '_translation_meta'] = {
            sourceLang: result.sourceLang,
            confidence: result.confidenceScore,
            provider: result.provider,
            cached: result.cached
          };
        }).catch(error => {
          if (config.skipOnError) {
            translatedObj[key] = value; // Keep original
            translatedObj[key + '_translation_meta'] = {
              error: error.message,
              fallbackUsed: true
            };
          } else {
            throw error;
          }
        });

        translationPromises.push(translationPromise);
      } else if (typeof value === 'object') {
        // Recursively translate nested objects
        const nestedPromise = translateObjectFields(value, targetLang, translationService, {
          ...config,
          currentDepth: config.currentDepth + 1
        }).then(translatedValue => {
          translatedObj[key] = translatedValue;
        });

        translationPromises.push(nestedPromise);
      }
    }

    await Promise.all(translationPromises);
    return translatedObj;
  }

  return obj;
}

module.exports = {
  createTranslationMiddleware,
  autoTranslateMiddleware,
  translationHelpersMiddleware,
  languageDetectionMiddleware,
  translateObjectFields
};