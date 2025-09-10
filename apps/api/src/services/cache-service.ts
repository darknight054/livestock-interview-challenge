/**
 * Production Redis Caching Service
 * 
 * Intelligent caching layer that dramatically improves API response times:
 * - Cache-aside pattern with automatic cache invalidation
 * - Intelligent cache warming for frequently accessed data
 * - Circuit breaker pattern for cache failures
 * - Compression for large payloads
 * - Cache statistics and monitoring
 */

import { getRedisClient, CacheKeyGenerator, CacheTTL } from '@/config/redis'
import { databaseService, type DatabaseSensorReading, type DatabaseHealthLabel } from '@/services/database-service'
import type { 
  Animal, 
  PaginatedResponse, 
  PaginationParams, 
  FarmOverview, 
  HealthTrend 
} from '@livestock/types'

interface CacheStats {
  hits: number
  misses: number
  errors: number
  totalRequests: number
}

class CacheService {
  private stats: CacheStats = { hits: 0, misses: 0, errors: 0, totalRequests: 0 }
  private circuitBreaker = { failures: 0, lastFailure: 0, isOpen: false }
  private readonly maxFailures = 5
  private readonly resetTimeout = 30000 // 30 seconds

  /**
   * Generic cache get/set with fallback to database
   */
  private async cacheGetOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CacheTTL.SENSOR_HISTORY,
    compress: boolean = false
  ): Promise<T> {
    this.stats.totalRequests++

    try {
      // Check circuit breaker
      if (this.isCircuitOpen()) {
        console.log(`Cache circuit breaker open, bypassing cache for key: ${key}`)
        return await fetcher()
      }

      const redis = getRedisClient()
      const cached = await redis.get(key)
      
      if (cached) {
        this.stats.hits++
        const data = compress ? this.decompress(cached) : cached
        return JSON.parse(data)
      }

      // Cache miss - fetch from database
      this.stats.misses++
      const data = await fetcher()
      
      // Store in cache
      const serialized = JSON.stringify(data)
      const toStore = compress ? this.compress(serialized) : serialized
      
      // Set with TTL (fire and forget to avoid blocking)
      redis.setEx(key, ttl, toStore).catch(err => {
        console.warn(`Failed to cache data for key ${key}:`, err)
        this.recordFailure()
      })
      
      this.resetCircuitBreaker()
      return data

    } catch (error) {
      this.stats.errors++
      this.recordFailure()
      console.error(`Cache error for key ${key}:`, error)
      
      // Fallback to database on cache failure
      return await fetcher()
    }
  }

  /**
   * Circuit breaker implementation
   */
  private isCircuitOpen(): boolean {
    if (!this.circuitBreaker.isOpen) return false
    
    const now = Date.now()
    if (now - this.circuitBreaker.lastFailure > this.resetTimeout) {
      this.circuitBreaker.isOpen = false
      this.circuitBreaker.failures = 0
      console.log('Cache circuit breaker reset')
    }
    
    return this.circuitBreaker.isOpen
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++
    this.circuitBreaker.lastFailure = Date.now()
    
    if (this.circuitBreaker.failures >= this.maxFailures) {
      this.circuitBreaker.isOpen = true
      console.warn('Cache circuit breaker opened due to failures')
    }
  }

  private resetCircuitBreaker(): void {
    if (this.circuitBreaker.failures > 0) {
      this.circuitBreaker.failures = 0
    }
  }

  /**
   * Simple compression for large payloads (Base64 encoded)
   */
  private compress(data: string): string {
    // Simple compression - in production, consider using gzip
    return Buffer.from(data).toString('base64')
  }

  private decompress(data: string): string {
    return Buffer.from(data, 'base64').toString()
  }

  /**
   * Get latest sensor reading with caching
   */
  async getLatestSensorReading(animalId: string): Promise<DatabaseSensorReading | null> {
    const key = CacheKeyGenerator.sensorReading(animalId, true)
    
    return this.cacheGetOrSet(
      key,
      () => databaseService.getLatestSensorReading(animalId),
      CacheTTL.SENSOR_LATEST
    )
  }

  /**
   * Get sensor readings history with intelligent caching
   */
  async getSensorReadings(
    animalId: string,
    options: { startTime?: Date; endTime?: Date; limit?: number; hours?: number; offset?: number } = {}
  ): Promise<DatabaseSensorReading[]> {
    const { hours = 24, limit = 100, offset = 0 } = options
    const page = Math.floor(offset / limit) + 1
    
    const key = CacheKeyGenerator.sensorHistory(animalId, hours, page, limit)
    
    return this.cacheGetOrSet(
      key,
      () => databaseService.getSensorReadings(animalId, options),
      CacheTTL.SENSOR_HISTORY,
      true // Compress large historical data
    )
  }

  /**
   * Get batch sensor readings with optimized caching
   */
  async getBatchSensorReadings(
    animalIds: string[],
    options: { limitPerAnimal?: number; startTime?: Date; endTime?: Date; hours?: number } = {}
  ): Promise<Record<string, DatabaseSensorReading[]>> {
    const { hours = 24, limitPerAnimal = 50 } = options
    
    const key = CacheKeyGenerator.batchSensorReadings(animalIds, hours, limitPerAnimal)
    
    return this.cacheGetOrSet(
      key,
      () => databaseService.getBatchSensorReadings(animalIds, options),
      CacheTTL.BATCH_READINGS,
      true // Compress batch data
    )
  }

  /**
   * Get aggregated sensor data with long-term caching
   */
  async getAggregatedSensorData(
    animalId: string,
    options: { resolution: '5min' | '15min' | '1hour' | '1day'; startTime?: Date; endTime?: Date; limit?: number; hours?: number }
  ): Promise<any[]> {
    const { resolution, limit = 100, hours } = options
    
    const key = CacheKeyGenerator.aggregatedSensorData(animalId, resolution, hours)
    
    const result = await this.cacheGetOrSet(
      key,
      () => databaseService.getAggregatedSensorData(animalId, options),
      CacheTTL.AGGREGATED_DATA,
      true
    )
    
    return result
  }

  /**
   * Get latest health prediction with caching
   */
  async getLatestHealthPrediction(animalId: string): Promise<DatabaseHealthLabel | null> {
    const key = CacheKeyGenerator.healthPrediction(animalId, true)
    
    return this.cacheGetOrSet(
      key,
      () => databaseService.getLatestHealthPrediction(animalId),
      CacheTTL.HEALTH_LATEST
    )
  }

  /**
   * Get health labels with caching
   */
  async getHealthLabels(
    animalId: string,
    options: { limit?: number; startTime?: Date; endTime?: Date } = {}
  ): Promise<DatabaseHealthLabel[]> {
    const { limit = 100 } = options
    const key = `${CacheKeyGenerator.healthPrediction(animalId)}_history_${limit}`
    
    return this.cacheGetOrSet(
      key,
      () => databaseService.getHealthLabels(animalId, options),
      CacheTTL.HEALTH_HISTORY
    )
  }

  /**
   * Get animals with smart caching and cache warming
   */
  async getAnimals(
    options: PaginationParams & { farmId?: string; healthStatus?: string } = {}
  ): Promise<PaginatedResponse<Animal>> {
    const { page = 1, limit = 20, farmId, healthStatus } = options
    
    const key = CacheKeyGenerator.animals(page, limit, farmId, healthStatus)
    
    const result = await this.cacheGetOrSet(
      key,
      () => databaseService.getAnimals(options),
      CacheTTL.ANIMALS_LIST
    )

    // Cache warming: Pre-load next page if this is page 1 and there are more pages
    if (page === 1 && result.pagination.pages > 1) {
      this.warmCache(() => this.getAnimals({ ...options, page: 2 }))
    }

    return result
  }

  /**
   * Get farm overview with caching
   */
  async getFarmOverview(farmId?: string): Promise<FarmOverview> {
    const key = CacheKeyGenerator.farmOverview(farmId)
    
    return this.cacheGetOrSet(
      key,
      () => databaseService.getFarmOverview(farmId),
      CacheTTL.FARM_OVERVIEW
    )
  }

  /**
   * Get health trends with long-term caching
   */
  async getHealthTrends(days: number = 30, farmId?: string): Promise<HealthTrend[]> {
    const key = CacheKeyGenerator.healthTrends(days, farmId)
    
    return this.cacheGetOrSet(
      key,
      () => databaseService.getHealthTrends(days, farmId),
      CacheTTL.HEALTH_TRENDS
    )
  }

  /**
   * Get animal list with caching
   */
  async getAnimalList(limit: number = 100, offset: number = 0): Promise<string[]> {
    const page = Math.floor(offset / limit) + 1
    const key = `livestock:animals:list:p${page}:l${limit}`
    
    return this.cacheGetOrSet(
      key,
      () => databaseService.getAnimalList(limit, offset),
      CacheTTL.ANIMALS_LIST
    )
  }

  /**
   * Cache warming for frequently accessed data
   */
  private warmCache(fetcher: () => Promise<any>): void {
    // Run cache warming in background (fire and forget)
    setImmediate(async () => {
      try {
        await fetcher()
      } catch (error) {
        // Ignore cache warming errors
      }
    })
  }

  /**
   * Invalidate cache patterns
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const redis = getRedisClient()
      const keys = await redis.keys(pattern)
      
      if (keys.length > 0) {
        await redis.del(keys)
        console.log(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`)
      }
    } catch (error) {
      console.error(`Failed to invalidate cache pattern ${pattern}:`, error)
    }
  }

  /**
   * Invalidate specific cache entries when data changes
   */
  async invalidateAnimalCache(animalId: string): Promise<void> {
    const patterns = [
      `livestock:sensor:${animalId}*`,
      `livestock:health:${animalId}*`,
      `livestock:animal:${animalId}`,
      `livestock:animals:*`, // Invalidate all animals list caches
      `livestock:overview*`, // Invalidate overview caches
      `livestock:trends:*`   // Invalidate trend caches
    ]

    await Promise.all(patterns.map(pattern => this.invalidatePattern(pattern)))
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): CacheStats & { hitRate: number; circuitBreakerStatus: string } {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      circuitBreakerStatus: this.circuitBreaker.isOpen ? 'OPEN' : 'CLOSED'
    }
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, errors: 0, totalRequests: 0 }
  }

  /**
   * Flush all cache data (use with caution)
   */
  async flushAll(): Promise<void> {
    try {
      const redis = getRedisClient()
      await redis.flushDb()
      console.log('All cache data flushed')
    } catch (error) {
      console.error('Failed to flush cache:', error)
      throw error
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService()
export default cacheService