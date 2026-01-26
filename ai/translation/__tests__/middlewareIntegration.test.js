const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const { 
  createTranslationMiddleware,
  autoTranslateMiddleware,
  translationHelpersMiddleware,
  languageDetectionMiddleware
} = require('../src/api/middleware/translation');

// Mock translation service for testing
const createMockTranslationService = (behavior = {}) => {
  return {
    async translate(text, targetLang, sourceLang) {
      if (behavior.translateError) {
        throw new Error(behavior.translateError);
      }
      
      return {
        originalText: text,
        translatedText: behavior.translatedText || `Translated: ${text}`,
        sourceLang: sourceLang || 'en',
        targetLang: targetLang,
        confidenceScore: behavior.confidence || 0.85,
        cached: behavior.cached || false,
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
        language: behavior.detectedLanguage || 'en',
        confidence: behavior.detectConfidence || 0.9
      };
    },
    
    async getHealth() {
      return {
        status: 'healthy',
        providers: { mock: { status: 'available' } },
        cache: { status: 'available' }
      };
    }
  };
};

describe('Middleware Integration Property Tests', () => {
  /**
   * Property 16: Middleware Integration
   * For any Express.js application, the Translation_Service should provide middleware functions 
   * that integrate seamlessly without affecting existing functionality
   * Validates: Requirements 10.2
   */
  describe('Property 16: Middleware Integration', () => {
    test('translation middleware should not interfere with existing routes', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          existingRoutes: fc.array(fc.record({
            path: fc.constantFrom('/users', '/posts', '/api/data', '/status'),
            method: fc.constantFrom('GET', 'POST'),
            response: fc.record({
              message: fc.string({ minLength: 1, maxLength: 50 }),
              data: fc.array(fc.string({ minLength: 1, maxLength: 20 }))
            })
          }), { minLength: 1, maxLength: 3 }),
          translationConfig: fc.record({
            textProperty: fc.constantFrom('text', 'content', 'message'),
            targetLangProperty: fc.constantFrom('targetLang', 'lang', 'language'),
            skipOnError: fc.boolean()
          })
        }),
        async ({ existingRoutes, translationConfig }) => {
          const app = express();
          const mockService = createMockTranslationService();
          
          app.use(express.json());
          
          // Add existing routes first
          existingRoutes.forEach(route => {
            if (route.method === 'GET') {
              app.get(route.path, (req, res) => {
                res.json(route.response);
              });
            } else {
              app.post(route.path, (req, res) => {
                res.json({ ...route.response, received: req.body });
              });
            }
          });
          
          // Add translation middleware
          app.use(createTranslationMiddleware(mockService, translationConfig));
          
          // Test that existing routes still work
          for (const route of existingRoutes) {
            const response = route.method === 'GET' 
              ? await request(app).get(route.path)
              : await request(app).post(route.path).send({ test: 'data' });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', route.response.message);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
          }
        }
      ), { numRuns: 20 });
    });

    test('auto-translate middleware should preserve original request data', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          requestData: fc.record({
            text: fc.string({ minLength: 1, maxLength: 100 }),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            metadata: fc.record({
              id: fc.integer({ min: 1, max: 1000 }),
              timestamp: fc.integer({ min: 1000000000, max: 2000000000 })
            }),
            tags: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 5 })
          }),
          targetLang: fc.constantFrom('hi', 'ta', 'te', 'bn', 'mr'),
          fieldsToTranslate: fc.array(fc.constantFrom('text', 'title'), { minLength: 1, maxLength: 2 })
        }),
        async ({ requestData, targetLang, fieldsToTranslate }) => {
          const app = express();
          const mockService = createMockTranslationService({
            translatedText: 'Translated content'
          });
          
          app.use(express.json());
          app.use(autoTranslateMiddleware(mockService, {
            fields: fieldsToTranslate,
            targetLang: targetLang,
            skipOnError: true
          }));
          
          app.post('/test', (req, res) => {
            res.json({ received: req.body });
          });
          
          const response = await request(app)
            .post('/test')
            .send(requestData)
            .expect(200);
          
          // Original data should be preserved
          expect(response.body.received).toHaveProperty('metadata', requestData.metadata);
          expect(response.body.received).toHaveProperty('tags', requestData.tags);
          
          // Original text fields should still exist
          fieldsToTranslate.forEach(field => {
            if (requestData[field]) {
              expect(response.body.received).toHaveProperty(field, requestData[field]);
              expect(response.body.received).toHaveProperty(field + '_translated');
              expect(response.body.received).toHaveProperty(field + '_meta');
            }
          });
        }
      ), { numRuns: 25 });
    });

    test('language detection middleware should add detection data without modifying original', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          originalData: fc.record({
            message: fc.string({ minLength: 1, maxLength: 100 }),
            subject: fc.string({ minLength: 1, maxLength: 50 }),
            userId: fc.integer({ min: 1, max: 1000 }),
            priority: fc.constantFrom('low', 'medium', 'high')
          }),
          detectionConfig: fc.record({
            fields: fc.array(fc.constantFrom('message', 'subject'), { minLength: 1, maxLength: 2 }),
            attachTo: fc.constantFrom('body', 'locals'),
            suffix: fc.constantFrom('_lang', '_language', '_detected')
          }),
          detectedLanguage: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr')
        }),
        async ({ originalData, detectionConfig, detectedLanguage }) => {
          const app = express();
          const mockService = createMockTranslationService({
            detectedLanguage: detectedLanguage,
            detectConfidence: 0.9
          });
          
          app.use(express.json());
          app.use(languageDetectionMiddleware(mockService, detectionConfig));
          
          app.post('/test', (req, res) => {
            res.json({ 
              body: req.body,
              locals: res.locals
            });
          });
          
          const response = await request(app)
            .post('/test')
            .send(originalData)
            .expect(200);
          
          // Original data should be preserved
          expect(response.body.body).toHaveProperty('userId', originalData.userId);
          expect(response.body.body).toHaveProperty('priority', originalData.priority);
          
          // Language detection data should be added
          const targetObject = detectionConfig.attachTo === 'body' ? response.body.body : response.body.locals;
          
          detectionConfig.fields.forEach(field => {
            if (originalData[field]) {
              expect(targetObject).toHaveProperty(field + detectionConfig.suffix, detectedLanguage);
              expect(targetObject).toHaveProperty(field + detectionConfig.suffix + '_confidence');
            }
          });
        }
      ), { numRuns: 20 });
    });

    test('translation helpers should be available in route handlers', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          testText: fc.string({ minLength: 1, maxLength: 100 }),
          targetLang: fc.constantFrom('hi', 'ta', 'te', 'bn', 'mr'),
          translatedResult: fc.string({ minLength: 1, maxLength: 100 })
        }),
        async ({ testText, targetLang, translatedResult }) => {
          const app = express();
          const mockService = createMockTranslationService({
            translatedText: translatedResult
          });
          
          app.use(express.json());
          app.use(translationHelpersMiddleware(mockService));
          
          app.post('/test', async (req, res) => {
            // Test that helper methods are available
            expect(typeof res.translate).toBe('function');
            expect(typeof res.detectLanguage).toBe('function');
            expect(typeof res.jsonTranslated).toBe('function');
            
            try {
              const translation = await res.translate(testText, targetLang);
              res.json({ 
                success: true,
                translation: translation,
                helpersAvailable: {
                  translate: typeof res.translate === 'function',
                  detectLanguage: typeof res.detectLanguage === 'function',
                  jsonTranslated: typeof res.jsonTranslated === 'function'
                }
              });
            } catch (error) {
              res.json({ success: false, error: error.message });
            }
          });
          
          const response = await request(app)
            .post('/test')
            .send({ text: testText, targetLang: targetLang })
            .expect(200);
          
          expect(response.body.success).toBe(true);
          expect(response.body.helpersAvailable.translate).toBe(true);
          expect(response.body.helpersAvailable.detectLanguage).toBe(true);
          expect(response.body.helpersAvailable.jsonTranslated).toBe(true);
          expect(response.body.translation.translatedText).toBe(translatedResult);
        }
      ), { numRuns: 15 });
    });

    test('middleware should handle errors gracefully without breaking the app', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          errorType: fc.constantFrom('translate', 'detect', 'network'),
          requestData: fc.record({
            text: fc.string({ minLength: 1, maxLength: 50 }),
            targetLang: fc.constantFrom('hi', 'en')
          }),
          skipOnError: fc.boolean()
        }),
        async ({ errorType, requestData, skipOnError }) => {
          const app = express();
          const mockService = createMockTranslationService({
            translateError: errorType === 'translate' ? 'Translation failed' : null,
            detectError: errorType === 'detect' ? 'Detection failed' : null
          });
          
          app.use(express.json());
          app.use(createTranslationMiddleware(mockService, {
            skipOnError: skipOnError
          }));
          
          app.post('/test', (req, res) => {
            res.json({ 
              success: true,
              hasTranslation: !!req.translation,
              translationError: req.translation && req.translation.error
            });
          });
          
          const response = await request(app)
            .post('/test')
            .send(requestData);
          
          if (skipOnError) {
            // Should continue processing even with errors
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            if (errorType !== 'none') {
              expect(response.body.hasTranslation).toBe(true);
              expect(response.body.translationError).toBeDefined();
            }
          } else {
            // Should handle errors appropriately
            expect([200, 500]).toContain(response.status);
          }
        }
      ), { numRuns: 20 });
    });

    test('middleware should work with different Express.js configurations', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          appConfig: fc.record({
            trustProxy: fc.boolean(),
            jsonLimit: fc.constantFrom('1mb', '5mb', '10mb'),
            urlencoded: fc.boolean()
          }),
          middlewareOrder: fc.array(fc.constantFrom(
            'translation', 'autoTranslate', 'helpers', 'detection'
          ), { minLength: 1, maxLength: 4 }),
          testData: fc.record({
            text: fc.string({ minLength: 1, maxLength: 50 }),
            targetLang: fc.constantFrom('hi', 'en')
          })
        }),
        async ({ appConfig, middlewareOrder, testData }) => {
          const app = express();
          const mockService = createMockTranslationService();
          
          // Configure Express app
          if (appConfig.trustProxy) {
            app.set('trust proxy', true);
          }
          
          app.use(express.json({ limit: appConfig.jsonLimit }));
          
          if (appConfig.urlencoded) {
            app.use(express.urlencoded({ extended: true }));
          }
          
          // Add middleware in specified order
          const middlewareMap = {
            translation: createTranslationMiddleware(mockService, { skipOnError: true }),
            autoTranslate: autoTranslateMiddleware(mockService, { 
              fields: ['text'], 
              targetLang: 'en',
              skipOnError: true 
            }),
            helpers: translationHelpersMiddleware(mockService),
            detection: languageDetectionMiddleware(mockService, { 
              fields: ['text'],
              skipOnError: true 
            })
          };
          
          middlewareOrder.forEach(middlewareName => {
            if (middlewareMap[middlewareName]) {
              app.use(middlewareMap[middlewareName]);
            }
          });
          
          app.post('/test', (req, res) => {
            res.json({ 
              success: true,
              middlewareOrder: middlewareOrder,
              hasHelpers: {
                translate: typeof res.translate === 'function',
                detectLanguage: typeof res.detectLanguage === 'function'
              },
              requestProcessed: true
            });
          });
          
          const response = await request(app)
            .post('/test')
            .send(testData)
            .expect(200);
          
          expect(response.body.success).toBe(true);
          expect(response.body.requestProcessed).toBe(true);
          expect(response.body.middlewareOrder).toEqual(middlewareOrder);
          
          // Check if helpers are available when helpers middleware is used
          if (middlewareOrder.includes('helpers')) {
            expect(response.body.hasHelpers.translate).toBe(true);
            expect(response.body.hasHelpers.detectLanguage).toBe(true);
          }
        }
      ), { numRuns: 15 });
    });

    test('middleware should preserve request and response object integrity', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          requestHeaders: fc.record({
            'user-agent': fc.string({ minLength: 5, maxLength: 50 }),
            'accept-language': fc.constantFrom('en-US', 'hi-IN', 'ta-IN'),
            'x-custom-header': fc.string({ minLength: 1, maxLength: 20 })
          }),
          requestBody: fc.record({
            text: fc.string({ minLength: 1, maxLength: 100 }),
            targetLang: fc.constantFrom('hi', 'en'),
            metadata: fc.record({
              source: fc.string({ minLength: 1, maxLength: 20 }),
              timestamp: fc.integer()
            })
          })
        }),
        async ({ requestHeaders, requestBody }) => {
          const app = express();
          const mockService = createMockTranslationService();
          
          app.use(express.json());
          app.use(createTranslationMiddleware(mockService, { skipOnError: true }));
          
          app.post('/test', (req, res) => {
            // Verify request object integrity
            expect(req.headers).toHaveProperty('user-agent', requestHeaders['user-agent']);
            expect(req.headers).toHaveProperty('accept-language', requestHeaders['accept-language']);
            expect(req.headers).toHaveProperty('x-custom-header', requestHeaders['x-custom-header']);
            
            expect(req.body).toHaveProperty('text', requestBody.text);
            expect(req.body).toHaveProperty('targetLang', requestBody.targetLang);
            expect(req.body).toHaveProperty('metadata', requestBody.metadata);
            
            // Verify response object integrity
            expect(typeof res.json).toBe('function');
            expect(typeof res.status).toBe('function');
            expect(typeof res.send).toBe('function');
            expect(typeof res.end).toBe('function');
            
            res.json({ 
              success: true,
              requestIntact: true,
              responseIntact: true,
              headers: req.headers,
              body: req.body
            });
          });
          
          const response = await request(app)
            .post('/test')
            .set(requestHeaders)
            .send(requestBody)
            .expect(200);
          
          expect(response.body.success).toBe(true);
          expect(response.body.requestIntact).toBe(true);
          expect(response.body.responseIntact).toBe(true);
          expect(response.body.body).toEqual(requestBody);
        }
      ), { numRuns: 20 });
    });

    test('middleware should support concurrent requests without interference', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          concurrentRequests: fc.array(fc.record({
            text: fc.string({ minLength: 1, maxLength: 50 }),
            targetLang: fc.constantFrom('hi', 'ta', 'te'),
            id: fc.integer({ min: 1, max: 1000 })
          }), { minLength: 2, maxLength: 5 })
        }),
        async ({ concurrentRequests }) => {
          const app = express();
          const mockService = createMockTranslationService();
          
          app.use(express.json());
          app.use(createTranslationMiddleware(mockService, { skipOnError: true }));
          
          app.post('/test', (req, res) => {
            // Add small delay to simulate processing
            setTimeout(() => {
              res.json({ 
                id: req.body.id,
                text: req.body.text,
                targetLang: req.body.targetLang,
                hasTranslation: !!req.translation,
                timestamp: Date.now()
              });
            }, Math.random() * 10);
          });
          
          // Send all requests concurrently
          const responsePromises = concurrentRequests.map(reqData => 
            request(app)
              .post('/test')
              .send(reqData)
              .expect(200)
          );
          
          const responses = await Promise.all(responsePromises);
          
          // Verify each response corresponds to its request
          responses.forEach((response, index) => {
            const originalRequest = concurrentRequests[index];
            expect(response.body.id).toBe(originalRequest.id);
            expect(response.body.text).toBe(originalRequest.text);
            expect(response.body.targetLang).toBe(originalRequest.targetLang);
          });
          
          // Verify no cross-contamination between requests
          const responseIds = responses.map(r => r.body.id);
          const originalIds = concurrentRequests.map(r => r.id);
          expect(responseIds.sort()).toEqual(originalIds.sort());
        }
      ), { numRuns: 10 });
    });
  });

  describe('Middleware Configuration Validation', () => {
    test('middleware should handle various configuration options', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          config: fc.record({
            textProperty: fc.constantFrom('text', 'content', 'message', 'body'),
            targetLangProperty: fc.constantFrom('targetLang', 'lang', 'language', 'to'),
            sourceLangProperty: fc.constantFrom('sourceLang', 'from', 'source'),
            resultProperty: fc.constantFrom('translation', 'result', 'output'),
            skipOnError: fc.boolean(),
            logRequests: fc.boolean(),
            attachToRequest: fc.boolean(),
            attachToResponse: fc.boolean()
          }),
          testData: fc.record({
            text: fc.string({ minLength: 1, maxLength: 50 }),
            targetLang: fc.constantFrom('hi', 'en')
          })
        }),
        async ({ config, testData }) => {
          const app = express();
          const mockService = createMockTranslationService();
          
          app.use(express.json());
          app.use(createTranslationMiddleware(mockService, config));
          
          app.post('/test', (req, res) => {
            const hasRequestTranslation = config.attachToRequest && req[config.resultProperty];
            const hasResponseTranslation = config.attachToResponse && res.locals[config.resultProperty];
            
            res.json({ 
              success: true,
              config: config,
              hasRequestTranslation: hasRequestTranslation,
              hasResponseTranslation: hasResponseTranslation,
              requestTranslation: req[config.resultProperty],
              responseTranslation: res.locals[config.resultProperty]
            });
          });
          
          const requestBody = {
            [config.textProperty]: testData.text,
            [config.targetLangProperty]: testData.targetLang
          };
          
          const response = await request(app)
            .post('/test')
            .send(requestBody)
            .expect(200);
          
          expect(response.body.success).toBe(true);
          
          // Verify configuration is respected
          if (config.attachToRequest) {
            expect(response.body.hasRequestTranslation).toBe(true);
            expect(response.body.requestTranslation).toBeDefined();
          }
          
          if (config.attachToResponse) {
            expect(response.body.hasResponseTranslation).toBe(true);
            expect(response.body.responseTranslation).toBeDefined();
          }
        }
      ), { numRuns: 15 });
    });
  });
});

// Tag for property-based test identification
// Feature: multilingual-translation-ai, Property 16: Middleware Integration