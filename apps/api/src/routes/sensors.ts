import { Router } from 'express'
import { createApiResponse, createApiError } from '@livestock/shared'
import { HTTP_STATUS, ERROR_CODES } from '@livestock/shared'
import { mockFarms } from '@livestock/shared'
import { asyncHandler, createCustomError } from '@/middleware/error-handler'
import { 
  GetHealthParamsSchema,
  PaginationParamsSchema 
} from '@livestock/shared'
import { csvDataLoader } from '@/services/csv-data-loader'

const router: Router = Router()


/**
 * @swagger
 * /sensors/{animalId}/latest:
 *   get:
 *     summary: Get latest sensor reading
 *     tags: [Sensors]
 *     description: Get the most recent sensor reading for an animal
 *     parameters:
 *       - in: path
 *         name: animalId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]\\d{3}$'
 *         description: Animal ID
 *     responses:
 *       200:
 *         description: Latest sensor reading retrieved
 *       404:
 *         description: No sensor data found for animal
 */
router.get('/:animalId/latest', asyncHandler(async (req, res) => {
  const { animalId } = GetHealthParamsSchema.parse(req.params)
  
  // Get latest reading from CSV data
  const readings = await csvDataLoader.getSensorReadings(animalId, { limit: 1 })
  
  if (readings.length === 0) {
    throw createCustomError(
      `No sensor data found for animal ${animalId}`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.ANIMAL_NOT_FOUND
    )
  }

  // Get the latest reading
  const latestReading = readings[0]

  res.json(createApiResponse(latestReading))
}))

/**
 * @swagger
 * /sensors/{animalId}/history:
 *   get:
 *     summary: Get sensor reading history
 *     tags: [Sensors]
 *     description: Get historical sensor readings for an animal
 *     parameters:
 *       - in: path
 *         name: animalId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]\\d{3}$'
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 168
 *           default: 24
 *         description: Hours of history to retrieve
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Sensor history retrieved successfully
 */
router.get('/:animalId/history', asyncHandler(async (req, res) => {
  const { animalId } = GetHealthParamsSchema.parse(req.params)
  const pagination = PaginationParamsSchema.parse(req.query)
  const hours = Math.min(Number(req.query.hours) || 24, 168) // Max 1 week

  // Get readings from CSV data with time filter
  const readings = await csvDataLoader.getSensorReadings(animalId, {
    hours,
    limit: pagination.limit * 10 // Get more data for pagination
  })

  if (readings.length === 0) {
    throw createCustomError(
      `No sensor data found for animal ${animalId}`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.ANIMAL_NOT_FOUND
    )
  }

  // Sort by timestamp (most recent first)
  const sortedReadings = readings.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  // Apply pagination
  const total = sortedReadings.length
  const startIndex = (pagination.page - 1) * pagination.limit
  const paginatedReadings = sortedReadings.slice(startIndex, startIndex + pagination.limit)

  const responseData = {
    animalId,
    period: `${hours} hours`,
    data: paginatedReadings,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit)
    },
    summary: {
      totalReadings: total,
      timeRange: {
        from: sortedReadings[sortedReadings.length - 1]?.timestamp,
        to: sortedReadings[0]?.timestamp
      }
    }
  }

  res.json(createApiResponse(responseData))
}))

/**
 * @swagger
 * /sensors/batch:
 *   get:
 *     summary: Get sensor data for multiple animals
 *     tags: [Sensors]
 *     description: Retrieve sensor readings for multiple animals
 *     parameters:
 *       - in: query
 *         name: animalIds
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]\\d{3}(,[A-Z]\\d{3})*$'
 *         description: Comma-separated list of animal IDs
 *         example: 'C001,C002,C003'
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 168
 *           default: 24
 *         description: Hours of history to retrieve per animal
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum readings per animal
 *     responses:
 *       200:
 *         description: Batch sensor data retrieved successfully
 *       400:
 *         description: Invalid animal IDs parameter
 */
router.get('/batch', asyncHandler(async (req, res) => {
  const animalIdsParam = req.query.animalIds as string
  
  if (!animalIdsParam) {
    throw createCustomError(
      'animalIds parameter is required',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    )
  }

  const animalIds = animalIdsParam.split(',').map(id => id.trim())
  const hours = Math.min(Number(req.query.hours) || 24, 168)
  const limitPerAnimal = Math.min(Number(req.query.limit) || 50, 100)

  // Get batch data from CSV
  const batchData = await csvDataLoader.getBatchSensorReadings(animalIds, {
    hours,
    limitPerAnimal
  })

  const totalReadings = Object.values(batchData).reduce((sum, readings) => sum + readings.length, 0)

  const responseData = {
    animalData: batchData,
    totalAnimals: animalIds.length,
    totalReadings,
    period: `${hours} hours`,
    summary: {
      animalsWithData: Object.values(batchData).filter(readings => readings.length > 0).length,
      animalsWithoutData: Object.values(batchData).filter(readings => readings.length === 0).length
    }
  }

  res.json(createApiResponse(responseData))
}))

/**
 * @swagger
 * /sensors/status:
 *   get:
 *     summary: Get sensor status overview
 *     tags: [Sensors]
 *     description: Get overview of sensor status across all animals
 *     responses:
 *       200:
 *         description: Sensor status overview retrieved
 */
router.get('/status', asyncHandler(async (req, res) => {
  // Generate mock sensor status data
  const totalSensors = 150
  const statusCounts = {
    healthy: Math.floor(totalSensors * 0.85),
    low_battery: Math.floor(totalSensors * 0.10),
    malfunction: Math.floor(totalSensors * 0.03),
    offline: Math.floor(totalSensors * 0.02)
  }

  const recentIssues = [
    {
      animalId: 'C023',
      issue: 'low_battery',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      severity: 'medium'
    },
    {
      animalId: 'C045',
      issue: 'malfunction',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      severity: 'high'
    }
  ]

  const responseData = {
    overview: {
      total: totalSensors,
      statusCounts,
      healthPercentage: Math.round((statusCounts.healthy / totalSensors) * 100)
    },
    recentIssues,
    statistics: {
      averageBatteryLevel: 78,
      dataQuality: {
        completeness: 96.5,
        accuracy: 98.2,
        timeliness: 99.1
      },
      lastUpdated: new Date().toISOString()
    }
  }

  res.json(createApiResponse(responseData))
}))

export default router