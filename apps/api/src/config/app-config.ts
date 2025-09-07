export const config = {
  // Server configuration
  PORT: Number(process.env.PORT) || 3001,
  
  // CORS configuration - allow local development
  CORS_ORIGINS: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:5173'] as string[],
  
  // Enable Swagger documentation
  ENABLE_SWAGGER: true,
  
  // Basic rate limiting (candidates will implement more sophisticated version)
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
} as const

export type Config = typeof config