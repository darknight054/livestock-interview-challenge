/**
 * Production Health Check and Monitoring Endpoints
 * 
 * Comprehensive system health monitoring for production deployments:
 * - Deep health checks for all system components
 * - Performance metrics and resource monitoring
 * - Cache statistics and rate limit monitoring
 * - System status dashboard data
 * - Kubernetes/Docker health check compatibility
 */

import { Router } from 'express'
import { createApiResponse } from '@livestock/shared'
import { asyncHandler } from '@/middleware/error-handler'
import { healthCheck as dbHealthCheck } from '@/config/database'
import { redisHealthCheck } from '@/config/redis'
import { cacheService } from '@/services/cache-service'
import { executeQuery } from '@/config/database'

const router: Router = Router()

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  environment: string
  services: {
    database: ServiceHealth
    redis: ServiceHealth
    cache: ServiceHealth
  }
  performance: PerformanceMetrics
  resources: ResourceMetrics
}

interface ServiceHealth {
  status: 'healthy' | 'unhealthy'
  responseTime: number
  details?: any
  lastChecked: string
}

interface PerformanceMetrics {
  avgResponseTime: number
  requestsPerSecond: number
  errorRate: number
  cacheHitRate: number
}

interface ResourceMetrics {
  memory: {
    used: number
    total: number
    percentage: number
  }
  cpu: {
    usage: number
  }
  connections: {
    database: number
    redis: number
  }
}

// Store for basic metrics (in production, use proper monitoring tools)
class SimpleMetrics {
  private requestCount = 0
  private errorCount = 0
  private responseTimes: number[] = []
  private startTime = Date.now()

  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++
    if (isError) this.errorCount++
    
    this.responseTimes.push(responseTime)
    // Keep only last 1000 response times for memory efficiency
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000)
    }
  }

  getMetrics(): PerformanceMetrics {
    const now = Date.now()
    const uptimeSeconds = (now - this.startTime) / 1000
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length 
      : 0
    
    const requestsPerSecond = this.requestCount / uptimeSeconds
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0
    
    const cacheStats = cacheService.getCacheStats()
    
    return {
      avgResponseTime: Math.round(avgResponseTime),
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      cacheHitRate: cacheStats.hitRate
    }
  }

  reset(): void {
    this.requestCount = 0
    this.errorCount = 0
    this.responseTimes = []
    this.startTime = Date.now()
  }
}

const metrics = new SimpleMetrics()

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     description: Quick health status for load balancers and orchestration
 *     responses:
 *       200:
 *         description: Service is healthy
 *       503:
 *         description: Service is unhealthy
 */
router.get('/', asyncHandler(async (req, res) => {
  const start = Date.now()
  
  try {
    // Quick health check - suitable for load balancer health checks
    const [dbHealth, redisHealth] = await Promise.allSettled([
      dbHealthCheck(),
      redisHealthCheck()
    ])

    const isHealthy = dbHealth.status === 'fulfilled' && 
                      dbHealth.value.status === 'healthy'

    const responseTime = Date.now() - start
    metrics.recordRequest(responseTime, !isHealthy)

    if (isHealthy) {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`
      })
    } else {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        reason: 'Database connection failed'
      })
    }
  } catch (error) {
    const responseTime = Date.now() - start
    metrics.recordRequest(responseTime, true)
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: 'Health check failed'
    })
  }
}))

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check
 *     tags: [Health]
 *     description: Comprehensive system health with all component status
 *     responses:
 *       200:
 *         description: Detailed health information
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  const start = Date.now()
  const timestamp = new Date().toISOString()
  
  // Parallel health checks for all services
  const [dbHealthResult, redisHealthResult] = await Promise.allSettled([
    dbHealthCheck(),
    redisHealthCheck()
  ])

  // Database health
  const dbHealth: ServiceHealth = {
    status: dbHealthResult.status === 'fulfilled' && dbHealthResult.value.status === 'healthy' 
      ? 'healthy' : 'unhealthy',
    responseTime: dbHealthResult.status === 'fulfilled' 
      ? dbHealthResult.value.details.responseTime || 0 : 0,
    details: dbHealthResult.status === 'fulfilled' 
      ? dbHealthResult.value.details : { error: 'Connection failed' },
    lastChecked: timestamp
  }

  // Redis health
  const redisHealth: ServiceHealth = {
    status: redisHealthResult.status === 'fulfilled' && redisHealthResult.value.status === 'healthy'
      ? 'healthy' : 'unhealthy',
    responseTime: redisHealthResult.status === 'fulfilled'
      ? redisHealthResult.value.details.responseTime || 0 : 0,
    details: redisHealthResult.status === 'fulfilled'
      ? redisHealthResult.value.details : { error: 'Connection failed' },
    lastChecked: timestamp
  }

  // Cache service health
  const cacheStats = cacheService.getCacheStats()
  const cacheHealth: ServiceHealth = {
    status: 'healthy', // Cache service is always considered healthy (has fallbacks)
    responseTime: 0,
    details: cacheStats,
    lastChecked: timestamp
  }

  // Resource metrics
  const memoryUsage = process.memoryUsage()
  const resources: ResourceMetrics = {
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
    },
    cpu: {
      usage: Math.round(process.cpuUsage().user / 1000000) // Convert to percentage approximation
    },
    connections: {
      database: dbHealth.details?.poolSize || 0,
      redis: redisHealth.status === 'healthy' ? 1 : 0
    }
  }

  // Performance metrics
  const performance = metrics.getMetrics()

  // Overall system status
  const allServicesHealthy = dbHealth.status === 'healthy' && redisHealth.status === 'healthy'
  
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  if (allServicesHealthy) {
    overallStatus = 'healthy'
  } else if (dbHealth.status === 'healthy' && redisHealth.status === 'unhealthy') {
    overallStatus = 'degraded' // Redis failure is not critical (has fallbacks)
  } else {
    overallStatus = 'unhealthy'
  }

  const healthResponse: SystemHealth = {
    status: overallStatus,
    timestamp,
    version: '2.0.0',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: dbHealth,
      redis: redisHealth,
      cache: cacheHealth
    },
    performance,
    resources
  }

  const responseTime = Date.now() - start
  metrics.recordRequest(responseTime, overallStatus === 'unhealthy')

  // Return appropriate status code
  const statusCode = overallStatus === 'healthy' ? 200 : 
                    overallStatus === 'degraded' ? 200 : 503

  res.status(statusCode).json(createApiResponse(healthResponse))
}))

/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: Performance metrics
 *     tags: [Health]
 *     description: Application performance and usage metrics
 *     responses:
 *       200:
 *         description: Performance metrics
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  // Get comprehensive metrics
  const performance = metrics.getMetrics()
  const cacheStats = cacheService.getCacheStats()
  
  // Database metrics
  const dbMetrics = await getDatabaseMetrics()
  
  // System metrics
  const memoryUsage = process.memoryUsage()
  const systemMetrics = {
    uptime: Math.floor(process.uptime()),
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024)
    },
    process: {
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version,
      cpuUsage: process.cpuUsage()
    }
  }

  const metricsResponse = {
    timestamp: new Date().toISOString(),
    performance,
    cache: cacheStats,
    database: dbMetrics,
    system: systemMetrics
  }

  res.json(createApiResponse(metricsResponse))
}))

/**
 * Get database performance metrics
 */
async function getDatabaseMetrics(): Promise<any> {
  try {
    const queries = [
      // Connection stats
      'SELECT count(*) as total_connections FROM pg_stat_activity',
      
      // Database size
      'SELECT pg_size_pretty(pg_database_size(current_database())) as database_size',
      
      // Table statistics (top 5 by size)
      `SELECT schemaname, tablename, 
              pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
              n_tup_ins as inserts,
              n_tup_upd as updates,
              n_tup_del as deletes
       FROM pg_stat_user_tables 
       ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
       LIMIT 5`,
    ]

    const results = await Promise.all(
      queries.map(query => executeQuery(query, []).catch(err => ({ rows: [], error: err.message })))
    )

    return {
      connections: results[0].rows[0]?.total_connections || 0,
      databaseSize: results[1].rows[0]?.database_size || 'Unknown',
      topTables: results[2].rows || []
    }
  } catch (error) {
    return {
      error: 'Failed to fetch database metrics',
      details: error instanceof Error ? error.message : error
    }
  }
}

// Middleware to record metrics for all requests
export function metricsMiddleware(req: any, res: any, next: any) {
  const start = Date.now()
  
  res.on('finish', () => {
    const responseTime = Date.now() - start
    const isError = res.statusCode >= 400
    metrics.recordRequest(responseTime, isError)
  })
  
  next()
}

export default router