/**
 * Examples of how to use the translation middleware in different scenarios
 * These examples show various integration patterns for existing Express applications
 */

const express = require('express');
const { 
  createTranslationServer, 
  startTranslationServer,
  middleware 
} = require('../server');

// Import service components for setup
const TranslationService = require('../../services/TranslationService');
const FrancLanguageDetector = require('../../services/FrancLanguageDetector');
const LRUCacheManager = require('../../services/LRUCacheManager');
const HuggingFaceProvider = require('../../services/HuggingFaceProvider');
const LibreTranslateProvider = require('../../services/LibreTranslateProvider');
const BasicConfidenceEstimator = require('../../services/BasicConfidenceEstimator');
const BasicFallbackHandler = require('../../services/BasicFallbackHandler');

/**
 * Example 1: Complete standalone translation server
 */
async function example1_StandaloneServer() {
  console.log('Example 1: Standalone Translation Server');
  
  // Create service components
  const languageDetector = new FrancLanguageDetector();
  const cacheManager = new LRUCacheManager();
  const providers = [
    new HuggingFaceProvider({ apiKey: process.env.HUGGINGFACE_API_KEY }),
    new LibreTranslateProvider({ apiKey: process.env.LIBRETRANSLATE_API_KEY })
  ];
  const confidenceEstimator = new BasicConfidenceEstimator();
  const fallbackHandler = new BasicFallbackHandler();

  // Create translation service
  const translationService = new TranslationService({
    languageDetector,
    cacheManager,
    providers,
    confidenceEstimator,
    fallbackHandler
  });

  // Start standalone server
  const server = await startTranslationServer(translationService, {
    port: 3001,
    enableCors: true,
    enableLogging: true,
    enableSecurity: true
  });

  console.log('Standalone server running on port 3001');
  return server;
}

/**
 * Example 2: Integration with existing Express app using router
 */
function example2_RouterIntegration(translationService) {
  console.log('Example 2: Router Integration');
  
  const app = express();
  
  // Your existing app setup
  app.use(express.json());
  
  // Your existing routes
  app.get('/', (req, res) => {
    res.json({ message: 'My existing app' });
  });
  
  // Mount translation API at /translation
  const translationRouter = middleware.translation(translationService);
  app.use('/translation', translationRouter);
  
  // Your other routes continue...
  app.get('/api/users', (req, res) => {
    res.json({ users: [] });
  });
  
  return app;
}

/**
 * Example 3: Auto-translate middleware for user content
 */
function example3_AutoTranslateContent(translationService) {
  console.log('Example 3: Auto-translate User Content');
  
  const app = express();
  app.use(express.json());
  
  // Auto-translate user posts to English
  app.use('/api/posts', middleware.autoTranslate(translationService, {
    fields: ['title', 'content'],
    targetLang: 'en',
    suffix: '_en'
  }));
  
  app.post('/api/posts', (req, res) => {
    // req.body now contains:
    // - title, content (original)
    // - title_en, content_en (translated)
    // - title_meta, content_meta (translation metadata)
    
    console.log('Original title:', req.body.title);
    console.log('Translated title:', req.body.title_en);
    console.log('Translation confidence:', req.body.title_meta.confidence);
    
    res.json({
      message: 'Post created with auto-translation',
      original: {
        title: req.body.title,
        content: req.body.content
      },
      translated: {
        title: req.body.title_en,
        content: req.body.content_en
      },
      metadata: {
        title: req.body.title_meta,
        content: req.body.content_meta
      }
    });
  });
  
  return app;
}

/**
 * Example 4: Translation helpers for dynamic responses
 */
function example4_TranslationHelpers(translationService) {
  console.log('Example 4: Translation Helpers');
  
  const app = express();
  app.use(express.json());
  
  // Add translation helpers to all routes
  app.use(middleware.helpers(translationService));
  
  app.get('/api/products/:id', async (req, res) => {
    // Simulate getting product data
    const product = {
      id: req.params.id,
      name: 'स्मार्टफोन', // Hindi
      description: 'यह एक बेहतरीन स्मार्टफोन है।' // Hindi
    };
    
    // Get user's preferred language from header or query
    const userLang = req.headers['accept-language'] || req.query.lang || 'en';
    
    if (userLang !== 'hi') {
      // Translate product details to user's language
      const nameTranslation = await res.translate(product.name, userLang);
      const descTranslation = await res.translate(product.description, userLang);
      
      product.name = nameTranslation.translatedText;
      product.description = descTranslation.translatedText;
      product.translationMeta = {
        name: nameTranslation,
        description: descTranslation
      };
    }
    
    res.json(product);
  });
  
  // Use jsonTranslated helper for automatic object translation
  app.get('/api/products/:id/auto', async (req, res) => {
    const product = {
      id: req.params.id,
      name: 'स्मार्टफोन',
      description: 'यह एक बेहतरीन स्मार्टफोन है।',
      category: 'इलेक्ट्रॉनिक्स'
    };
    
    const userLang = req.headers['accept-language'] || req.query.lang || 'en';
    
    // Automatically translate specified fields
    await res.jsonTranslated(product, userLang, {
      fields: ['name', 'description', 'category'],
      fallbackToOriginal: true
    });
  });
  
  return app;
}

/**
 * Example 5: Language detection middleware
 */
function example5_LanguageDetection(translationService) {
  console.log('Example 5: Language Detection');
  
  const app = express();
  app.use(express.json());
  
  // Detect language of user input
  app.use('/api/feedback', middleware.languageDetection(translationService, {
    fields: ['message', 'subject'],
    attachTo: 'body'
  }));
  
  app.post('/api/feedback', (req, res) => {
    // req.body now contains:
    // - message, subject (original)
    // - message_lang, subject_lang (detected languages)
    // - message_lang_confidence, subject_lang_confidence (confidence scores)
    
    console.log('Message language:', req.body.message_lang);
    console.log('Detection confidence:', req.body.message_lang_confidence);
    
    // Route to appropriate support team based on language
    const supportTeam = getSupportTeam(req.body.message_lang);
    
    res.json({
      message: 'Feedback received',
      detectedLanguage: req.body.message_lang,
      confidence: req.body.message_lang_confidence,
      assignedTo: supportTeam
    });
  });
  
  function getSupportTeam(language) {
    const teams = {
      'hi': 'hindi-support',
      'en': 'english-support',
      'ta': 'tamil-support',
      'te': 'telugu-support',
      'bn': 'bengali-support',
      'mr': 'marathi-support'
    };
    return teams[language] || 'general-support';
  }
  
  return app;
}

/**
 * Example 6: Custom middleware composition
 */
function example6_CustomComposition(translationService) {
  console.log('Example 6: Custom Middleware Composition');
  
  const app = express();
  app.use(express.json());
  
  // Compose multiple middleware for a specific route
  app.use('/api/chat',
    middleware.addRequestId,
    middleware.validateJsonBody,
    middleware.languageDetection(translationService, {
      fields: ['message'],
      attachTo: 'locals'
    }),
    middleware.autoTranslate(translationService, {
      fields: ['message'],
      targetLang: 'en',
      suffix: '_en'
    }),
    middleware.helpers(translationService),
    middleware.logRequests
  );
  
  app.post('/api/chat', async (req, res) => {
    const { message, message_en } = req.body;
    const { message_lang } = res.locals;
    
    // Process chat message
    const response = await processChatMessage(message_en, message_lang);
    
    // Translate response back to user's language if needed
    if (message_lang !== 'en') {
      const translatedResponse = await res.translate(response, message_lang);
      response = translatedResponse.translatedText;
    }
    
    res.json({
      originalMessage: message,
      translatedMessage: message_en,
      detectedLanguage: message_lang,
      response: response
    });
  });
  
  async function processChatMessage(message, language) {
    // Simulate chat processing
    return `Thank you for your message: "${message}". We detected you're speaking ${language}.`;
  }
  
  return app;
}

/**
 * Example 7: Error handling and fallbacks
 */
function example7_ErrorHandling(translationService) {
  console.log('Example 7: Error Handling and Fallbacks');
  
  const app = express();
  app.use(express.json());
  
  // Custom error handler for translation middleware
  const customErrorHandler = (error, req, res, next) => {
    console.error('Translation error:', error.message);
    
    // Add fallback translation
    req.translationError = error.message;
    req.translation = {
      originalText: req.body.text,
      translatedText: req.body.text, // Use original as fallback
      fallbackUsed: true,
      error: error.message
    };
    
    next(); // Continue processing
  };
  
  // Use translation middleware with custom error handling
  app.use('/api/translate-safe', middleware.translation(translationService, {
    skipOnError: true,
    errorHandler: customErrorHandler,
    logRequests: true
  }));
  
  app.post('/api/translate-safe', (req, res) => {
    if (req.translationError) {
      res.status(200).json({
        success: false,
        error: req.translationError,
        fallback: req.translation
      });
    } else {
      res.json({
        success: true,
        translation: req.translation
      });
    }
  });
  
  // Global error handler
  app.use(middleware.globalErrorHandler);
  
  return app;
}

/**
 * Example usage
 */
async function runExamples() {
  try {
    // Setup translation service (you would do this once in your app)
    const translationService = createMockTranslationService();
    
    // Run examples (choose one or more)
    // const server1 = await example1_StandaloneServer();
    // const app2 = example2_RouterIntegration(translationService);
    // const app3 = example3_AutoTranslateContent(translationService);
    // const app4 = example4_TranslationHelpers(translationService);
    // const app5 = example5_LanguageDetection(translationService);
    // const app6 = example6_CustomComposition(translationService);
    // const app7 = example7_ErrorHandling(translationService);
    
    console.log('Examples ready to run!');
    console.log('Uncomment the examples you want to test in runExamples()');
    
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

/**
 * Create a mock translation service for examples
 * In real usage, you would create this properly with your configuration
 */
function createMockTranslationService() {
  // This is a simplified mock - use the real service creation in your app
  return {
    async translate(text, targetLang, sourceLang) {
      return {
        originalText: text,
        translatedText: `[Translated to ${targetLang}] ${text}`,
        sourceLang: sourceLang || 'auto',
        targetLang: targetLang,
        confidenceScore: 0.85,
        cached: false,
        provider: 'mock',
        timestamp: Date.now(),
        processingTime: 100
      };
    },
    
    async detectLanguage(text) {
      return {
        language: 'en',
        confidence: 0.9
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
}

// Export examples for testing
module.exports = {
  example1_StandaloneServer,
  example2_RouterIntegration,
  example3_AutoTranslateContent,
  example4_TranslationHelpers,
  example5_LanguageDetection,
  example6_CustomComposition,
  example7_ErrorHandling,
  runExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples();
}