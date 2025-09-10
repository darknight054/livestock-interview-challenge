/**
 * Redis Configuration and Connection Management
 * Production-ready caching and rate limiting infrastructure
 */

import {
  createClient,
  type RedisClientType,
  type RedisDefaultModules,
  type RedisFunctions,
  type RedisModules,
  type RedisScripts
} from 'redis'

export type RedisClient = RedisClientType<
  RedisDefaultModules & RedisModules,
  RedisFunctions,
  RedisScripts
>

/** Helpers */
const envInt = (key: string, fallback: number) => {
  const v = parseInt(process.env[key] ?? '')
  return Number.isFinite(v) ? v : fallback
}
const logDev = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') console.log(...args)
}

/** Minimal Redis configuration derived from environment (only what we actually use) */
function getRedisConfig() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: envInt('REDIS_PORT', 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: envInt('REDIS_DB', 0),

    // Connection settings
    connectTimeout: envInt('REDIS_CONNECT_TIMEOUT', 10_000),
    keepAlive: true
  }
}

// Global Redis client instance
let redisClient: RedisClient | null = null

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<RedisClient> {
  if (redisClient) return redisClient
  
  const redisConfig = getRedisConfig()
  
  
  const client = createClient({
    socket: {
      host: redisConfig.host,
      port: redisConfig.port,
      connectTimeout: redisConfig.connectTimeout,
      keepAlive: redisConfig.keepAlive ? 1 : 0
    },
    password: redisConfig.password,
    database: redisConfig.db,
    // Prevent unbounded queue growth during outages
    commandsQueueMaxLength: 1000
  }) as RedisClient

  // Event handlers (dev logs only where appropriate)
  client.on('connect', () => logDev('Redis client connected'))
  client.on('ready', () => logDev('Redis client ready'))
  client.on('reconnecting', () => logDev('Redis client reconnecting...'))
  client.on('end', () => logDev('Redis connection closed'))
  client.on('error', (err) => console.error('Redis client error:', err))

  try {
    await client.connect()
    redisClient = client
    logDev('🚀 Redis initialized and connected')
    return redisClient
  } catch (error) {
    console.error('Failed to connect to Redis:', error)
    throw error
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): RedisClient {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.')
  }
  return redisClient
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (!redisClient) return
  try {
    await redisClient.quit()
    redisClient = null
    logDev('Redis connection closed gracefully')
  } catch (error) {
    console.error('Error closing Redis connection (falling back to disconnect):', error)
    try {
      await redisClient?.disconnect()
    } finally {
      redisClient = null
    }
  }
}

/**
 * Test Redis connectivity
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    if (!redisClient) {
      logDev('Redis client not initialized for testing')
      return false
    }
    const result = await redisClient.ping()
    logDev('Redis ping result:', result)
    return result === 'PONG'
  } catch (error) {
    // Show error details for debugging
    console.error('Redis ping failed:', error)
    return false
  }
}

/**
 * Redis health check
 */
export async function redisHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy'
  details: {
    connected: boolean
    responseTime?: number
    error?: string
  }
}> {
  try {
    const client = getRedisClient()
    const start = Date.now()
    await client.ping()
    const responseTime = Date.now() - start
    return {
      status: 'healthy',
      details: { connected: true, responseTime }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Cache key generator with consistent naming
 */
export class CacheKeyGenerator {
  private static readonly PREFIX = 'livestock'
  private static readonly SEP = ':'

  /** Build a namespaced key from segments */
  private static k(...parts: Array<string | number | undefined>): string {
    return [this.PREFIX, ...parts.filter(Boolean)].join(this.SEP)
  }

  static sensorReading(animalId: string, latest = false): string {
    return this.k('sensor', animalId, latest ? 'latest' : undefined)
  }

  static sensorHistory(animalId: string, hours: number, page: number, limit: number): string {
    return this.k('sensor', animalId, 'history', `${hours}h`, `p${page}`, `l${limit}`)
  }

  static batchSensorReadings(animalIds: string[], hours: number, limitPerAnimal: number): string {
    const sortedIds = [...animalIds].sort().join(',')
    return this.k('sensor', 'batch', sortedIds, `${hours}h`, `l${limitPerAnimal}`)
  }

  static healthPrediction(animalId: string, latest = false): string {
    return this.k('health', animalId, latest ? 'latest' : undefined)
  }

  static animal(animalId: string): string {
    return this.k('animal', animalId)
  }

  static animals(page: number, limit: number, farmId?: string, healthStatus?: string): string {
    return this.k(
      'animals',
      `p${page}`,
      `l${limit}`,
      farmId ? `f${farmId}` : undefined,
      healthStatus ? `h${healthStatus}` : undefined
    )
  }

  static farmOverview(farmId?: string): string {
    return farmId ? this.k('farm', farmId, 'overview') : this.k('overview')
  }

  static healthTrends(days: number, farmId?: string): string {
    return this.k('trends', `${days}d`, farmId ? `f${farmId}` : undefined)
  }

  static aggregatedSensorData(animalId: string, resolution: string, hours?: number): string {
    return this.k('agg', animalId, resolution, hours ? `${hours}h` : undefined)
  }

  static rateLimitKey(identifier: string, window: string): string {
    return this.k('ratelimit', window, identifier)
  }
}

/**
 * Default cache TTL values (in seconds)
 */
export const CacheTTL = {
  SENSOR_LATEST: 60,      // 1 minute for latest readings
  SENSOR_HISTORY: 300,    // 5 minutes for historical data
  HEALTH_LATEST: 300,     // 5 minutes for health predictions
  HEALTH_HISTORY: 600,    // 10 minutes for health history
  ANIMALS_LIST: 600,      // 10 minutes for animals list
  FARM_OVERVIEW: 300,     // 5 minutes for farm overview
  HEALTH_TRENDS: 1800,    // 30 minutes for trends
  AGGREGATED_DATA: 900,   // 15 minutes for aggregated data
  BATCH_READINGS: 180     // 3 minutes for batch sensor readings
} as const
