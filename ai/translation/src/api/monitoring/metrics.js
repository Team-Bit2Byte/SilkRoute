const { logger } = require('../../utils/logger');

/**
 * Metrics collection and monitoring utilities
 * Provides detailed system health and performance metrics
 */

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: {},
        byLanguagePair: {},
        averageProcessingTime: 0,
        totalProcessingTime: 0
      },
      translations: {
        total: 0,
        cached: 0,
        chunked: 0,
        fallbackUsed: 0,
        byProvider: {},
        averageConfidence: 0,
        totalConfidence: 0,
        lowConfidenceCount: 0
      },
      errors: {
        total: 0,
        byType: {},
        byEndpoint: {},
        recent: []
      },
      system: {
        startTime: Date.now(),
        lastHealthCheck: null,
        memoryUsage: null,
        uptime: 0
      }
    };

    // Start periodic metrics collection
    this.startPeriodicCollection();
  }

  /**
   * Record a request metric
   * @param {Object} requestData - Request data
   */
  recordRequest(requestData) {
    const { endpoint, method, statusCode, processingTime, success } = requestData;
    const endpointKey = `${method} ${endpoint}`;

    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Track by endpoint
    if (!this.metrics.requests.byEndpoint[endpointKey]) {
      this.metrics.requests.byEndpoint[endpointKey] = {
        total: 0,
        successful: 0,
        failed: 0,
        averageProcessingTime: 0,
        totalProcessingTime: 0
      };
    }

    const endpointMetrics = this.metrics.requests.byEndpoint[endpointKey];
    endpointMetrics.total++;
    
    if (success) {
      endpointMetrics.successful++;
    } else {
      endpointMetrics.failed++;
    }

    // Update processing time metrics
    if (processingTime) {
      this.metrics.requests.totalProcessingTime += processingTime;
      this.metrics.requests.averageProcessingTime = 
        this.metrics.requests.totalProcessingTime / this.metrics.requests.total;

      endpointMetrics.totalProcessingTime += processingTime;
      endpointMetrics.averageProcessingTime = 
        endpointMetrics.totalProcessingTime / endpointMetrics.total;
    }

    logger.debug('Request metric recorded', {
      endpoint: endpointKey,
      statusCode,
      processingTime,
      success,
      type: 'metrics_request'
    });
  }

  /**
   * Record a translation metric
   * @param {Object} translationData - Translation data
   */
  recordTranslation(translationData) {
    const { 
      sourceLang, 
      targetLang, 
      provider, 
      confidence, 
      cached, 
      chunked, 
      fallbackUsed 
    } = translationData;

    this.metrics.translations.total++;

    if (cached) {
      this.metrics.translations.cached++;
    }

    if (chunked) {
      this.metrics.translations.chunked++;
    }

    if (fallbackUsed) {
      this.metrics.translations.fallbackUsed++;
    }

    // Track by provider
    if (provider) {
      if (!this.metrics.translations.byProvider[provider]) {
        this.metrics.translations.byProvider[provider] = {
          total: 0,
          averageConfidence: 0,
          totalConfidence: 0,
          lowConfidenceCount: 0
        };
      }

      this.metrics.translations.byProvider[provider].total++;
    }

    // Track by language pair
    const languagePair = `${sourceLang}-${targetLang}`;
    if (!this.metrics.requests.byLanguagePair[languagePair]) {
      this.metrics.requests.byLanguagePair[languagePair] = {
        total: 0,
        successful: 0,
        averageConfidence: 0,
        totalConfidence: 0
      };
    }

    this.metrics.requests.byLanguagePair[languagePair].total++;
    this.metrics.requests.byLanguagePair[languagePair].successful++;

    // Update confidence metrics
    if (typeof confidence === 'number') {
      this.metrics.translations.totalConfidence += confidence;
      this.metrics.translations.averageConfidence = 
        this.metrics.translations.totalConfidence / this.metrics.translations.total;

      if (confidence < 0.5) {
        this.metrics.translations.lowConfidenceCount++;
      }

      // Update provider confidence
      if (provider && this.metrics.translations.byProvider[provider]) {
        const providerMetrics = this.metrics.translations.byProvider[provider];
        providerMetrics.totalConfidence += confidence;
        providerMetrics.averageConfidence = 
          providerMetrics.totalConfidence / providerMetrics.total;

        if (confidence < 0.5) {
          providerMetrics.lowConfidenceCount++;
        }
      }

      // Update language pair confidence
      const pairMetrics = this.metrics.requests.byLanguagePair[languagePair];
      pairMetrics.totalConfidence += confidence;
      pairMetrics.averageConfidence = 
        pairMetrics.totalConfidence / pairMetrics.total;
    }

    logger.debug('Translation metric recorded', {
      languagePair,
      provider,
      confidence,
      cached,
      chunked,
      fallbackUsed,
      type: 'metrics_translation'
    });
  }

  /**
   * Record an error metric
   * @param {Object} errorData - Error data
   */
  recordError(errorData) {
    const { type, endpoint, message, statusCode } = errorData;

    this.metrics.errors.total++;

    // Track by error type
    if (!this.metrics.errors.byType[type]) {
      this.metrics.errors.byType[type] = 0;
    }
    this.metrics.errors.byType[type]++;

    // Track by endpoint
    if (endpoint) {
      if (!this.metrics.errors.byEndpoint[endpoint]) {
        this.metrics.errors.byEndpoint[endpoint] = 0;
      }
      this.metrics.errors.byEndpoint[endpoint]++;
    }

    // Keep recent errors (last 100)
    this.metrics.errors.recent.push({
      type,
      endpoint,
      message,
      statusCode,
      timestamp: Date.now()
    });

    if (this.metrics.errors.recent.length > 100) {
      this.metrics.errors.recent.shift();
    }

    logger.debug('Error metric recorded', {
      type,
      endpoint,
      statusCode,
      totalErrors: this.metrics.errors.total,
      type: 'metrics_error'
    });
  }

  /**
   * Get current metrics snapshot
   * @returns {Object} Current metrics
   */
  getMetrics() {
    this.updateSystemMetrics();

    return {
      ...this.metrics,
      timestamp: Date.now(),
      uptime: Date.now() - this.metrics.system.startTime
    };
  }

  /**
   * Get health status based on metrics
   * @returns {Object} Health status
   */
  getHealthStatus() {
    this.updateSystemMetrics();

    const now = Date.now();
    const uptime = now - this.metrics.system.startTime;
    const recentErrors = this.metrics.errors.recent.filter(
      error => now - error.timestamp < 300000 // Last 5 minutes
    ).length;

    // Calculate success rate
    const successRate = this.metrics.requests.total > 0 ? 
      (this.metrics.requests.successful / this.metrics.requests.total) * 100 : 100;

    // Calculate average confidence
    const avgConfidence = this.metrics.translations.averageConfidence || 0;

    // Determine health status
    let status = 'healthy';
    let issues = [];

    if (successRate < 95) {
      status = 'degraded';
      issues.push(`Low success rate: ${successRate.toFixed(1)}%`);
    }

    if (recentErrors > 10) {
      status = 'degraded';
      issues.push(`High error rate: ${recentErrors} errors in last 5 minutes`);
    }

    if (avgConfidence < 0.6 && this.metrics.translations.total > 10) {
      status = 'degraded';
      issues.push(`Low average confidence: ${avgConfidence.toFixed(2)}`);
    }

    if (successRate < 80 || recentErrors > 50) {
      status = 'unhealthy';
    }

    return {
      status,
      uptime,
      successRate: Math.round(successRate * 100) / 100,
      averageConfidence: Math.round(avgConfidence * 1000) / 1000,
      recentErrors,
      totalRequests: this.metrics.requests.total,
      totalTranslations: this.metrics.translations.total,
      issues,
      timestamp: now
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: {},
        byLanguagePair: {},
        averageProcessingTime: 0,
        totalProcessingTime: 0
      },
      translations: {
        total: 0,
        cached: 0,
        chunked: 0,
        fallbackUsed: 0,
        byProvider: {},
        averageConfidence: 0,
        totalConfidence: 0,
        lowConfidenceCount: 0
      },
      errors: {
        total: 0,
        byType: {},
        byEndpoint: {},
        recent: []
      },
      system: {
        startTime: Date.now(),
        lastHealthCheck: null,
        memoryUsage: null,
        uptime: 0
      }
    };

    logger.info('Metrics reset', { type: 'metrics_reset' });
  }

  /**
   * Update system metrics
   * @private
   */
  updateSystemMetrics() {
    this.metrics.system.uptime = Date.now() - this.metrics.system.startTime;
    this.metrics.system.memoryUsage = process.memoryUsage();
    this.metrics.system.lastHealthCheck = Date.now();
  }

  /**
   * Start periodic metrics collection
   * @private
   */
  startPeriodicCollection() {
    // Update system metrics every 30 seconds
    setInterval(() => {
      this.updateSystemMetrics();
      
      logger.debug('Periodic metrics update', {
        uptime: this.metrics.system.uptime,
        memoryUsage: this.metrics.system.memoryUsage,
        totalRequests: this.metrics.requests.total,
        totalTranslations: this.metrics.translations.total,
        type: 'metrics_periodic'
      });
    }, 30000);
  }
}

// Global metrics collector instance
const metricsCollector = new MetricsCollector();

/**
 * Express middleware to collect request metrics
 */
function collectRequestMetrics(req, res, next) {
  const startTime = Date.now();
  const originalEnd = res.end;

  res.end = function(chunk, encoding) {
    const processingTime = Date.now() - startTime;
    const success = res.statusCode < 400;

    metricsCollector.recordRequest({
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      processingTime,
      success
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Express middleware to collect translation metrics
 */
function collectTranslationMetrics(req, res, next) {
  if (req.path === '/translate' && req.method === 'POST') {
    const originalJson = res.json;

    res.json = function(data) {
      if (res.statusCode === 200 && data.translatedText) {
        metricsCollector.recordTranslation({
          sourceLang: data.sourceLang,
          targetLang: data.targetLang,
          provider: data.provider,
          confidence: data.confidenceScore,
          cached: data.cached,
          chunked: data.metadata && data.metadata.chunked,
          fallbackUsed: data.fallbackUsed
        });
      }

      originalJson.call(this, data);
    };
  }

  next();
}

/**
 * Express middleware to collect error metrics
 */
function collectErrorMetrics(err, req, res, next) {
  metricsCollector.recordError({
    type: err.name || 'UnknownError',
    endpoint: req.path,
    message: err.message,
    statusCode: res.statusCode || 500
  });

  next(err);
}

module.exports = {
  MetricsCollector,
  metricsCollector,
  collectRequestMetrics,
  collectTranslationMetrics,
  collectErrorMetrics
};