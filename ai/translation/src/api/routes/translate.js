const express = require('express');
const { logger } = require('../../utils/logger');
const { validateTranslationRequest } = require('../../utils/validation');

/**
 * Express.js router for translation API endpoints
 * Handles POST /api/translate requests with validation and error handling
 */
function createTranslateRouter(translationService) {
  const router = express.Router();

  /**
   * POST /
   * Translate text from source language to target language
   */
  router.post('/', async (req, res) => {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Log incoming request
      logger.info('Translation request received', {
        requestId,
        body: {
          text: req.body.text ? req.body.text.substring(0, 100) + '...' : undefined,
          targetLang: req.body.targetLang,
          sourceLang: req.body.sourceLang
        },
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        type: 'api_request'
      });

      // Validate request body
      const validation = validateTranslationRequest(req.body);
      if (!validation.valid) {
        logger.warn('Invalid translation request', {
          requestId,
          errors: validation.errors,
          body: req.body,
          type: 'validation_error'
        });

        return res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: 'Request validation failed',
            details: validation.errors
          },
          requestId,
          timestamp: Date.now()
        });
      }

      const { text, targetLang, sourceLang, options = {} } = req.body;

      // Perform translation
      const result = await translationService.translate(text, targetLang, sourceLang, {
        ...options,
        requestId
      });

      // Log successful translation
      logger.info('Translation completed successfully', {
        requestId,
        sourceLang: result.sourceLang,
        targetLang: result.targetLang,
        confidence: result.confidenceScore,
        provider: result.provider,
        cached: result.cached,
        processingTime: result.processingTime,
        totalTime: Date.now() - startTime,
        type: 'api_success'
      });

      // Return successful response
      res.status(200).json({
        ...result,
        requestId,
        apiVersion: '1.0.0'
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;

      // Log error
      logger.error('Translation request failed', {
        requestId,
        error: error.message,
        stack: error.stack,
        body: req.body,
        processingTime,
        type: 'api_error'
      });

      // Determine error type and status code
      let statusCode = 500;
      let errorCode = 'INTERNAL_ERROR';
      let errorMessage = 'An internal error occurred during translation';

      if (error.message.includes('Text is required') || 
          error.message.includes('Target language is required') ||
          error.message.includes('Invalid') ||
          error.message.includes('too long')) {
        statusCode = 400;
        errorCode = 'INVALID_INPUT';
        errorMessage = error.message;
      } else if (error.message.includes('rate limit') || 
                 error.message.includes('quota')) {
        statusCode = 429;
        errorCode = 'RATE_LIMIT_EXCEEDED';
        errorMessage = 'Translation service rate limit exceeded. Please try again later.';
      } else if (error.message.includes('timeout') || 
                 error.message.includes('network')) {
        statusCode = 503;
        errorCode = 'SERVICE_UNAVAILABLE';
        errorMessage = 'Translation service temporarily unavailable. Please try again later.';
      }

      // Return error response
      res.status(statusCode).json({
        error: {
          code: errorCode,
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? {
            originalError: error.message,
            stack: error.stack
          } : undefined
        },
        originalText: req.body.text,
        fallbackUsed: false,
        requestId,
        timestamp: Date.now(),
        processingTime
      });
    }
  });

  /**
   * GET /health
   * Get health status of the translation service
   */
  router.get('/health', async (req, res) => {
    const requestId = req.headers['x-request-id'] || `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.debug('Health check request received', {
        requestId,
        ip: req.ip,
        type: 'health_check_request'
      });

      const health = await translationService.getHealth();

      // Determine HTTP status based on health status
      let statusCode = 200;
      if (health.status === 'unhealthy') {
        statusCode = 503;
      } else if (health.status === 'degraded') {
        statusCode = 200; // Still operational, just degraded
      } else if (health.status === 'error') {
        statusCode = 500;
      }

      res.status(statusCode).json({
        ...health,
        requestId,
        apiVersion: '1.0.0'
      });

    } catch (error) {
      logger.error('Health check failed', {
        requestId,
        error: error.message,
        stack: error.stack,
        type: 'health_check_error'
      });

      res.status(500).json({
        status: 'error',
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Unable to determine service health',
          details: process.env.NODE_ENV === 'development' ? {
            originalError: error.message
          } : undefined
        },
        requestId,
        timestamp: Date.now(),
        apiVersion: '1.0.0'
      });
    }
  });

  /**
   * POST /detect
   * Detect the language of the provided text
   */
  router.post('/detect', async (req, res) => {
    const requestId = req.headers['x-request-id'] || `detect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      logger.info('Language detection request received', {
        requestId,
        text: req.body.text ? req.body.text.substring(0, 100) + '...' : undefined,
        ip: req.ip,
        type: 'detection_request'
      });

      // Validate request body
      if (!req.body.text || typeof req.body.text !== 'string') {
        return res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: 'Text is required and must be a string',
            details: { field: 'text', received: typeof req.body.text }
          },
          requestId,
          timestamp: Date.now()
        });
      }

      const { text } = req.body;

      // Perform language detection
      const result = await translationService.detectLanguage(text);

      logger.info('Language detection completed', {
        requestId,
        detectedLanguage: result.language,
        confidence: result.confidence,
        fallback: result.fallback,
        processingTime: Date.now() - startTime,
        type: 'detection_success'
      });

      res.status(200).json({
        ...result,
        requestId,
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
        apiVersion: '1.0.0'
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Language detection failed', {
        requestId,
        error: error.message,
        stack: error.stack,
        body: req.body,
        processingTime,
        type: 'detection_error'
      });

      res.status(500).json({
        error: {
          code: 'DETECTION_FAILED',
          message: 'Language detection failed',
          details: process.env.NODE_ENV === 'development' ? {
            originalError: error.message
          } : undefined
        },
        requestId,
        timestamp: Date.now(),
        processingTime
      });
    }
  });

  return router;
}

module.exports = { createTranslateRouter };