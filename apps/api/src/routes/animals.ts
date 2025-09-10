import { Router } from 'express'
import { createApiResponse, createApiError } from '@livestock/shared'
import { HTTP_STATUS, ERROR_CODES } from '@livestock/shared'
import { asyncHandler, createCustomError } from '@/middleware/error-handler'
import { GetHealthParamsSchema, PaginationParamsSchema } from '@livestock/shared'
import { cacheService } from '@/services/cache-service'

const router: Router = Router()

/**
 * @swagger
 * /animals:
 *   get:
 *     summary: Get all animals
 *     tags: [Animals]
 *     description: Retrieve a paginated list of all animals
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: farmId
 *         schema:
 *           type: string
 *           pattern: '^F\\d{3}$'
 *         description: Filter by farm ID
 *       - in: query
 *         name: healthStatus
 *         schema:
 *           type: string
 *           enum: [healthy, at_risk, sick, critical]
 *         description: Filter by health status
 *     responses:
 *       200:
 *         description: List of animals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/', asyncHandler(async (req, res) => {
  const pagination = PaginationParamsSchema.parse(req.query)
  const { farmId, healthStatus } = req.query

  // Get animals from database with efficient filtering and pagination
  const result = await cacheService.getAnimals({
    page: pagination.page,
    limit: pagination.limit,
    sortBy: pagination.sortBy || 'id',
    sortOrder: pagination.sortOrder || 'asc',
    farmId: farmId as string,
    healthStatus: healthStatus as string
  })

  const responseData = {
    ...result,
    filters: {
      farmId: farmId || null,
      healthStatus: healthStatus || null
    }
  }

  res.json(createApiResponse(responseData))
}))

/**
 * @swagger
 * /animals/stats:
 *   get:
 *     summary: Get animal statistics
 *     tags: [Animals]
 *     description: Get aggregated statistics about all animals
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', asyncHandler(async (req, res) => {
  // Get all animals for statistics calculation
  const result = await cacheService.getAnimals({ page: 1, limit: 1000 })
  const animals = result.data
  
  const stats = {
    total: animals.length,
    byHealthStatus: {
      healthy: animals.filter(a => a.healthStatus === 'healthy').length,
      at_risk: animals.filter(a => a.healthStatus === 'at_risk').length,
      sick: animals.filter(a => a.healthStatus === 'sick').length,
      critical: animals.filter(a => a.healthStatus === 'critical').length
    },
    byFarm: Object.entries(
      animals.reduce((acc, animal) => {
        acc[animal.farmId] = (acc[animal.farmId] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).map(([farmId, count]) => ({ farmId, count })),
    averageWeight: Math.round(
      animals
        .filter(a => a.weight)
        .reduce((sum, a) => sum + (typeof a.weight === 'string' ? parseFloat(a.weight) : (a.weight || 0)), 0) / 
      animals.filter(a => a.weight).length
    ) || 0,
    breeds: Object.entries(
      animals.reduce((acc, animal) => {
        acc[animal.breed] = (acc[animal.breed] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).map(([breed, count]) => ({ breed, count }))
      .sort((a, b) => b.count - a.count)
  }

  res.json(createApiResponse(stats))
}))

/**
 * @swagger
 * /animals/{animalId}:
 *   get:
 *     summary: Get animal by ID
 *     tags: [Animals]
 *     description: Retrieve detailed information about a specific animal
 *     parameters:
 *       - in: path
 *         name: animalId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]\\d{3}$'
 *         description: Animal ID (e.g., C001)
 *     responses:
 *       200:
 *         description: Animal details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Animal not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/:animalId', asyncHandler(async (req, res) => {
  const { animalId } = GetHealthParamsSchema.parse(req.params)
  
  // Get animals from database (use reasonable limit to find the specific animal)
  const result = await cacheService.getAnimals({ 
    limit: 500, 
    page: 1 
  })
  
  const animal = result.data.find(a => a.id === animalId)
  
  if (!animal) {
    throw createCustomError(
      `Animal with ID ${animalId} not found`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.ANIMAL_NOT_FOUND
    )
  }

  // Get latest sensor reading and health prediction for enriched response
  const [latestSensor, latestHealth] = await Promise.all([
    cacheService.getLatestSensorReading(animalId),
    cacheService.getLatestHealthPrediction(animalId)
  ])

  const enrichedAnimal = {
    ...animal,
    latestSensorReading: latestSensor,
    latestHealthPrediction: latestHealth
  }

  res.json(createApiResponse(enrichedAnimal))
}))

/**
 * @swagger
 * /animals/{animalId}/history:
 *   get:
 *     summary: Get animal history
 *     tags: [Animals]
 *     description: Retrieve historical data for a specific animal
 *     parameters:
 *       - in: path
 *         name: animalId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]\\d{3}$'
 *         description: Animal ID
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days of history to retrieve
 *     responses:
 *       200:
 *         description: Animal history retrieved successfully
 *       404:
 *         description: Animal not found
 */
router.get('/:animalId/history', asyncHandler(async (req, res) => {
  const { animalId } = GetHealthParamsSchema.parse(req.params)
  const days = Math.min(Number(req.query.days) || 30, 365)
  
  // Get animals from database (use reasonable limit to find the specific animal)
  const result = await cacheService.getAnimals({ 
    limit: 500, 
    page: 1 
  })
  
  const animal = result.data.find(a => a.id === animalId)
  
  if (!animal) {
    throw createCustomError(
      `Animal with ID ${animalId} not found`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.ANIMAL_NOT_FOUND
    )
  }

  // Get actual historical data from database
  const hours = days * 24
  const [sensorReadings, healthLabels] = await Promise.all([
    cacheService.getSensorReadings(animalId, { 
      hours, 
      limit: 1000 
    }),
    cacheService.getHealthLabels(animalId, { 
      limit: days,
      startTime: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    })
  ])

  // Group sensor readings by date
  const sensorByDate = sensorReadings.reduce((acc, reading) => {
    const date = new Date(reading.timestamp).toISOString().split('T')[0]
    if (!acc[date]) acc[date] = []
    acc[date].push(reading)
    return acc
  }, {} as Record<string, any[]>)

  // Group health labels by date
  const healthByDate = healthLabels.reduce((acc, label) => {
    const date = new Date(label.timestamp).toISOString().split('T')[0]
    if (!acc[date]) acc[date] = []
    acc[date].push(label)
    return acc
  }, {} as Record<string, any[]>)

  // Create daily history from actual data
  const history = []
  for (let i = 0; i < days; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    const daySensors = sensorByDate[dateStr] || []
    const dayHealth = healthByDate[dateStr] || []
    
    // Calculate daily averages
    const avgTemp = daySensors.length > 0 
      ? daySensors.reduce((sum, s) => sum + (s.temperature || 0), 0) / daySensors.length 
      : null
    const avgHeartRate = daySensors.length > 0 
      ? daySensors.reduce((sum, s) => sum + (s.heartRate || 0), 0) / daySensors.length 
      : null
    
    const latestHealth = dayHealth.length > 0 
      ? dayHealth.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      : null

    history.push({
      date: dateStr,
      sensorReadings: daySensors.length,
      avgTemperature: avgTemp ? Math.round(avgTemp * 100) / 100 : null,
      avgHeartRate: avgHeartRate ? Math.round(avgHeartRate) : null,
      healthStatus: latestHealth?.healthStatus || null,
      diseaseType: latestHealth?.diseaseType || null,
      diseaseDay: latestHealth?.diseaseDay || null,
      batteryLevel: daySensors.length > 0 
        ? daySensors[daySensors.length - 1].batteryLevel 
        : null
    })
  }
  
  history.reverse() // Show oldest to newest

  const responseData = {
    animalId,
    period: `${days} days`,
    history
  }

  res.json(createApiResponse(responseData))
}))

export default router