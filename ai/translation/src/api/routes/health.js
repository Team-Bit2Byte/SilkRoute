const express = require('express');
const { logger } = require('../../utils/logger');
const { metricsCollector } = require('../monitoring/metrics');

/**
 * Express.js router for health check and monitoring endpoints
 * Provides detailed system health, metrics, and monitoring information
 */
function createHealthRouter(translationService) {
  const router = express.Router();

  /**
   * GET /health
   * Basic health check endpoint
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
      const metricsHealth = metricsCollector.getHealthStatus();

      // Combine service health with metrics health
      const combinedHealth = {
        ...health,
        metrics: metricsHealth,
        requestId,
        apiVersion: '1.0.0',
        timestamp: Date.now()
      };

      // Determine overall status
      if (health.status === 'unhealthy' || metricsHealth.status === 'unhealthy') {
        combinedHealth.status = 'unhealthy';
      } else if (health.status === 'degraded' || metricsHealth.status === 'degraded') {
        combinedHealth.status = 'degraded';
      } else {
        combinedHealth.status = 'healthy';
      }

      // Determine HTTP status based on health status
      let statusCode = 200;
      if (combinedHealth.status === 'unhealthy') {
        statusCode = 503;
      } else if (combinedHealth.status === 'degraded') {
        statusCode = 200; // Still operational, just degraded
      }

      res.status(statusCode).json(combinedHealth);

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
   * GET /metrics
   * Detailed metrics endpoint
   */
  router.get('/metrics', async (req, res) => {
    const requestId = req.headers['x-request-id'] || `metrics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.debug('Metrics request received', {
        requestId,
        ip: req.ip,
        type: 'metrics_request'
      });

      const metrics = metricsCollector.getMetrics();
      const serviceHealth = await translationService.getHealth();

      res.status(200).json({
        metrics,
        serviceHealth,
        requestId,
        timestamp: Date.now(),
        apiVersion: '1.0.0'
      });

    } catch (error) {
      logger.error('Metrics request failed', {
        requestId,
        error: error.message,
        stack: error.stack,
        type: 'metrics_error'
      });

      res.status(500).json({
        error: {
          code: 'METRICS_FAILED',
          message: 'Unable to retrieve metrics',
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
   * GET /status
   * Lightweight status endpoint for load balancers
   */
  router.get('/status', async (req, res) => {
    try {
      const health = await translationService.getHealth();
      const metricsHealth = metricsCollector.getHealthStatus();

      // Simple status response
      const status = {
        status: health.status === 'healthy' && metricsHealth.status === 'healthy' ? 'ok' : 'degraded',
        timestamp: Date.now(),
        uptime: process.uptime(),
        version: '1.0.0'
      };

      // Return 200 for ok/degraded, 503 for unhealthy
      const statusCode = (health.status === 'unhealthy' || metricsHealth.status === 'unhealthy') ? 503 : 200;
      
      res.status(statusCode).json(status);

    } catch (error) {
      logger.error('Status check failed', {
        error: error.message,
        type: 'status_check_error'
      });

      res.status(503).json({
        status: 'error',
        timestamp: Date.now(),
        version: '1.0.0'
      });
    }
  });

  /**
   * GET /providers
   * Provider status endpoint
   */
  router.get('/providers', async (req, res) => {
    const requestId = req.headers['x-request-id'] || `providers_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.debug('Provider status request received', {
        requestId,
        ip: req.ip,
        type: 'provider_status_request'
      });

      const health = await translationService.getHealth();
      const metrics = metricsCollector.getMetrics();

      const providerStatus = {
        providers: health.providers || {},
        metrics: metrics.translations.byProvider || {},
        timestamp: Date.now(),
        requestId,
        apiVersion: '1.0.0'
      };

      res.status(200).json(providerStatus);

    } catch (error) {
      logger.error('Provider status request failed', {
        requestId,
        error: error.message,
        stack: error.stack,
        type: 'provider_status_error'
      });

      res.status(500).json({
        error: {
          code: 'PROVIDER_STATUS_FAILED',
          message: 'Unable to retrieve provider status',
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
   * GET /cache
   * Cache status and metrics endpoint
   */
  router.get('/cache', async (req, res) => {
    const requestId = req.headers['x-request-id'] || `cache_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.debug('Cache status request received', {
        requestId,
        ip: req.ip,
        type: 'cache_status_request'
      });

      const health = await translationService.getHealth();
      const metrics = metricsCollector.getMetrics();

      const cacheStatus = {
        cache: health.cache || {},
        metrics: {
          totalTranslations: metrics.translations.total,
          cachedTranslations: metrics.translations.cached,
          cacheHitRate: metrics.translations.total > 0 ? 
            (metrics.translations.cached / metrics.translations.total * 100).toFixed(2) + '%' : '0%'
        },
        timestamp: Date.now(),
        requestId,
        apiVersion: '1.0.0'
      };

      res.status(200).json(cacheStatus);

    } catch (error) {
      logger.error('Cache status request failed', {
        requestId,
        error: error.message,
        stack: error.stack,
        type: 'cache_status_error'
      });

      res.status(500).json({
        error: {
          code: 'CACHE_STATUS_FAILED',
          message: 'Unable to retrieve cache status',
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
   * POST /reset-metrics
   * Reset metrics (development/testing only)
   */
  router.post('/reset-metrics', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Metrics reset not allowed in production'
        },
        timestamp: Date.now()
      });
    }

    const requestId = req.headers['x-request-id'] || `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      metricsCollector.reset();

      logger.info('Metrics reset requested', {
        requestId,
        ip: req.ip,
        type: 'metrics_reset'
      });

      res.status(200).json({
        message: 'Metrics reset successfully',
        requestId,
        timestamp: Date.now(),
        apiVersion: '1.0.0'
      });

    } catch (error) {
      logger.error('Metrics reset failed', {
        requestId,
        error: error.message,
        type: 'metrics_reset_error'
      });

      res.status(500).json({
        error: {
          code: 'METRICS_RESET_FAILED',
          message: 'Unable to reset metrics'
        },
        requestId,
        timestamp: Date.now(),
        apiVersion: '1.0.0'
      });
    }
  });

  return router;
}

module.exports = { createHealthRouter };