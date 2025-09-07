import { Router } from 'express'
import { createApiResponse, createApiError } from '@livestock/shared'
import { HTTP_STATUS, ERROR_CODES } from '@livestock/shared'
import { generateMockAnimals } from '@livestock/shared'
import { asyncHandler, createCustomError } from '@/middleware/error-handler'
import { GetHealthParamsSchema, PaginationParamsSchema } from '@livestock/shared'

const router: Router = Router()

// Mock data store (in real implementation, this would be a database)
const mockAnimals = generateMockAnimals(50)

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

  let filteredAnimals = [...mockAnimals]

  // Apply filters
  if (farmId) {
    filteredAnimals = filteredAnimals.filter(animal => animal.farmId === farmId)
  }

  if (healthStatus) {
    filteredAnimals = filteredAnimals.filter(animal => animal.healthStatus === healthStatus)
  }

  // Apply pagination
  const total = filteredAnimals.length
  const startIndex = (pagination.page - 1) * pagination.limit
  const paginatedAnimals = filteredAnimals.slice(startIndex, startIndex + pagination.limit)

  const responseData = {
    data: paginatedAnimals,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit)
    },
    filters: {
      farmId: farmId || null,
      healthStatus: healthStatus || null
    }
  }

  res.json(createApiResponse(responseData))
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
  
  const animal = mockAnimals.find(a => a.id === animalId)
  
  if (!animal) {
    throw createCustomError(
      `Animal with ID ${animalId} not found`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.ANIMAL_NOT_FOUND
    )
  }

  res.json(createApiResponse(animal))
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
  
  const animal = mockAnimals.find(a => a.id === animalId)
  
  if (!animal) {
    throw createCustomError(
      `Animal with ID ${animalId} not found`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.ANIMAL_NOT_FOUND
    )
  }

  // Mock historical data
  const history = Array.from({ length: days }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    return {
      date: date.toISOString().split('T')[0],
      healthStatus: i < 3 ? animal.healthStatus : 'healthy', // Show recent changes
      weight: animal.weight ? animal.weight + (Math.random() - 0.5) * 20 : undefined,
      notes: i === 0 ? 'Latest status update' : undefined
    }
  }).reverse()

  const responseData = {
    animalId,
    period: `${days} days`,
    history
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
  const stats = {
    total: mockAnimals.length,
    byHealthStatus: {
      healthy: mockAnimals.filter(a => a.healthStatus === 'healthy').length,
      at_risk: mockAnimals.filter(a => a.healthStatus === 'at_risk').length,
      sick: mockAnimals.filter(a => a.healthStatus === 'sick').length,
      critical: mockAnimals.filter(a => a.healthStatus === 'critical').length
    },
    byFarm: Object.entries(
      mockAnimals.reduce((acc, animal) => {
        acc[animal.farmId] = (acc[animal.farmId] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).map(([farmId, count]) => ({ farmId, count })),
    averageWeight: Math.round(
      mockAnimals
        .filter(a => a.weight)
        .reduce((sum, a) => sum + (a.weight || 0), 0) / 
      mockAnimals.filter(a => a.weight).length
    ) || 0,
    breeds: Object.entries(
      mockAnimals.reduce((acc, animal) => {
        acc[animal.breed] = (acc[animal.breed] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    ).map(([breed, count]) => ({ breed, count }))
      .sort((a, b) => b.count - a.count)
  }

  res.json(createApiResponse(stats))
}))

export default router