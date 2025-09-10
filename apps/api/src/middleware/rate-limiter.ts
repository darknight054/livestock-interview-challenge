// /**
//  * Production Redis-based Rate Limiting Middleware (simple & optimized)
//  *
//  * - Sliding window with Redis ZSET (no Lua)
//  * - Single round-trip via MULTI/EXEC
//  * - Per-endpoint + principal (IP/user) keys
//  * - Standards headers (RateLimit-*) + legacy headers
//  * - Graceful in-memory fallback with short cooldown
//  */

// import type { Request, Response, NextFunction } from 'express'
// import { getRedisClient, CacheKeyGenerator } from '@/config/redis'
// import { createCustomError } from '@/middleware/error-handler'
// import { HTTP_STATUS, ERROR_CODES } from '@livestock/shared'

// export interface RateLimitConfig {
//   windowMs: number
//   maxRequests: number
//   keyGenerator?: (req: Request) => string
//   message?: string
//   standardHeaders?: boolean   // RateLimit-Limit/Remaining/Reset
//   legacyHeaders?: boolean     // X-RateLimit-*
//   onLimitReached?: (req: Request, res: Response) => void
//   fallbackCooldownMs?: number // how long to stay in memory fallback after a Redis error
// }

// export interface RateLimitTier {
//   name: string
//   requests: number
//   window: number
// }

// // Pre-defined tiers (removed unused dailyLimit)
// export const RateLimitTiers: Record<string, RateLimitTier> = {
//   FREE:       { name: 'Free',       requests: 100,   window: 60_000 },
//   PREMIUM:    { name: 'Premium',    requests: 500,   window: 60_000 },
//   ENTERPRISE: { name: 'Enterprise', requests: 2_000, window: 60_000 },
//   INTERNAL:   { name: 'Internal',   requests: 10_000,window: 60_000 }
// } as const

// type CheckResult = {
//   exceeded: boolean
//   count: number
//   remaining: number
//   resetSeconds: number   // seconds until window resets (coarse but simple)
//   retryAfter: number
// }

// class RateLimiter {
//   private config: Required<Omit<RateLimitConfig, 'onLimitReached'>> & Pick<RateLimitConfig, 'onLimitReached'>
//   private fallbackUntil = 0
//   private memoryStore = new Map<string, { count: number; resetAt: number }>()

//   constructor(config: RateLimitConfig) {
//     this.config = {
//       keyGenerator: this.defaultKeyGenerator,
//       message: 'Too many requests',
//       standardHeaders: true,
//       legacyHeaders: true,
//       fallbackCooldownMs: 30_000,
//       ...config
//     }
//   }

//   private defaultKeyGenerator(req: Request): string {
//     // Prefer authenticated principal when available
//     // @ts-ignore adjust if your app attaches user info differently
//     return req.user?.id || req.ip || (req.connection as any)?.remoteAddress || 'unknown'
//   }

//   middleware() {
//     return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//       try {
//         const principal = this.config.keyGenerator!(req)
//         const endpoint = req.route?.path || req.path
//         const identifier = `${endpoint}:${principal}`

//         const result = await this.checkRateLimit(identifier)

//         this.setHeaders(res, result)

//         if (result.exceeded) {
//           this.config.onLimitReached?.(req, res)
//           const error = createCustomError(
//             this.config.message || 'Rate limit exceeded',
//             HTTP_STATUS.TOO_MANY_REQUESTS,
//             ERROR_CODES.RATE_LIMIT_EXCEEDED
//           )
//           res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
//             success: false,
//             error: {
//               code: error.code,
//               message: error.message,
//               details: {
//                 retryAfter: result.retryAfter,
//                 limit: this.config.maxRequests,
//                 window: this.config.windowMs
//               }
//             },
//             timestamp: new Date().toISOString()
//           })
//           return
//         }

//         next()
//       } catch (err) {
//         // Fail-open on limiter errors
//         // eslint-disable-next-line no-console
//         console.error('Rate limiter error:', err)
//         next()
//       }
//     }
//   }

//   private async checkRateLimit(identifier: string): Promise<CheckResult> {
//     const now = Date.now()
//     if (now < this.fallbackUntil) return this.memoryRateLimit(identifier)

//     try {
//       return await this.redisRateLimit(identifier)
//     } catch (e) {
//       // eslint-disable-next-line no-console
//       console.log(e)
//       console.warn('Redis rate limit failed, falling back to memory:', e)
//       this.fallbackUntil = now + this.config.fallbackCooldownMs
//       return this.memoryRateLimit(identifier)
//     }
//   }

//   /**
//    * Redis sliding window in a single MULTI/EXEC:
//    * 1) remove expired, 2) add current, 3) count, 4) set TTL
//    * (Reset seconds reported as full window for simplicity.)
//    */
//   private async redisRateLimit(identifier: string): Promise<CheckResult> {
//     const redis = getRedisClient()
//     const now = Date.now()
//     const window = this.config.windowMs
//     const key = CacheKeyGenerator.rateLimitKey(identifier, `${window}ms`)
//     const member = `${now}-${Math.random().toString(36).slice(2)}`

//     const pipeline = redis.multi()
//     pipeline.zRemRangeByScore(key, 0, now - window)
//     // zAdd after trimming so count includes this member accurately
//     // @ts-ignore node-redis accepts single object or array
//     pipeline.zAdd(key, { score: now, value: member })
//     pipeline.zCard(key)
//     pipeline.expire(key, Math.ceil(window / 1000))
//     const results = await pipeline.exec()

//     if (!results) throw new Error('Redis pipeline failed')

//     const count = Number(results[2]) || 0
//     const exceeded = count > this.config.maxRequests
//     const remaining = Math.max(0, this.config.maxRequests - count)
//     const resetSeconds = Math.ceil(window / 1000)
//     const retryAfter = exceeded ? resetSeconds : 0

//     return { exceeded, count, remaining, resetSeconds, retryAfter }
//   }

//   /** Simple fixed-window memory fallback */
//   private memoryRateLimit(identifier: string): CheckResult {
//     const now = Date.now()
//     const window = this.config.windowMs
//     const resetAt = Math.ceil(now / window) * window

//     const rec = this.memoryStore.get(identifier)
//     if (!rec || rec.resetAt <= now) {
//       this.memoryStore.set(identifier, { count: 1, resetAt })
//       this.gcMemory()
//       return {
//         exceeded: false,
//         count: 1,
//         remaining: this.config.maxRequests - 1,
//         resetSeconds: Math.ceil((resetAt - now) / 1000),
//         retryAfter: 0
//       }
//     }

//     rec.count++
//     const exceeded = rec.count > this.config.maxRequests
//     const remaining = Math.max(0, this.config.maxRequests - rec.count)
//     const resetSeconds = Math.ceil((rec.resetAt - now) / 1000)

//     return { exceeded, count: rec.count, remaining, resetSeconds, retryAfter: exceeded ? resetSeconds : 0 }
//   }

//   private gcMemory(): void {
//     const now = Date.now()
//     for (const [k, v] of this.memoryStore) {
//       if (v.resetAt <= now) this.memoryStore.delete(k)
//     }
//   }

//   private setHeaders(res: Response, r: CheckResult): void {

//       // RFC-ish: Reset is SECONDS until reset (integer)
//       res.setHeader('RateLimit-Limit', this.config.maxRequests.toString())
//       res.setHeader('RateLimit-Remaining', Math.max(0, r.remaining).toString())
//       res.setHeader('RateLimit-Reset', Math.max(0, r.resetSeconds).toString())

//     if (r.retryAfter > 0) {
//       res.setHeader('Retry-After', Math.max(1, r.retryAfter).toString())
//     }
//   }
// }

// /** Factory from tier or explicit config */
// export function createRateLimiter(tier: keyof typeof RateLimitTiers | RateLimitConfig): RateLimiter {
//   if (typeof tier === 'string') {
//     const t = RateLimitTiers[tier]
//     if (!t) throw new Error(`Unknown rate limit tier: ${tier}`)
//     return new RateLimiter({
//       windowMs: t.window,
//       maxRequests: t.requests,
//       message: `Rate limit exceeded for ${t.name} tier`
//     })
//   }
//   return new RateLimiter(tier)
// }

// /** Pre-configured limiters */
// export const CommonRateLimiters = {
//   api: createRateLimiter('FREE'),
//   sensors: createRateLimiter({ windowMs: 60_000, maxRequests: 200, message: 'Sensor API rate limit exceeded' }),
//   analytics: createRateLimiter({ windowMs: 60_000, maxRequests: 50,  message: 'Analytics API rate limit exceeded' }),
//   auth: createRateLimiter({ windowMs: 15 * 60_000, maxRequests: 5,  message: 'Too many authentication attempts' }),
//   health: createRateLimiter({ windowMs: 60_000, maxRequests: 1000,   message: 'Health check rate limit exceeded' })
// } as const

// /** Endpoint->tier mapping */
// export function rateLimitByEndpoint(limits: Record<string, keyof typeof RateLimitTiers>) {
//   const limiters = new Map<string, RateLimiter>()
//   for (const [endpoint, tier] of Object.entries(limits)) {
//     limiters.set(endpoint, createRateLimiter(tier))
//   }
//   return (req: Request, res: Response, next: NextFunction) => {
//     const endpoint = req.route?.path || req.path
//     const limiter = limiters.get(endpoint)
//     if (limiter) return limiter.middleware()(req, res, next)
//     next()
//   }
// }

// /** Global/user-tier limiter */
// export function globalRateLimit(getTier: (req: Request) => keyof typeof RateLimitTiers = () => 'FREE') {
//   const byTier = new Map<string, RateLimiter>()
//   return (req: Request, res: Response, next: NextFunction) => {
//     const tier = getTier(req)
//     if (!byTier.has(tier)) byTier.set(tier, createRateLimiter(tier))
//     return byTier.get(tier)!.middleware()(req, res, next)
//   }
// }

// export default RateLimiter
/**
 * Production Redis-based Rate Limiting Middleware (simple & optimized)
 *
 * - Sliding window with Redis ZSET (no Lua)
 * - Single round-trip via MULTI/EXEC
 * - Per-endpoint + principal (IP/user) keys
 * - Standards headers (RateLimit-*) + optional legacy headers
 * - No local fallback — fail-open on Redis error
 */

import type { Request, Response, NextFunction } from 'express'
import { getRedisClient, CacheKeyGenerator } from '@/config/redis'
import { createCustomError } from '@/middleware/error-handler'
import { HTTP_STATUS, ERROR_CODES } from '@livestock/shared'

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (req: Request) => string
  message?: string
  standardHeaders?: boolean   // RateLimit-Limit/Remaining/Reset
  legacyHeaders?: boolean     // X-RateLimit-*
  onLimitReached?: (req: Request, res: Response) => void
}

export interface RateLimitTier {
  name: string
  requests: number
  window: number
}

export const RateLimitTiers: Record<string, RateLimitTier> = {
  FREE:       { name: 'Free',       requests: 100,    window: 60_000 },
  PREMIUM:    { name: 'Premium',    requests: 500,    window: 60_000 },
  ENTERPRISE: { name: 'Enterprise', requests: 2_000,  window: 60_000 },
  INTERNAL:   { name: 'Internal',   requests: 10_000, window: 60_000 }
} as const

type CheckResult = {
  exceeded: boolean
  count: number
  remaining: number
  resetSeconds: number   // seconds until window resets (coarse but simple)
  retryAfter: number
}

class RateLimiter {
  private config: Required<Omit<RateLimitConfig, 'onLimitReached'>> & Pick<RateLimitConfig, 'onLimitReached'>

  constructor(config: RateLimitConfig) {
    this.config = {
      keyGenerator: this.defaultKeyGenerator,
      message: 'Too many requests',
      standardHeaders: true,
      legacyHeaders: true,
      ...config
    }
  }

  private defaultKeyGenerator(req: Request): string {
    // Prefer authenticated principal when available
    // @ts-ignore adjust if your app attaches user info differently
    return req.user?.id || req.ip || (req.connection as any)?.remoteAddress || 'unknown'
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const principal = this.config.keyGenerator!(req)
        const endpoint = req.route?.path || req.path
        const identifier = `${endpoint}:${principal}`

        const result = await this.checkRateLimit(identifier)

        this.setHeaders(res, result)

        if (result.exceeded) {
          this.config.onLimitReached?.(req, res)
          const error = createCustomError(
            this.config.message || 'Rate limit exceeded',
            HTTP_STATUS.TOO_MANY_REQUESTS,
            ERROR_CODES.RATE_LIMIT_EXCEEDED
          )
          res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: {
                retryAfter: result.retryAfter,
                limit: this.config.maxRequests,
                window: this.config.windowMs
              }
            },
            timestamp: new Date().toISOString()
          })
          return
        }

        next()
      } catch (err) {
        // Fail-open on limiter errors (no fallback)
        // eslint-disable-next-line no-console
        console.error('Rate limiter error:', err)
        next()
      }
    }
  }

  private async checkRateLimit(identifier: string): Promise<CheckResult> {
    // Only Redis path; any error is caught by middleware and we fail-open
    return this.redisRateLimit(identifier)
  }

  /**
   * Redis sliding window in a single MULTI/EXEC:
   * 1) remove expired, 2) add current, 3) count, 4) set TTL
   * (Reset seconds reported as full window for simplicity.)
   */
  private async redisRateLimit(identifier: string): Promise<CheckResult> {
    const redis = getRedisClient()
    const now = Date.now()
    const window = this.config.windowMs
    const key = CacheKeyGenerator.rateLimitKey(identifier, `${window}ms`)
    const member = `${now}-${Math.random().toString(36).slice(2)}`

    const pipeline = redis.multi()
    pipeline.zRemRangeByScore(key, 0, now - window)
    // zAdd after trimming so count includes this member accurately
    // @ts-ignore node-redis accepts single object or array
    pipeline.zAdd(key, { score: now, value: member })
    pipeline.zCard(key)
    pipeline.expire(key, Math.ceil(window / 1000))
    const results = await pipeline.exec()

    if (!results) throw new Error('Redis pipeline failed')

    const count = Number(results[2]) || 0
    const exceeded = count > this.config.maxRequests
    const remaining = Math.max(0, this.config.maxRequests - count)
    const resetSeconds = Math.ceil(window / 1000)
    const retryAfter = exceeded ? resetSeconds : 0

    return { exceeded, count, remaining, resetSeconds, retryAfter }
  }

  private setHeaders(res: Response, r: CheckResult): void {
    if (this.config.standardHeaders) {
      // RFC-ish: Reset is SECONDS until reset (integer)
      res.setHeader('RateLimit-Limit', this.config.maxRequests.toString())
      res.setHeader('RateLimit-Remaining', Math.max(0, r.remaining).toString())
      res.setHeader('RateLimit-Reset', Math.max(0, r.resetSeconds).toString())
    }

    if (r.retryAfter > 0) {
      res.setHeader('Retry-After', Math.max(1, r.retryAfter).toString())
    }
  }
}

/** Factory from tier or explicit config */
export function createRateLimiter(tier: keyof typeof RateLimitTiers | RateLimitConfig): RateLimiter {
  if (typeof tier === 'string') {
    const t = RateLimitTiers[tier]
    if (!t) throw new Error(`Unknown rate limit tier: ${tier}`)
    return new RateLimiter({
      windowMs: t.window,
      maxRequests: t.requests,
      message: `Rate limit exceeded for ${t.name} tier`
    })
  }
  return new RateLimiter(tier)
}

/** Pre-configured limiters */
export const CommonRateLimiters = {
  api: createRateLimiter('FREE'),
  sensors: createRateLimiter({ windowMs: 60_000, maxRequests: 200, message: 'Sensor API rate limit exceeded' }),
  analytics: createRateLimiter({ windowMs: 60_000, maxRequests: 50,  message: 'Analytics API rate limit exceeded' }),
  auth: createRateLimiter({ windowMs: 15 * 60_000, maxRequests: 5,  message: 'Too many authentication attempts' }),
  health: createRateLimiter({ windowMs: 60_000, maxRequests: 1000,   message: 'Health check rate limit exceeded' })
} as const

/** Endpoint->tier mapping */
export function rateLimitByEndpoint(limits: Record<string, keyof typeof RateLimitTiers>) {
  const limiters = new Map<string, RateLimiter>()
  for (const [endpoint, tier] of Object.entries(limits)) {
    limiters.set(endpoint, createRateLimiter(tier))
  }
  return (req: Request, res: Response, next: NextFunction) => {
    const endpoint = req.route?.path || req.path
    const limiter = limiters.get(endpoint)
    if (limiter) return limiter.middleware()(req, res, next)
    next()
  }
}

/** Global/user-tier limiter */
export function globalRateLimit(getTier: (req: Request) => keyof typeof RateLimitTiers = () => 'FREE') {
  const byTier = new Map<string, RateLimiter>()
  return (req: Request, res: Response, next: NextFunction) => {
    const tier = getTier(req)
    if (!byTier.has(tier)) byTier.set(tier, createRateLimiter(tier))
    return byTier.get(tier)!.middleware()(req, res, next)
  }
}

export default RateLimiter
