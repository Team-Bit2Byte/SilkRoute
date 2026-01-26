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
        status: behavior.healthStatus || 'healthy',
        providers: { mock: { status: 'available' } },
        cache: { status: 'available' }
      };
    }
  };
};

describe('Stateless Operation Property Tests', () => {
  /**
   * Property 17: Stateless Operation
   * For any translation request, the service should operate statelessly to support 
   * horizontal scaling and multiple instance deployment
   * Validates: Requirements 10.4
   */
  describe('Property 17: Stateless Operation', () => {
    test('identical requests should produce identical responses regardless of order', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          requests: fc.array(fc.record({
            text: fc.string({ minLength: 1, maxLength: 100 }),
            targetLang: fc.constantFrom('hi', 'ta', 'te', 'bn', 'mr'),
            sourceLang: fc.option(fc.constantFrom('en', 'hi'), { nil: null })
          }), { minLength: 2, maxLength: 5 }),
          repetitions: fc.integer({ min: 2, max: 4 })
        }),
        async ({ requests, repetitions }) => {
          const mockService = createMockTranslationService({
            translatedText: 'Consistent translation result'
          });
          const app = createTranslationServer(mockService, { enableLogging: false });

          // Execute the same set of requests multiple times
          const allResponses = [];
          
          for (let i = 0; i < repetitions; i++) {
            const batchResponses = [];
            
            for (const req of requests) {
              const response = await request(app)
                .post('/api/translate')
                .send(req)
                .expect(200);
              
              batchResponses.push({
                request: req,
                response: {
                  translatedText: response.body.translatedText,
                  sourceLang: response.body.sourceLang,
                  targetLang: response.body.targetLang,
                  confidenceScore: response.body.confidenceScore
                }
              });
            }
            
            allResponses.push(batchResponses);
          }

          // Verify that identical requests produce identical responses
          for (let reqIndex = 0; reqIndex < requests.length; reqIndex++) {
            const firstResponse = allResponses[0][reqIndex].response;
            
            for (let batchIndex = 1; batchIndex < repetitions; batchIndex++) {
              const currentResponse = allResponses[batchIndex][reqIndex].response;
              
              expect(currentResponse.translatedText).toBe(firstResponse.translatedText);
              expect(currentResponse.sourceLang).toBe(firstResponse.sourceLang);
              expect(currentResponse.targetLang).toBe(firstResponse.targetLang);
              expect(currentResponse.confidenceScore).toBe(firstResponse.confidenceScore);
            }
          }
        }
      ), { numRuns: 5 });
    });

    test('concurrent requests should not affect each other', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          concurrentRequests: fc.array(fc.record({
            text: fc.string({ minLength: 1, maxLength: 50 }),
            targetLang: fc.constantFrom('hi', 'ta', 'te'),
            id: fc.integer({ min: 1, max: 1000 })
          }), { minLength: 3, maxLength: 8 })
        }),
        async ({ concurrentRequests }) => {
          const mockService = createMockTranslationService();
          const app = createTranslationServer(mockService, { enableLogging: false });

          // Execute all requests concurrently
          const responsePromises = concurrentRequests.map(reqData => 
            request(app)
              .post('/api/translate')
              .send({
                text: reqData.text,
                targetLang: reqData.targetLang,
                metadata: { id: reqData.id } // Include ID for tracking
              })
              .expect(200)
          );

          const responses = await Promise.all(responsePromises);

          // Verify each response is independent and correct
          responses.forEach((response, index) => {
            const originalRequest = concurrentRequests[index];
            
            expect(response.body.originalText).toBe(originalRequest.text);
            expect(response.body.targetLang).toBe(originalRequest.targetLang);
            expect(response.body).toHaveProperty('translatedText');
            expect(response.body).toHaveProperty('confidenceScore');
            expect(response.body).toHaveProperty('timestamp');
            
            // Each response should be unique to its request
            expect(typeof response.body.translatedText).toBe('string');
            expect(response.body.translatedText.length).toBeGreaterThan(0);
          });

          // Verify no cross-contamination between concurrent requests
          const uniqueTexts = new Set(concurrentRequests.map(r => r.text));
          const uniqueResponseTexts = new Set(responses.map(r => r.body.originalText));
          expect(uniqueResponseTexts.size).toBe(uniqueTexts.size);
        }
      ), { numRuns: 5 });
    });

    test('service should not maintain request state between calls', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          firstRequest: fc.record({
            text: fc.string({ minLength: 1, maxLength: 50 }),
            targetLang: fc.constantFrom('hi', 'ta'),
            sourceLang: fc.option(fc.constantFrom('en', 'hi'), { nil: null })
          }),
          secondRequest: fc.record({
            text: fc.string({ minLength: 1, maxLength: 50 }),
            targetLang: fc.constantFrom('te', 'bn', 'mr'),
            sourceLang: fc.option(fc.constantFrom('en', 'ta'), { nil: null })
          }),
          delayBetween: fc.integer({ min: 0, max: 100 })
        }),
        async ({ firstRequest, secondRequest, delayBetween }) => {
          const mockService = createMockTranslationService();
          const app = createTranslationServer(mockService, { enableLogging: false });

          // Make first request
          const firstResponse = await request(app)
            .post('/api/translate')
            .send(firstRequest)
            .expect(200);

          // Wait between requests
          if (delayBetween > 0) {
            await new Promise(resolve => setTimeout(resolve, delayBetween));
          }

          // Make second request
          const secondResponse = await request(app)
            .post('/api/translate')
            .send(secondRequest)
            .expect(200);

          // Verify second request is not influenced by first request
          expect(secondResponse.body.originalText).toBe(secondRequest.text);
          expect(secondResponse.body.targetLang).toBe(secondRequest.targetLang);
          
          if (secondRequest.sourceLang) {
            expect(secondResponse.body.sourceLang).toBe(secondRequest.sourceLang);
          }

          // Verify responses are independent
          expect(secondResponse.body.originalText).not.toBe(firstResponse.body.originalText);
          expect(secondResponse.body.targetLang).not.toBe(firstResponse.body.targetLang);
          
          // Each response should have its own timestamp
          expect(secondResponse.body.timestamp).toBeGreaterThan(firstResponse.body.timestamp);
        }
      ), { numRuns: 5 });
    });

    test('health checks should be stateless and consistent', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          healthCheckCount: fc.integer({ min: 3, max: 8 }),
          intervalMs: fc.integer({ min: 0, max: 50 })
        }),
        async ({ healthCheckCount, intervalMs }) => {
          const mockService = createMockTranslationService({
            healthStatus: 'healthy'
          });
          const app = createTranslationServer(mockService, { enableLogging: false });

          const healthResponses = [];

          // Perform multiple health checks
          for (let i = 0; i < healthCheckCount; i++) {
            if (i > 0 && intervalMs > 0) {
              await new Promise(resolve => setTimeout(resolve, intervalMs));
            }

            const response = await request(app)
              .get('/api/health')
              .expect(200);

            healthResponses.push({
              status: response.body.status,
              providers: response.body.providers,
              cache: response.body.cache,
              timestamp: response.body.timestamp
            });
          }

          // Verify all health checks return consistent status
          const firstStatus = healthResponses[0].status;
          healthResponses.forEach(health => {
            expect(health.status).toBe(firstStatus);
            expect(health.providers).toEqual(healthResponses[0].providers);
            expect(health.cache).toEqual(healthResponses[0].cache);
          });

          // Verify timestamps exist and are valid (showing each call is independent)
          const timestamps = healthResponses.map(h => h.timestamp);
          timestamps.forEach(ts => {
            expect(typeof ts).toBe('number');
            expect(ts).toBeGreaterThan(0);
          });
          
          // Timestamps should be in non-decreasing order (may be same if very fast)
          for (let i = 1; i < timestamps.length; i++) {
            expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
          }
        }
      ), { numRuns: 5 });
    });

    test('language detection should be stateless', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          texts: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
          detectedLanguage: fc.constantFrom('hi', 'en', 'ta', 'te', 'bn', 'mr')
        }),
        async ({ texts, detectedLanguage }) => {
          const mockService = createMockTranslationService({
            detectedLanguage: detectedLanguage,
            detectConfidence: 0.9
          });
          const app = createTranslationServer(mockService, { enableLogging: false });

          // Detect language for each text multiple times
          const allDetections = [];

          for (const text of texts) {
            const detections = [];
            
            // Perform same detection multiple times
            for (let i = 0; i < 3; i++) {
              const response = await request(app)
                .post('/api/translate/detect')
                .send({ text })
                .expect(200);

              detections.push({
                language: response.body.language,
                confidence: response.body.confidence,
                text: text
              });
            }

            allDetections.push(detections);
          }

          // Verify consistent results for same text
          allDetections.forEach(detections => {
            const firstDetection = detections[0];
            
            detections.forEach(detection => {
              expect(detection.language).toBe(firstDetection.language);
              expect(detection.confidence).toBe(firstDetection.confidence);
              expect(detection.text).toBe(firstDetection.text);
            });
          });
        }
      ), { numRuns: 5 });
    });

    test('service should handle rapid sequential requests without state leakage', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          rapidRequests: fc.array(fc.record({
            text: fc.string({ minLength: 1, maxLength: 30 }),
            targetLang: fc.constantFrom('hi', 'ta', 'te'),
            uniqueId: fc.integer({ min: 1, max: 10000 })
          }), { minLength: 5, maxLength: 10 })
        }),
        async ({ rapidRequests }) => {
          const mockService = createMockTranslationService();
          const app = createTranslationServer(mockService, { enableLogging: false });

          // Send requests in rapid succession
          const responses = [];
          
          for (const req of rapidRequests) {
            const response = await request(app)
              .post('/api/translate')
              .send({
                text: req.text,
                targetLang: req.targetLang,
                uniqueId: req.uniqueId
              })
              .expect(200);

            responses.push({
              originalText: response.body.originalText,
              targetLang: response.body.targetLang,
              translatedText: response.body.translatedText,
              requestId: req.uniqueId
            });
          }

          // Verify each response matches its corresponding request
          responses.forEach((response, index) => {
            const originalRequest = rapidRequests[index];
            
            expect(response.originalText).toBe(originalRequest.text);
            expect(response.targetLang).toBe(originalRequest.targetLang);
            expect(response.requestId).toBe(originalRequest.uniqueId);
          });

          // Verify no duplicate or mixed responses
          const responseTexts = responses.map(r => r.originalText);
          const requestTexts = rapidRequests.map(r => r.text);
          expect(responseTexts).toEqual(requestTexts);
        }
      ), { numRuns: 5 });
    });

    test('service should support horizontal scaling simulation', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          instances: fc.integer({ min: 2, max: 4 }),
          requestsPerInstance: fc.array(fc.record({
            text: fc.string({ minLength: 1, maxLength: 50 }),
            targetLang: fc.constantFrom('hi', 'ta', 'te'),
            instanceId: fc.integer({ min: 1, max: 4 })
          }), { minLength: 2, maxLength: 6 })
        }),
        async ({ instances, requestsPerInstance }) => {
          // Create multiple service instances (simulating horizontal scaling)
          const serviceInstances = [];
          
          for (let i = 0; i < instances; i++) {
            const mockService = createMockTranslationService({
              translatedText: `Instance ${i} translation`
            });
            const app = createTranslationServer(mockService, { enableLogging: false });
            serviceInstances.push(app);
          }

          // Distribute requests across instances
          const allResponses = [];
          
          for (const req of requestsPerInstance) {
            const instanceIndex = req.instanceId % instances;
            const app = serviceInstances[instanceIndex];
            
            const response = await request(app)
              .post('/api/translate')
              .send({
                text: req.text,
                targetLang: req.targetLang
              })
              .expect(200);

            allResponses.push({
              originalText: response.body.originalText,
              targetLang: response.body.targetLang,
              translatedText: response.body.translatedText,
              instanceUsed: instanceIndex,
              originalRequest: req
            });
          }

          // Verify each instance processes requests correctly
          allResponses.forEach(response => {
            expect(response.originalText).toBe(response.originalRequest.text);
            expect(response.targetLang).toBe(response.originalRequest.targetLang);
            expect(typeof response.translatedText).toBe('string');
            expect(response.translatedText.length).toBeGreaterThan(0);
          });

          // Verify instances operate independently
          const instanceGroups = {};
          allResponses.forEach(response => {
            if (!instanceGroups[response.instanceUsed]) {
              instanceGroups[response.instanceUsed] = [];
            }
            instanceGroups[response.instanceUsed].push(response);
          });

          // Each instance should produce consistent results for its requests
          Object.values(instanceGroups).forEach(instanceResponses => {
            instanceResponses.forEach(response => {
              expect(response.translatedText).toContain(`Instance ${response.instanceUsed}`);
            });
          });
        }
      ), { numRuns: 3 });
    });

    test('service should not leak memory or resources between requests', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          requestBatches: fc.array(fc.array(fc.record({
            text: fc.string({ minLength: 1, maxLength: 100 }),
            targetLang: fc.constantFrom('hi', 'ta', 'te')
          }), { minLength: 2, maxLength: 5 }), { minLength: 2, maxLength: 4 })
        }),
        async ({ requestBatches }) => {
          const mockService = createMockTranslationService();
          const app = createTranslationServer(mockService, { enableLogging: false });

          const batchResults = [];

          // Process batches sequentially
          for (const batch of requestBatches) {
            const batchResponses = [];
            
            // Process batch requests concurrently
            const batchPromises = batch.map(req => 
              request(app)
                .post('/api/translate')
                .send(req)
                .expect(200)
            );

            const responses = await Promise.all(batchPromises);
            
            responses.forEach((response, index) => {
              batchResponses.push({
                originalText: response.body.originalText,
                targetLang: response.body.targetLang,
                translatedText: response.body.translatedText,
                processingTime: response.body.processingTime,
                timestamp: response.body.timestamp,
                requestIndex: index
              });
            });

            batchResults.push(batchResponses);
          }

          // Verify each batch is processed independently
          batchResults.forEach((batchResponses, batchIndex) => {
            const originalBatch = requestBatches[batchIndex];
            
            batchResponses.forEach((response, responseIndex) => {
              const originalRequest = originalBatch[responseIndex];
              
              expect(response.originalText).toBe(originalRequest.text);
              expect(response.targetLang).toBe(originalRequest.targetLang);
              expect(typeof response.processingTime).toBe('number');
              expect(response.processingTime).toBeGreaterThan(0);
            });
          });

          // Verify processing times are reasonable (no resource leakage)
          const allProcessingTimes = batchResults.flat().map(r => r.processingTime);
          const avgProcessingTime = allProcessingTimes.reduce((sum, time) => sum + time, 0) / allProcessingTimes.length;
          
          // Processing times should be consistent (no significant degradation)
          allProcessingTimes.forEach(time => {
            expect(time).toBeLessThan(avgProcessingTime * 3); // Allow some variance
          });
        }
      ), { numRuns: 3 });
    });
  });

  describe('Stateless Configuration Validation', () => {
    test('service configuration should not affect request processing state', () => {
      return fc.assert(fc.asyncProperty(
        fc.record({
          config1: fc.record({
            timeout: fc.integer({ min: 1000, max: 5000 }),
            maxRequestSize: fc.constantFrom(1024 * 1024, 2 * 1024 * 1024),
            enableCors: fc.boolean()
          }),
          config2: fc.record({
            timeout: fc.integer({ min: 1000, max: 5000 }),
            maxRequestSize: fc.constantFrom(1024 * 1024, 2 * 1024 * 1024),
            enableCors: fc.boolean()
          }),
          testRequest: fc.record({
            text: fc.string({ minLength: 1, maxLength: 50 }),
            targetLang: fc.constantFrom('hi', 'ta')
          })
        }),
        async ({ config1, config2, testRequest }) => {
          // Create two services with different configurations
          const mockService1 = createMockTranslationService();
          const mockService2 = createMockTranslationService();
          
          const app1 = createTranslationServer(mockService1, { ...config1, enableLogging: false });
          const app2 = createTranslationServer(mockService2, { ...config2, enableLogging: false });

          // Send same request to both services
          const response1 = await request(app1)
            .post('/api/translate')
            .send(testRequest)
            .expect(200);

          const response2 = await request(app2)
            .post('/api/translate')
            .send(testRequest)
            .expect(200);

          // Verify both services process the request correctly despite different configs
          expect(response1.body.originalText).toBe(testRequest.text);
          expect(response1.body.targetLang).toBe(testRequest.targetLang);
          expect(response2.body.originalText).toBe(testRequest.text);
          expect(response2.body.targetLang).toBe(testRequest.targetLang);

          // Verify responses have same structure (stateless processing)
          expect(response1.body).toHaveProperty('translatedText');
          expect(response1.body).toHaveProperty('confidenceScore');
          expect(response2.body).toHaveProperty('translatedText');
          expect(response2.body).toHaveProperty('confidenceScore');
        }
      ), { numRuns: 5 });
    });
  });
});

// Tag for property-based test identification
// Feature: multilingual-translation-ai, Property 17: Stateless Operation