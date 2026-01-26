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
    return {
      valid: false,
      errors: [{
        field: 'request',
        message: 'Request must be a valid object',
        code: 'INVALID_REQUEST_FORMAT'
      }]
    };
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
  if (request.sourceLang !== undefined && request.sourceLang !== null) {
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
    return {
      valid: false,
      errors: errors
    };
  }
  
  return {
    valid: true,
    sanitized: {
      text: request.text.trim(),
      targetLang: request.targetLang.toLowerCase(),
      sourceLang: request.sourceLang ? request.sourceLang.toLowerCase() : null
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
 * Simple boolean validation for language code (used by TranslationService)
 * @param {string} langCode - Language code to validate
 * @returns {boolean} True if valid
 */
function isValidLanguageCode(langCode) {
  const result = validateLanguageCode(langCode);
  return result.valid;
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
  isValidLanguageCode,
  validateConfidenceScore,
  containsSuspiciousContent,
  sanitizeText,
  validateCacheKey
};

/**
 * Text processing utilities for formatting preservation
 */

/**
 * Extract and preserve formatting markers from text
 * @param {string} text - Text with formatting
 * @returns {Object} Text with markers and formatting map
 */
function extractFormatting(text) {
  const formatMap = new Map();
  let markerIndex = 0;
  let processedText = text;

  // Preserve common formatting patterns
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, type: 'bold' },
    { regex: /\*([^*]+)\*/g, type: 'italic' },
    { regex: /`([^`]+)`/g, type: 'code' },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' },
    { regex: /#{1,6}\s+([^\n]+)/g, type: 'heading' },
    { regex: /^\s*[-*+]\s+/gm, type: 'list' },
    { regex: /^\s*\d+\.\s+/gm, type: 'numbered_list' }
  ];

  patterns.forEach(pattern => {
    processedText = processedText.replace(pattern.regex, (match, ...groups) => {
      const marker = `__FORMAT_${markerIndex}__`;
      formatMap.set(marker, {
        original: match,
        type: pattern.type,
        groups: groups.filter(g => g !== undefined)
      });
      markerIndex++;
      return marker;
    });
  });

  return {
    text: processedText,
    formatMap: formatMap
  };
}

/**
 * Restore formatting markers in translated text
 * @param {string} translatedText - Translated text with markers
 * @param {Map} formatMap - Formatting map from extraction
 * @returns {string} Text with restored formatting
 */
function restoreFormatting(translatedText, formatMap) {
  let restoredText = translatedText;

  formatMap.forEach((formatInfo, marker) => {
    // Try to restore the original formatting
    restoredText = restoredText.replace(marker, formatInfo.original);
  });

  return restoredText;
}

/**
 * Intelligent text chunking that preserves sentence and paragraph boundaries
 * @param {string} text - Text to chunk
 * @param {number} maxChunkSize - Maximum size per chunk
 * @returns {Array<Object>} Array of chunk objects with metadata
 */
function intelligentChunk(text, maxChunkSize = 800) {
  if (text.length <= maxChunkSize) {
    return [{
      text: text,
      index: 0,
      preserveFormatting: true,
      boundaries: { start: 0, end: text.length }
    }];
  }

  const chunks = [];
  let currentPos = 0;

  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    
    // If adding this paragraph would exceed chunk size
    if (currentChunk.length + trimmedParagraph.length + 2 > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
          preserveFormatting: true,
          boundaries: { start: currentPos, end: currentPos + currentChunk.length }
        });
        currentPos += currentChunk.length;
        currentChunk = '';
      }
      
      // If single paragraph is too long, split by sentences
      if (trimmedParagraph.length > maxChunkSize) {
        const sentenceChunks = chunkBySentences(trimmedParagraph, maxChunkSize);
        sentenceChunks.forEach(sentenceChunk => {
          chunks.push({
            text: sentenceChunk,
            index: chunkIndex++,
            preserveFormatting: true,
            boundaries: { start: currentPos, end: currentPos + sentenceChunk.length }
          });
          currentPos += sentenceChunk.length;
        });
      } else {
        currentChunk = trimmedParagraph;
      }
    } else {
      currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + trimmedParagraph;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex,
      preserveFormatting: true,
      boundaries: { start: currentPos, end: currentPos + currentChunk.length }
    });
  }

  return chunks.length > 0 ? chunks : [{
    text: text,
    index: 0,
    preserveFormatting: true,
    boundaries: { start: 0, end: text.length }
  }];
}

/**
 * Chunk text by sentences when paragraphs are too long
 * @param {string} text - Text to chunk
 * @param {number} maxChunkSize - Maximum chunk size
 * @returns {Array<string>} Array of sentence chunks
 */
function chunkBySentences(text, maxChunkSize) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // If single sentence is still too long, split by words
      if (trimmedSentence.length > maxChunkSize) {
        const wordChunks = chunkByWords(trimmedSentence, maxChunkSize);
        chunks.push(...wordChunks);
      } else {
        currentChunk = trimmedSentence;
      }
    } else {
      currentChunk += (currentChunk.length > 0 ? '. ' : '') + trimmedSentence;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Chunk text by words as last resort
 * @param {string} text - Text to chunk
 * @param {number} maxChunkSize - Maximum chunk size
 * @returns {Array<string>} Array of word chunks
 */
function chunkByWords(text, maxChunkSize) {
  const words = text.split(' ');
  const chunks = [];
  let currentChunk = '';

  for (const word of words) {
    if (currentChunk.length + word.length + 1 > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // If single word is too long, truncate it
      if (word.length > maxChunkSize) {
        chunks.push(word.substring(0, maxChunkSize));
      } else {
        currentChunk = word;
      }
    } else {
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + word;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Validate text structure and detect potential formatting
 * @param {string} text - Text to analyze
 * @returns {Object} Structure analysis
 */
function analyzeTextStructure(text) {
  const analysis = {
    hasFormatting: false,
    hasParagraphs: false,
    hasLists: false,
    hasLinks: false,
    hasCode: false,
    lineCount: 0,
    wordCount: 0,
    characterCount: text.length
  };

  // Count lines and words
  analysis.lineCount = text.split('\n').length;
  analysis.wordCount = text.trim().split(/\s+/).length;

  // Check for formatting patterns
  analysis.hasFormatting = /\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`/.test(text);
  analysis.hasParagraphs = /\n\s*\n/.test(text);
  analysis.hasLists = /^\s*[-*+]\s+|^\s*\d+\.\s+/m.test(text);
  analysis.hasLinks = /\[([^\]]+)\]\(([^)]+)\)/.test(text);
  analysis.hasCode = /`[^`]+`|```[\s\S]*?```/.test(text);

  return analysis;
}

module.exports = {
  ValidationError,
  validateTranslationRequest,
  validateText,
  validateLanguageCode,
  isValidLanguageCode,
  validateConfidenceScore,
  containsSuspiciousContent,
  sanitizeText,
  validateCacheKey,
  extractFormatting,
  restoreFormatting,
  intelligentChunk,
  chunkBySentences,
  chunkByWords,
  analyzeTextStructure
};