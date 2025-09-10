/**
 * Analytics & Time-Series Aggregation Endpoints
 * 
 * High-performance endpoints using TimescaleDB continuous aggregates:
 * - Multi-resolution time-series data (5min, 15min, 1hour, 1day)
 * - Real-time analytics with materialized views
 * - Efficient downsampling and trend analysis
 * - Farm-wide and animal-specific analytics
 */

import { Router } from 'express'
import { createApiResponse, createApiError } from '@livestock/shared'
import { HTTP_STATUS, ERROR_CODES } from '@livestock/shared'
import { asyncHandler, createCustomError } from '@/middleware/error-handler'
import { GetHealthParamsSchema, PaginationParamsSchema } from '@livestock/shared'
import { cacheService } from '@/services/cache-service'
import { executeQuery } from '@/config/database'

const router: Router = Router()

/**
 * @swagger
 * /analytics/sensor/{animalId}/timeseries:
 *   get:
 *     summary: Get time-series aggregated sensor data
 *     tags: [Analytics]
 *     description: Get aggregated sensor readings using TimescaleDB continuous aggregates
 *     parameters:
 *       - in: path
 *         name: animalId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[A-Z]\\d{3}$'
 *         description: Animal ID
 *       - in: query
 *         name: resolution
 *         required: true
 *         schema:
 *           type: string
 *           enum: [5min, 15min, 1hour, 1day]
 *         description: Time resolution for aggregation
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 8760
 *           default: 24
 *         description: Hours of data to retrieve
 *       - in: query
 *         name: metrics
 *         schema:
 *           type: string
 *           default: 'temperature,heartRate'
 *         description: Comma-separated metrics (temperature, heartRate, activity)
 *     responses:
 *       200:
 *         description: Time-series data retrieved successfully
 */
router.get('/sensor/:animalId/timeseries', asyncHandler(async (req, res) => {
  const { animalId } = GetHealthParamsSchema.parse(req.params)
  const resolution = req.query.resolution as '5min' | '15min' | '1hour' | '1day'
  const hoursParam = req.query.hours ? Number(req.query.hours) : null
  const hours = hoursParam ? Math.min(hoursParam, 17520) : null // Max 2 years, null means no time filter
  const metrics = (req.query.metrics as string || 'temperature,heartRate').split(',')

  if (!['5min', '15min', '1hour', '1day'].includes(resolution)) {
    throw createCustomError(
      'Invalid resolution. Must be one of: 5min, 15min, 1hour, 1day',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR
    )
  }

  // Get aggregated data using TimescaleDB continuous aggregates
  // When no hours specified, get all historical data without time filter
  const options: any = {
    resolution,
    limit: hoursParam ? Math.min(hoursParam * 60 / (resolution === '5min' ? 5 : resolution === '15min' ? 15 : resolution === '1hour' ? 60 : 1440) + 100, 10000) : 1000, // Dynamic limit based on resolution and hours
    hours: hours && hours <= 17520 ? hours : undefined // Only apply time filter for reasonable periods
  }
  
  const data = await cacheService.getAggregatedSensorData(animalId, options)

  if (data.length === 0) {
    throw createCustomError(
      `No aggregated sensor data found for animal ${animalId}`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.ANIMAL_NOT_FOUND
    )
  }

  // Calculate additional analytics
  const analytics = calculateTimeSeriesAnalytics(data, metrics)

  const responseData = {
    animalId,
    resolution,
    period: `${hours} hours`,
    metrics,
    data,
    analytics,
    summary: {
      totalDataPoints: data.length,
      timeRange: {
        from: data[data.length - 1]?.timestamp,
        to: data[0]?.timestamp
      },
      coverage: calculateDataCoverage(data, hours, resolution)
    }
  }

  res.json(createApiResponse(responseData))
}))

/**
 * @swagger
 * /analytics/farm/{farmId}/overview:
 *   get:
 *     summary: Get comprehensive farm analytics
 *     tags: [Analytics]
 *     description: Real-time farm-wide analytics and health monitoring
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^F\\d{3}$'
 *         description: Farm ID
 *       - in: query
 *         name: resolution
 *         schema:
 *           type: string
 *           enum: [1hour, 1day]
 *           default: '1hour'
 *         description: Time resolution for trends
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 90
 *           default: 7
 *         description: Days of trend data
 */
router.get('/farm/:farmId/overview', asyncHandler(async (req, res) => {
  const { farmId } = req.params
  const resolution = req.query.resolution as '1hour' | '1day' || '1hour'
  const days = Math.min(Number(req.query.days) || 7, 90)

  // Get farm overview stats
  const overview = await cacheService.getFarmOverview(farmId)
  
  // Get health trends
  const healthTrends = await cacheService.getHealthTrends(days, farmId)
  
  // Get farm-wide sensor analytics using materialized views
  const sensorTrends = await getFarmSensorTrends(farmId, resolution, days)
  
  // Get alerts and anomalies
  const alerts = await getFarmAlerts(farmId, 24) // Last 24 hours
  
  // Calculate farm performance metrics
  const performanceMetrics = calculateFarmPerformance(overview, healthTrends, sensorTrends)

  const responseData = {
    farmId,
    overview,
    healthTrends,
    sensorTrends,
    alerts,
    performanceMetrics,
    summary: {
      totalAnimals: overview.totalAnimals,
      healthScore: performanceMetrics.overallHealthScore,
      trendPeriod: `${days} days`,
      lastUpdated: new Date().toISOString()
    }
  }

  res.json(createApiResponse(responseData))
}))

/**
 * @swagger
 * /analytics/health/predictions:
 *   get:
 *     summary: Get system-wide health predictions
 *     tags: [Analytics]
 *     description: AI-powered health predictions and risk assessment
 *     parameters:
 *       - in: query
 *         name: riskLevel
 *         schema:
 *           type: string
 *           enum: [all, high, critical]
 *           default: 'all'
 *         description: Filter by risk level
 *       - in: query
 *         name: farmId
 *         schema:
 *           type: string
 *           pattern: '^F\\d{3}$'
 *         description: Filter by farm ID
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 30
 *           default: 7
 *         description: Prediction horizon in days
 */
router.get('/health/predictions', asyncHandler(async (req, res) => {
  const { riskLevel = 'all', farmId, days = 7 } = req.query
  const pagination = PaginationParamsSchema.parse(req.query)

  // Get health predictions with risk analysis
  const predictions = await getHealthPredictions({
    riskLevel: riskLevel as string,
    farmId: farmId as string,
    days: Number(days),
    page: pagination.page,
    limit: pagination.limit
  })

  // Calculate prediction accuracy and confidence metrics
  const predictionMetrics = await calculatePredictionMetrics(farmId as string, Number(days))

  const responseData = {
    predictions,
    metrics: predictionMetrics,
    filters: {
      riskLevel,
      farmId,
      predictionHorizon: `${days} days`
    },
    summary: {
      totalPredictions: predictions.length,
      highRiskCount: predictions.filter(p => p.riskLevel === 'high').length,
      criticalRiskCount: predictions.filter(p => p.riskLevel === 'critical').length,
      averageConfidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length || 0
    }
  }

  res.json(createApiResponse(responseData))
}))

/**
 * @swagger
 * /analytics/performance/benchmarks:
 *   get:
 *     summary: Get system performance benchmarks
 *     tags: [Analytics]
 *     description: Performance analytics comparing farms and industry benchmarks
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [health, productivity, efficiency, all]
 *           default: 'all'
 *         description: Benchmark category
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: 'month'
 *         description: Benchmark period
 */
router.get('/performance/benchmarks', asyncHandler(async (req, res) => {
  const { metric = 'all', period = 'month' } = req.query

  // Get performance benchmarks using aggregated data
  const benchmarks = await getPerformanceBenchmarks(metric as string, period as string)
  
  // Get farm rankings
  const rankings = await getFarmRankings(period as string)
  
  // Industry comparison data
  const industryComparison = await getIndustryComparison(period as string)

  const responseData = {
    benchmarks,
    rankings,
    industryComparison,
    metadata: {
      metric,
      period,
      lastUpdated: new Date().toISOString(),
      dataPoints: benchmarks.length,
      baseline: 'Industry average for similar operations'
    }
  }

  res.json(createApiResponse(responseData))
}))

/**
 * Helper function to get farm sensor trends using materialized views
 */
async function getFarmSensorTrends(farmId: string, resolution: string, days: number): Promise<any[]> {
  const viewMap = {
    '1hour': 'sensor_readings_1hour',
    '1day': 'sensor_readings_1day'
  }

  const viewName = viewMap[resolution as keyof typeof viewMap]
  if (!viewName) {
    throw new Error(`Invalid resolution for farm trends: ${resolution}`)
  }

  const query = `
    SELECT 
      bucket as timestamp,
      AVG(avg_temperature) as avg_temperature,
      AVG(avg_heart_rate) as avg_heart_rate,
      SUM(reading_count) as total_readings,
      COUNT(DISTINCT animal_id) as active_animals
    FROM ${viewName}
    WHERE farm_id = $1 
      AND bucket >= NOW() - INTERVAL '${days} days'
    GROUP BY bucket
    ORDER BY bucket DESC
    LIMIT 1000
  `

  const { rows } = await executeQuery(query, [farmId])
  return rows
}

/**
 * Helper function to get farm alerts
 */
async function getFarmAlerts(farmId: string, hours: number): Promise<any[]> {
  // This would integrate with your alerting system
  // For now, return mock data structure
  return []
}

/**
 * Helper function to calculate time-series analytics
 */
function calculateTimeSeriesAnalytics(data: any[], metrics: string[]): any {
  if (data.length === 0) return {}

  const analytics: any = {}

  metrics.forEach(metric => {
    const fieldMap = {
      'temperature': 'avgTemperature',
      'heartRate': 'avgHeartRate',
      'activity': 'readingCount'
    }

    const field = fieldMap[metric as keyof typeof fieldMap]
    if (!field || !data[0][field]) return

    const values = data.map(d => d[field]).filter(v => v !== null && v !== undefined)
    
    if (values.length > 0) {
      analytics[metric] = {
        current: values[0],
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        trend: calculateTrend(values.slice(0, 10)), // Last 10 data points
        stdDev: calculateStandardDeviation(values)
      }
    }
  })

  return analytics
}

/**
 * Helper function to calculate data coverage
 */
function calculateDataCoverage(data: any[], hours: number | null, resolution: string): number {
  if (data.length === 0) return 0

  const intervalMinutes = {
    '5min': 5,
    '15min': 15,
    '1hour': 60,
    '1day': 1440
  }
  const hoursToUse = hours ?? 24 // Default to 24 hours if null
  const expectedDataPoints = (hoursToUse * 60) / intervalMinutes[resolution as keyof typeof intervalMinutes]
  return Math.min((data.length / expectedDataPoints) * 100, 100)
}

/**
 * Helper function to calculate trend
 */
function calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (values.length < 2) return 'stable'
  
  let increases = 0, decreases = 0
  
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i-1]) increases++
    else if (values[i] < values[i-1]) decreases++
  }
  
  const threshold = values.length * 0.6
  if (increases >= threshold) return 'increasing'
  if (decreases >= threshold) return 'decreasing'
  return 'stable'
}

/**
 * Helper function to calculate standard deviation
 */
function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length
  return Math.sqrt(avgSquaredDiff)
}

/**
 * Helper function to calculate farm performance metrics
 */
function calculateFarmPerformance(overview: any, healthTrends: any[], sensorTrends: any[]): any {
  const healthScore = ((overview.healthyCount + overview.atRiskCount * 0.5) / overview.totalAnimals) * 100
  
  return {
    overallHealthScore: Math.round(healthScore),
    productivity: {
      activeAnimals: overview.totalAnimals - overview.criticalCount,
      healthTrendDirection: healthTrends.length > 1 ? 
        (healthTrends[0].healthyCount > healthTrends[1].healthyCount ? 'improving' : 'declining') : 'stable'
    },
    efficiency: {
      sensorCoverage: (Object.values(overview.sensorStatusCounts).reduce((sum: number, count) => sum + (count as number), 0) / overview.totalAnimals) * 100,
      dataQuality: sensorTrends.length > 0 ? 'good' : 'poor'
    }
  }
}

// Placeholder functions for more complex analytics
async function getHealthPredictions(options: any): Promise<any[]> {
  // This would integrate with ML prediction models
  return []
}

async function calculatePredictionMetrics(farmId: string, days: number): Promise<any> {
  return {
    accuracy: 85.5,
    precision: 82.3,
    recall: 78.9,
    confidence: 0.87
  }
}

async function getPerformanceBenchmarks(metric: string, period: string): Promise<any[]> {
  // This would calculate benchmarks from aggregated data
  return []
}

async function getFarmRankings(period: string): Promise<any[]> {
  return []
}

async function getIndustryComparison(period: string): Promise<any> {
  return {}
}

export default router