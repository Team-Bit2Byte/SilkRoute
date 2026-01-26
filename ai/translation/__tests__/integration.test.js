const request = require('supertest');
const { 
  createTranslationService, 
  createTranslationServer 
} = require('../index');

describe('Integration Tests - Complete Workflow', () => {
  let translationService;
  let app;
  let server;

  beforeAll(() => {
    // Create translation service with mock configuration
    translationService = createTranslationService({
      huggingfaceApiKey: 'test-key',
      libretranslateUrl: 'http://localhost:5000',
      maxTextLength: 1000,
      cacheMaxSize: 100
    });

    // Create server
    app = createTranslationServer(translationService, {
      enableLogging: false
    });
  });

  afterAll(async () => {
    // Close any open connections
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('End-to-End Translation Workflow', () => {
    test('should complete full translation workflow', async () => {
      const response = await request(app)
        .post('/api/translate')
        .send({
          text: 'Hello world',
          targetLang: 'hi',
          sourceLang: 'en'
        })
        .expect(200);

      expect(response.body).toHaveProperty('originalText', 'Hello world');
      expect(response.body).toHaveProperty('translatedText');
      expect(response.body).toHaveProperty('sourceLang', 'en');
      expect(response.body).toHaveProperty('targetLang', 'hi');
      expect(response.body).toHaveProperty('confidenceScore');
      expect(response.body).toHaveProperty('provider');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('processingTime');
    }, 30000);

    test('should handle language detection workflow', async () => {
      const response = await request(app)
        .post('/api/translate/detect')
        .send({
          text: 'Hello world, this is a test'
        })
        .expect(200);

      expect(response.body).toHaveProperty('language');
      expect(response.body).toHaveProperty('confidence');
      expect(typeof response.body.language).toBe('string');
      expect(typeof response.body.confidence).toBe('number');
    });

    test('should provide health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('providers');
      expect(response.body).toHaveProperty('cache');
      expect(response.body).toHaveProperty('languageDetector');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
    });
  });

  describe('API Endpoint Functionality', () => {
    test('should handle translation with auto-detection', async () => {
      const response = await request(app)
        .post('/api/translate')
        .send({
          text: 'Test message',
          targetLang: 'hi'
        })
        .expect(200);

      expect(response.body).toHaveProperty('sourceLang');
      expect(response.body).toHaveProperty('translatedText');
    }, 30000);

    test('should return metrics endpoint', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('requests');
      expect(response.body.metrics).toHaveProperty('translations');
    });

    test('should return provider status', async () => {
      const response = await request(app)
        .get('/api/providers')
        .expect(200);

      expect(response.body).toHaveProperty('providers');
      expect(typeof response.body.providers).toBe('object');
    });

    test('should return cache status', async () => {
      const response = await request(app)
        .get('/api/cache')
        .expect(200);

      expect(response.body).toHaveProperty('cache');
      expect(response.body).toHaveProperty('metrics');
    });
  });

  describe('Error Scenarios', () => {
    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/translate')
        .send({
          text: 'Hello'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_INPUT');
    });

    test('should handle invalid language codes', async () => {
      const response = await request(app)
        .post('/api/translate')
        .send({
          text: 'Hello',
          targetLang: 'invalid'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle empty text', async () => {
      const response = await request(app)
        .post('/api/translate')
        .send({
          text: '',
          targetLang: 'hi'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Caching Behavior', () => {
    test('should cache translation results', async () => {
      const testText = 'Cache test message ' + Date.now();
      
      // First request
      const response1 = await request(app)
        .post('/api/translate')
        .send({
          text: testText,
          targetLang: 'hi',
          sourceLang: 'en'
        })
        .expect(200);

      expect(response1.body.cached).toBe(false);

      // Second request (should be cached)
      const response2 = await request(app)
        .post('/api/translate')
        .send({
          text: testText,
          targetLang: 'hi',
          sourceLang: 'en'
        })
        .expect(200);

      expect(response2.body.cached).toBe(true);
      expect(response2.body.translatedText).toBe(response1.body.translatedText);
    }, 60000);
  });

  describe('Request Headers and Metadata', () => {
    test('should include request ID in response', async () => {
      const response = await request(app)
        .post('/api/translate')
        .set('X-Request-ID', 'test-request-123')
        .send({
          text: 'Hello',
          targetLang: 'hi'
        })
        .expect(200);

      expect(response.body).toHaveProperty('requestId', 'test-request-123');
    }, 30000);

    test('should generate request ID if not provided', async () => {
      const response = await request(app)
        .post('/api/translate')
        .send({
          text: 'Hello',
          targetLang: 'hi'
        })
        .expect(200);

      expect(response.body).toHaveProperty('requestId');
      expect(typeof response.body.requestId).toBe('string');
    }, 30000);

    test('should include API version', async () => {
      const response = await request(app)
        .post('/api/translate')
        .send({
          text: 'Hello',
          targetLang: 'hi'
        })
        .expect(200);

      expect(response.body).toHaveProperty('apiVersion', '1.0.0');
    }, 30000);
  });

  describe('Root Endpoint', () => {
    test('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('status', 'running');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('404 Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND');
    });
  });

  describe('Content Type Validation', () => {
    test('should require application/json content type', async () => {
      const response = await request(app)
        .post('/api/translate')
        .set('Content-Type', 'text/plain')
        .send('Hello')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_CONTENT_TYPE');
    });
  });

  describe('Concurrent Requests', () => {
    test('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => 
        request(app)
          .post('/api/translate')
          .send({
            text: `Test message ${i}`,
            targetLang: 'hi',
            sourceLang: 'en'
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.originalText).toBe(`Test message ${index}`);
        expect(response.body).toHaveProperty('translatedText');
      });
    }, 60000);
  });

  describe('Service Health Monitoring', () => {
    test('should track service metrics', async () => {
      // Make some requests
      await request(app)
        .post('/api/translate')
        .send({ text: 'Test 1', targetLang: 'hi' });

      await request(app)
        .post('/api/translate')
        .send({ text: 'Test 2', targetLang: 'ta' });

      // Check metrics
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(response.body.metrics.requests.total).toBeGreaterThan(0);
    }, 60000);
  });
});

describe('Service Initialization', () => {
  test('should create translation service with default config', () => {
    const service = createTranslationService({
      huggingfaceApiKey: 'test-key'
    });

    expect(service).toBeDefined();
    expect(service.translate).toBeDefined();
    expect(service.detectLanguage).toBeDefined();
    expect(service.getHealth).toBeDefined();
  });

  test('should throw error without any provider keys', () => {
    expect(() => {
      createTranslationService({});
    }).toThrow();
  });
});