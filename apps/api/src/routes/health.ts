import { Router, type Request, type Response } from 'express'
import { createApiResponse } from '@livestock/shared'
import { asyncHandler } from '@/middleware/error-handler'

const router: Router = Router()

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     description: Returns the health status of the API service
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               data:
 *                 status: "healthy"
 *                 timestamp: "2024-01-15T10:30:00Z"
 *                 version: "1.0.0"
 *                 environment: "development"
 *                 uptime: 12345
 *               timestamp: "2024-01-15T10:30:00Z"
 */
router.get('/', asyncHandler(async (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  }

  res.json(createApiResponse(healthData))
}))

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check
 *     tags: [Health]
 *     description: Returns detailed health information including dependencies
 *     responses:
 *       200:
 *         description: Detailed health information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  const detailedHealth = {
    api: {
      status: 'healthy',
      responseTime: Date.now() - ((req as any).startTime || Date.now())
    },
    system: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: {
        node: process.version,
        api: '1.0.0'
      }
    }
  }

  res.json(createApiResponse(detailedHealth))
}))

export default router