const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const { createTranslationServer } = require('../src/api/server');

// Mock translation service for testing
const createMockTranslationService = (behavior = {}) => {
  return {
    async translate(text, targetLang, sourceLang) {
      if (behavior.translateError) {
        throw new Error(behavior.translateError);
      }
      
      if (behavior.translateTimeout) {
        await new Promise(resolve => setTimeout(resolve, behavior.translateTimeout));
      }
      
      return {
        originalText: text,
        translatedText: `Translated: ${text}`,
        sourceLang: sourceLang || 'en',
        targetLang: targetLang,
        confidenceScore: 0.85,
        cached: false,
        provider: 'mock',
        timestamp: Date.now(),
        processingTime: 50
      };
    },
    
    async detectLanguage(text) {
      if (behavior.detectError) {
        throw new Error(behavior.detectError);
      }
      
      return {
        language: 'en',
        confidence: 0.9
      };
    },
    
    async getHealth() {
      if (behavior.healthError) {
        throw new Error(behavior.healthError);
      }
      
      return {
        status: behavior.healthStatus || 'healthy',
        providers: { mock: { status: 'available' } },
        cache: { status: 'available' }
      };
    }
  };
};

describe('HTTP Error Handling Property Tests', () => {
  let app;
  
  beforeEach(() => {
    // Create fresh app for each test
    const mockService = createMockTranslationService();
    app = createTranslationServer(mockService, {
      enableLogging: false, // Disable logging for cleaner test output
      timeout: 1000 // Short timeout for testing
    });
  });

  /**
   * Property 11: HTTP Error Handling
   * For any internal errors during request processing, the Translation_Service should return 
   * appropriate HTTP status codes (400 for client errors, 500 for server errors) with descriptive error messages
   * Validates: Requirements 6.4, 6.5
   */
  describe('Property 11: HTTP Error Handling', () => {
    test('should return 400 for invalid request bodies', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          invalidBody: fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.array(fc.string())
          )
        }),
        async ({ invalidBody }) => {
          const response = await request(app)
            .post('/api/translate')
            .send(invalidBody)
            .expect(400);

          // Should return proper error structure
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error).toHaveProperty('message');
          expect(response.body).toHaveProperty('timestamp');
          
          // Error code should indicate client error
          expect(response.body.error.code).toMatch(/INVALID|MISSING|VALIDATION/);
        }
      ), { numRuns: 50 });
    });

    test('should return 400 for missing required fields', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          text: fc.option(fc.string(), { nil: undefined }),
          targetLang: fc.option(fc.string(), { nil: undefined }),
          sourceLang: fc.option(fc.string(), { nil: undefined })
        }),
        async (body) => {
          // Skip valid requests
          if (body.text && body.targetLang) {
            return;
          }

          const response = await request(app)
            .post('/api/translate')
            .send(body)
            .expect(400);

          expect(response.body).toHaveProperty('error');
          expect(response.body.error.code).toBe('INVALID_INPUT');
          expect(response.body.error).toHaveProperty('details');
          expect(Array.isArray(response.body.error.details)).toBe(true);
          
          // Should specify which fields are missing
          const errorDetails = response.body.error.details;
          if (!body.text) {
            expect(errorDetails.some(e => e.field === 'text')).toBe(true);
          }
          if (!body.targetLang) {
            expect(errorDetails.some(e => e.field === 'targetLang')).toBe(true);
          }
        }
      ), { numRuns: 30 });
    });

    test('should return 400 for invalid language codes', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 100 }),
          targetLang: fc.oneof(
            fc.string({ minLength: 1, maxLength: 1 }), // Too short
            fc.string({ minLength: 3, maxLength: 10 }), // Too long
            fc.string().filter(s => !/^[a-z]{2}$/.test(s)), // Invalid format
            fc.constantFrom('xx', 'zz', 'qq') // Invalid codes
          ),
          sourceLang: fc.option(fc.constantFrom('xx', 'zz', 'qq'), { nil: undefined })
        }),
        async ({ text, targetLang, sourceLang }) => {
          const response = await request(app)
            .post('/api/translate')
            .send({ text, targetLang, sourceLang })
            .expect(400);

          expect(response.body).toHaveProperty('error');
          expect(response.body.error.code).toBe('INVALID_INPUT');
          expect(response.body.error).toHaveProperty('details');
          
          // Should indicate language code error
          const errorDetails = response.body.error.details;
          expect(errorDetails.some(e => 
            e.field === 'targetLang' || e.field === 'sourceLang'
          )).toBe(true);
        }
      ), { numRuns: 30 });
    });

    test('should return 500 for internal translation service errors', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 100 }),
          targetLang: fc.constantFrom('hi', 'ta', 'te', 'bn', 'mr'),
          errorType: fc.constantFrom(
            'Translation service unavailable',
            'Database connection failed',
            'Memory allocation error',
            'Configuration error'
          )
        }),
        async ({ text, targetLang, errorType }) => {
          // Create app with service that throws internal errors
          const errorService = createMockTranslationService({
            translateError: errorType
          });
          const errorApp = createTranslationServer(errorService, {
            enableLogging: false
          });

          const response = await request(errorApp)
            .post('/api/translate')
            .send({ text, targetLang })
            .expect(500);

          expect(response.body).toHaveProperty('error');
          expect(response.body.error.code).toBe('INTERNAL_ERROR');
          expect(response.body.error).toHaveProperty('message');
          expect(response.body).toHaveProperty('timestamp');
          expect(response.body).toHaveProperty('processingTime');
          
          // Should include original text for debugging
          expect(response.body).toHaveProperty('originalText', text);
        }
      ), { numRuns: 20 });
    });

    test('should return 503 for service unavailable errors', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 100 }),
          targetLang: fc.constantFrom('hi', 'ta', 'te', 'bn', 'mr'),
          errorType: fc.constantFrom(
            'network error',
            'timeout',
            'service unavailable'
          )
        }),
        async ({ text, targetLang, errorType }) => {
          // Create app with service that throws network/timeout errors
          const errorService = createMockTranslationService({
            translateError: errorType
          });
          const errorApp = createTranslationServer(errorService, {
            enableLogging: false
          });

          const response = await request(errorApp)
            .post('/api/translate')
            .send({ text, targetLang })
            .expect(503);

          expect(response.body).toHaveProperty('error');
          expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
          expect(response.body.error.message).toContain('unavailable');
        }
      ), { numRuns: 15 });
    });

    test('should return 429 for rate limit errors', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 100 }),
          targetLang: fc.constantFrom('hi', 'ta', 'te', 'bn', 'mr'),
          rateLimitType: fc.constantFrom(
            'rate limit exceeded',
            'quota exceeded',
            'too many requests'
          )
        }),
        async ({ text, targetLang, rateLimitType }) => {
          // Create app with service that throws rate limit errors
          const errorService = createMockTranslationService({
            translateError: rateLimitType
          });
          const errorApp = createTranslationServer(errorService, {
            enableLogging: false
          });

          const response = await request(errorApp)
            .post('/api/translate')
            .send({ text, targetLang })
            .expect(429);

          expect(response.body).toHaveProperty('error');
          expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
          expect(response.body.error.message).toContain('rate limit');
        }
      ), { numRuns: 15 });
    });

    test('should handle health check errors appropriately', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          healthStatus: fc.constantFrom('unhealthy', 'degraded', 'error'),
          errorType: fc.option(fc.constantFrom(
            'Health check failed',
            'Service monitoring error',
            'Status unavailable'
          ), { nil: undefined })
        }),
        async ({ healthStatus, errorType }) => {
          const healthService = createMockTranslationService({
            healthStatus: healthStatus,
            healthError: errorType
          });
          const healthApp = createTranslationServer(healthService, {
            enableLogging: false
          });

          const response = await request(healthApp)
            .get('/api/health');

          if (errorType) {
            // Should return 500 for health check errors
            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.code).toBe('HEALTH_CHECK_FAILED');
          } else if (healthStatus === 'unhealthy') {
            // Should return 503 for unhealthy status
            expect(response.status).toBe(503);
            expect(response.body.status).toBe('unhealthy');
          } else {
            // Should return 200 for degraded status
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('degraded');
          }

          expect(response.body).toHaveProperty('timestamp');
          expect(response.body).toHaveProperty('apiVersion', '1.0.0');
        }
      ), { numRuns: 20 });
    });

    test('should return 404 for unknown routes', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          path: fc.oneof(
            fc.constant('/api/unknown'),
            fc.constant('/api/translate/unknown'),
            fc.constant('/unknown'),
            fc.string({ minLength: 1, maxLength: 20 }).map(s => `/api/${s}`)
          ),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE')
        }),
        async ({ path, method }) => {
          // Skip known valid paths
          const validPaths = [
            '/api/translate',
            '/api/translate/detect',
            '/api/health',
            '/api/status',
            '/api/metrics',
            '/api/providers',
            '/api/cache'
          ];
          
          if (validPaths.includes(path)) {
            return;
          }

          const req = request(app)[method.toLowerCase()](path);
          
          if (method === 'POST') {
            req.send({ test: 'data' });
          }

          const response = await req.expect(404);

          expect(response.body).toHaveProperty('error');
          expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
          expect(response.body.error.message).toContain('not found');
          expect(response.body.error).toHaveProperty('details');
          expect(response.body.error.details).toHaveProperty('method', method);
          expect(response.body.error.details).toHaveProperty('path', path);
        }
      ), { numRuns: 25 });
    });

    test('should include request ID in all error responses', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          requestId: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: undefined }),
          invalidData: fc.record({
            text: fc.option(fc.string(), { nil: undefined }),
            targetLang: fc.option(fc.string(), { nil: undefined })
          })
        }),
        async ({ requestId, invalidData }) => {
          // Skip valid requests
          if (invalidData.text && invalidData.targetLang) {
            return;
          }

          const req = request(app)
            .post('/api/translate')
            .send(invalidData);

          if (requestId) {
            req.set('X-Request-ID', requestId);
          }

          const response = await req.expect(400);

          expect(response.body).toHaveProperty('requestId');
          
          if (requestId) {
            expect(response.body.requestId).toBe(requestId);
          } else {
            expect(typeof response.body.requestId).toBe('string');
            expect(response.body.requestId.length).toBeGreaterThan(0);
          }

          // Should also be in response headers
          expect(response.headers).toHaveProperty('x-request-id');
        }
      ), { numRuns: 20 });
    });

    test('should handle malformed JSON gracefully', () => {
      return fc.assert(fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => {
          try {
            JSON.parse(s);
            return false; // Skip valid JSON
          } catch {
            return true; // Keep invalid JSON
          }
        }),
        async (malformedJson) => {
          const response = await request(app)
            .post('/api/translate')
            .set('Content-Type', 'application/json')
            .send(malformedJson)
            .expect(400);

          expect(response.body).toHaveProperty('error');
          expect(response.body.error.code).toBe('INVALID_JSON');
          expect(response.body.error.message).toContain('JSON');
        }
      ), { numRuns: 20 });
    });

    test('should enforce content-type validation', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          contentType: fc.constantFrom(
            'text/plain',
            'application/xml',
            'multipart/form-data',
            'application/x-www-form-urlencoded',
            undefined
          ),
          body: fc.record({
            text: fc.string({ minLength: 1, maxLength: 50 }),
            targetLang: fc.constantFrom('hi', 'en')
          })
        }),
        async ({ contentType, body }) => {
          const req = request(app)
            .post('/api/translate')
            .send(JSON.stringify(body));

          if (contentType) {
            req.set('Content-Type', contentType);
          }

          const response = await req.expect(400);

          expect(response.body).toHaveProperty('error');
          expect(response.body.error.code).toBe('INVALID_CONTENT_TYPE');
          expect(response.body.error.message).toContain('application/json');
        }
      ), { numRuns: 15 });
    });
  });

  describe('Error Response Structure Validation', () => {
    test('all error responses should have consistent structure', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          errorScenario: fc.constantFrom(
            'missing_text',
            'invalid_lang',
            'malformed_json',
            'wrong_content_type',
            'unknown_route'
          )
        }),
        async ({ errorScenario }) => {
          let response;

          switch (errorScenario) {
            case 'missing_text':
              response = await request(app)
                .post('/api/translate')
                .send({ targetLang: 'hi' })
                .expect(400);
              break;
            case 'invalid_lang':
              response = await request(app)
                .post('/api/translate')
                .send({ text: 'hello', targetLang: 'invalid' })
                .expect(400);
              break;
            case 'malformed_json':
              response = await request(app)
                .post('/api/translate')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}')
                .expect(400);
              break;
            case 'wrong_content_type':
              response = await request(app)
                .post('/api/translate')
                .set('Content-Type', 'text/plain')
                .send('hello')
                .expect(400);
              break;
            case 'unknown_route':
              response = await request(app)
                .get('/api/unknown')
                .expect(404);
              break;
          }

          // Validate error response structure
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error).toHaveProperty('message');
          expect(response.body).toHaveProperty('timestamp');
          expect(response.body).toHaveProperty('requestId');

          // Validate data types
          expect(typeof response.body.error.code).toBe('string');
          expect(typeof response.body.error.message).toBe('string');
          expect(typeof response.body.timestamp).toBe('number');
          expect(typeof response.body.requestId).toBe('string');

          // Validate timestamp is recent
          const now = Date.now();
          expect(response.body.timestamp).toBeGreaterThan(now - 5000);
          expect(response.body.timestamp).toBeLessThanOrEqual(now);
        }
      ), { numRuns: 25 });
    });
  });
});

// Tag for property-based test identification
// Feature: multilingual-translation-ai, Property 11: HTTP Error Handling