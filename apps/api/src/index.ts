import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(__filename, '..')

// Load .env from project root
dotenvConfig({ path: resolve(__dirname, '../../../.env') })
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import { config } from '@/config/app-config'
import { errorHandler } from '@/middleware/error-handler'
import { initializeDatabase, testDatabaseConnection, closeDatabase } from '@/config/database'
import { initializeRedis, testRedisConnection, closeRedis } from '@/config/redis'
import { CommonRateLimiters, globalRateLimit } from '@/middleware/rate-limiter'
import { metricsMiddleware } from '@/routes/health'

// Route imports
import healthRoutes from '@/routes/health'
import animalRoutes from '@/routes/animals'
import sensorRoutes from '@/routes/sensors'
import predictionRoutes from '@/routes/predictions'
import analyticsRoutes from '@/routes/analytics'

// Swagger documentation
import { setupSwagger } from '@/config/swagger'

async function createApp(): Promise<express.Application> {
  const app = express()

  // Security middleware
  app.use(helmet())

  // Metrics collection middleware
  app.use(metricsMiddleware)

  // Rate limiting (applied globally)
  if (process.env.RATE_LIMIT_ENABLED !== 'false') {
    app.use(globalRateLimit())
  }

  // Basic middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // CORS configuration
  app.use(cors({
    origin: config.CORS_ORIGINS,
    credentials: true
  }))

  // Logging
  app.use(morgan('combined'))

  // Setup Swagger documentation
  if (config.ENABLE_SWAGGER) {
    setupSwagger(app)
  }

  // Health check endpoint (before API routes) with minimal rate limiting
  app.get('/health', CommonRateLimiters.health.middleware(), (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  })

  // API routes with specific rate limiting
  const apiRouter = express.Router()
  
  apiRouter.use('/health', healthRoutes)
  apiRouter.use('/animals', CommonRateLimiters.api.middleware(), animalRoutes)
  apiRouter.use('/sensors', CommonRateLimiters.sensors.middleware(), sensorRoutes)
  apiRouter.use('/predictions', CommonRateLimiters.api.middleware(), predictionRoutes)
  apiRouter.use('/analytics', CommonRateLimiters.analytics.middleware(), analyticsRoutes)

  app.use('/api/v1', apiRouter)

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`
      }
    })
  })

  // Error handling middleware (must be last)
  app.use(errorHandler)

  return app
}

async function startServer() {
  try {
    // Initialize database connection pool
    console.log('Initializing database connection...')
    initializeDatabase()
    
    // Test database connectivity
    const isDbConnected = await testDatabaseConnection()
    if (!isDbConnected) {
      throw new Error('Database connection test failed')
    }
    
    // Initialize Redis connection
    console.log('Initializing Redis connection...')
    await initializeRedis()

    const isRedisConnected = await testRedisConnection()
    if (!isRedisConnected) {
      throw new Error('Redis connection test failed')
    }
    
    const app = await createApp()
    
    const server = app.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT}`)
      console.log(`API Documentation: http://localhost:${config.PORT}/api-docs`)
      console.log(`Health Check: http://localhost:${config.PORT}/health`)
      console.log('Database connected and ready')
      console.log('Redis connected and ready')
      console.log('Rate limiting enabled')
      console.log('Caching layer active')
    })

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`)
      
      server.close(async () => {
        try {
          // Close database and Redis connections
          await Promise.all([
            closeDatabase(),
            closeRedis()
          ])
          console.log('Database and Redis connections closed')
          console.log('Server shutdown completed successfully')
          process.exit(0)
        } catch (error) {
          console.error('Error during shutdown:', error)
          process.exit(1)
        }
      })
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start server if this file is run directly  
startServer()

export { createApp }