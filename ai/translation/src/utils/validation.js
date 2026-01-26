/**
 * Input validation utilities for the translation service
 * Provides comprehensive validation for requests and data
 */

const { isLanguageSupported } = require('../config/languages');

/**
 * Validation error class
 */
class ValidationError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Validate translation request
 * @param {Object} request - Translation request object
 * @returns {Object} Validation result
 */
function validateTranslationRequest(request) {
  const errors = [];
  
  // Check if request is an object
  if (!request || typeof request !== 'object') {
    throw new ValidationError('Request must be a valid object', 'INVALID_REQUEST_FORMAT');
  }
  
  // Validate text field
  if (!request.text) {
    errors.push({
      field: 'text',
      message: 'Text field is required',
      code: 'MISSING_TEXT'
    });
  } else if (typeof request.text !== 'string') {
    errors.push({
      field: 'text',
      message: 'Text must be a string',
      code: 'INVALID_TEXT_TYPE'
    });
  } else {
    const textValidation = validateText(request.text);
    if (!textValidation.valid) {
      errors.push({
        field: 'text',
        message: textValidation.message,
        code: textValidation.code
      });
    }
  }
  
  // Validate targetLang field
  if (!request.targetLang) {
    errors.push({
      field: 'targetLang',
      message: 'Target language field is required',
      code: 'MISSING_TARGET_LANG'
    });
  } else if (typeof request.targetLang !== 'string') {
    errors.push({
      field: 'targetLang',
      message: 'Target language must be a string',
      code: 'INVALID_TARGET_LANG_TYPE'
    });
  } else if (!isLanguageSupported(request.targetLang)) {
    errors.push({
      field: 'targetLang',
      message: `Unsupported target language: ${request.targetLang}`,
      code: 'UNSUPPORTED_TARGET_LANG'
    });
  }
  
  // Validate optional sourceLang field
  if (request.sourceLang !== undefined) {
    if (typeof request.sourceLang !== 'string') {
      errors.push({
        field: 'sourceLang',
        message: 'Source language must be a string',
        code: 'INVALID_SOURCE_LANG_TYPE'
      });
    } else if (!isLanguageSupported(request.sourceLang)) {
      errors.push({
        field: 'sourceLang',
        message: `Unsupported source language: ${request.sourceLang}`,
        code: 'UNSUPPORTED_SOURCE_LANG'
      });
    }
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Request validation failed', 'VALIDATION_FAILED', { errors });
  }
  
  return {
    valid: true,
    sanitized: {
      text: request.text.trim(),
      targetLang: request.targetLang.toLowerCase(),
      sourceLang: request.sourceLang ? request.sourceLang.toLowerCase() : undefined
    }
  };
}

/**
 * Validate text content
 * @param {string} text - Text to validate
 * @returns {Object} Validation result
 */
function validateText(text) {
  if (!text || typeof text !== 'string') {
    return {
      valid: false,
      message: 'Text must be a non-empty string',
      code: 'INVALID_TEXT'
    };
  }
  
  const trimmed = text.trim();
  
  if (trimmed.length === 0) {
    return {
      valid: false,
      message: 'Text cannot be empty or whitespace only',
      code: 'EMPTY_TEXT'
    };
  }
  
  if (trimmed.length > 10000) {
    return {
      valid: false,
      message: 'Text exceeds maximum length of 10,000 characters',
      code: 'TEXT_TOO_LONG'
    };
  }
  
  // Check for potentially malicious content
  if (containsSuspiciousContent(trimmed)) {
    return {
      valid: false,
      message: 'Text contains potentially malicious content',
      code: 'SUSPICIOUS_CONTENT'
    };
  }
  
  return {
    valid: true,
    length: trimmed.length,
    wordCount: trimmed.split(/\s+/).length
  };
}

/**
 * Validate language code
 * @param {string} langCode - Language code to validate
 * @returns {Object} Validation result
 */
function validateLanguageCode(langCode) {
  if (!langCode || typeof langCode !== 'string') {
    return {
      valid: false,
      message: 'Language code must be a non-empty string',
      code: 'INVALID_LANG_CODE'
    };
  }
  
  const normalized = langCode.toLowerCase().trim();
  
  if (!/^[a-z]{2}$/.test(normalized)) {
    return {
      valid: false,
      message: 'Language code must be a 2-letter ISO 639-1 code',
      code: 'INVALID_LANG_FORMAT'
    };
  }
  
  if (!isLanguageSupported(normalized)) {
    return {
      valid: false,
      message: `Unsupported language code: ${normalized}`,
      code: 'UNSUPPORTED_LANGUAGE'
    };
  }
  
  return {
    valid: true,
    normalized
  };
}

/**
 * Validate confidence score
 * @param {number} confidence - Confidence score to validate
 * @returns {Object} Validation result
 */
function validateConfidenceScore(confidence) {
  if (typeof confidence !== 'number') {
    return {
      valid: false,
      message: 'Confidence score must be a number',
      code: 'INVALID_CONFIDENCE_TYPE'
    };
  }
  
  if (isNaN(confidence)) {
    return {
      valid: false,
      message: 'Confidence score cannot be NaN',
      code: 'CONFIDENCE_NAN'
    };
  }
  
  if (confidence < 0 || confidence > 1) {
    return {
      valid: false,
      message: 'Confidence score must be between 0 and 1',
      code: 'CONFIDENCE_OUT_OF_RANGE'
    };
  }
  
  return {
    valid: true,
    normalized: Math.round(confidence * 1000) / 1000 // Round to 3 decimal places
  };
}

/**
 * Check for suspicious content in text
 * @param {string} text - Text to check
 * @returns {boolean} True if suspicious content found
 */
function containsSuspiciousContent(text) {
  // Basic checks for potentially malicious patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers
    /data:text\/html/gi, // Data URLs with HTML
    /vbscript:/gi, // VBScript protocol
    /<iframe\b/gi, // Iframe tags
    /<object\b/gi, // Object tags
    /<embed\b/gi // Embed tags
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(text));
}

/**
 * Sanitize text for safe processing
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 10000); // Enforce max length
}

/**
 * Validate cache key
 * @param {string} key - Cache key to validate
 * @returns {Object} Validation result
 */
function validateCacheKey(key) {
  if (!key || typeof key !== 'string') {
    return {
      valid: false,
      message: 'Cache key must be a non-empty string',
      code: 'INVALID_CACHE_KEY'
    };
  }
  
  if (key.length > 250) {
    return {
      valid: false,
      message: 'Cache key exceeds maximum length of 250 characters',
      code: 'CACHE_KEY_TOO_LONG'
    };
  }
  
  return { valid: true };
}

module.exports = {
  ValidationError,
  validateTranslationRequest,
  validateText,
  validateLanguageCode,
  validateConfidenceScore,
  containsSuspiciousContent,
  sanitizeText,
  validateCacheKey
};