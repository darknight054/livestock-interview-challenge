import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import { config } from '@/config/app-config'
import { errorHandler } from '@/middleware/error-handler'

// Route imports
import healthRoutes from '@/routes/health'
import animalRoutes from '@/routes/animals'
import sensorRoutes from '@/routes/sensors'
import predictionRoutes from '@/routes/predictions'

// Swagger documentation
import { setupSwagger } from '@/config/swagger'

async function createApp(): Promise<express.Application> {
  const app = express()

  // Security middleware
  app.use(helmet())


  // Basic middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // CORS configuration
  app.use(cors({
    origin: config.CORS_ORIGINS,
    credentials: true
  }))

  // Logging
  app.use(morgan('dev'))

  // Setup Swagger documentation
  if (config.ENABLE_SWAGGER) {
    setupSwagger(app)
  }

  // Health check endpoint (before API routes)
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  })

  // API routes
  const apiRouter = express.Router()
  
  apiRouter.use('/health', healthRoutes)
  apiRouter.use('/animals', animalRoutes)
  apiRouter.use('/sensors', sensorRoutes)
  apiRouter.use('/predictions', predictionRoutes)

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
    const app = await createApp()
    
    const server = app.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT}`)
      console.log(`API Documentation: http://localhost:${config.PORT}/api-docs`)
      console.log(`Health Check: http://localhost:${config.PORT}/health`)
    })

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`)
      server.close(() => {
        console.log('Server closed successfully')
        process.exit(0)
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
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer()
}

export { createApp }