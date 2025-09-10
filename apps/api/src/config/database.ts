/**
 * Database configuration and connection management for PostgreSQL with TimescaleDB
 * Optimized for production performance with connection pooling
 */

import { Pool, type PoolClient, type PoolConfig } from 'pg'

// Database configuration from environment variables
export const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'livestock_monitoring',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  
  // Connection pooling for production performance
  max: parseInt(process.env.DB_POOL_SIZE || '20'), // Maximum connections in pool
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // 10 seconds
  
  // Production SSL configuration
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Adjust based on your SSL certificate setup
  } : false,
  
  // Query timeout for long-running queries
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'), // 30 seconds
  
  // Connection keep-alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
}

// Global connection pool instance
let pool: Pool | null = null

/**
 * Initialize database connection pool
 */
export function initializeDatabase(): Pool {
  if (!pool) {
    pool = new Pool(dbConfig)
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err)
    })
    
    // Log successful connections in development
    if (process.env.NODE_ENV === 'development') {
      pool.on('connect', (client: PoolClient) => {
        console.log('Database client connected')
      })
      
      pool.on('acquire', () => {
        console.log('Database client acquired from pool')
      })
      
      pool.on('remove', () => {
        console.log('Database client removed from pool')
      })
    }
  }
  
  return pool
}

/**
 * Get database connection pool instance
 */
export function getDatabase(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.')
  }
  return pool
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    console.log('Database connection pool closed')
  }
}

/**
 * Test database connectivity
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const db = getDatabase()
    const result = await db.query('SELECT NOW() as current_time, version() as pg_version')
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Database connection successful:', {
        timestamp: result.rows[0].current_time,
        version: result.rows[0].pg_version.split(' ')[0]
      })
    }
    
    return true
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}

/**
 * Execute a database query with error handling and logging
 */
export async function executeQuery<T = any>(
  text: string, 
  params?: any[], 
  logQuery: boolean = false
): Promise<{ rows: T[], rowCount: number }> {
  const db = getDatabase()
  const start = Date.now()
  
  try {
    if (logQuery && process.env.NODE_ENV === 'development') {
      console.log('Executing query:', text, 'Params:', params)
    }
    
    const result = await db.query(text, params)
    const duration = Date.now() - start
    
    if (duration > 1000 && process.env.NODE_ENV === 'development') {
      console.warn(`Slow query detected (${duration}ms):`, text)
    }
    
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0
    }
  } catch (error) {
    const duration = Date.now() - start
    console.error('Database query error:', {
      query: text,
      params,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : error
    })
    throw error
  }
}

/**
 * Execute a transaction with multiple queries
 */
export async function executeTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const db = getDatabase()
  const client = await db.connect()
  
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Health check for database connectivity
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy'
  details: {
    connected: boolean
    poolSize: number
    idleConnections: number
    waitingConnections: number
    responseTime?: number
  }
}> {
  try {
    const db = getDatabase()
    const start = Date.now()
    
    await db.query('SELECT 1')
    const responseTime = Date.now() - start
    
    return {
      status: 'healthy',
      details: {
        connected: true,
        poolSize: db.totalCount,
        idleConnections: db.idleCount,
        waitingConnections: db.waitingCount,
        responseTime
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        connected: false,
        poolSize: pool?.totalCount || 0,
        idleConnections: pool?.idleCount || 0,
        waitingConnections: pool?.waitingCount || 0
      }
    }
  }
}