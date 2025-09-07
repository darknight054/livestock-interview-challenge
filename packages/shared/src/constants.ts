// Application constants
export const APP_CONFIG = {
  API_VERSION: 'v1',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  REQUEST_TIMEOUT: 30000, // 30 seconds
  CACHE_TTL: 300000, // 5 minutes
} as const

// Health monitoring thresholds
export const HEALTH_THRESHOLDS = {
  TEMPERATURE: {
    NORMAL_MIN: 38.0,
    NORMAL_MAX: 39.5,
    FEVER_THRESHOLD: 40.0,
    HYPOTHERMIA_THRESHOLD: 37.5,
    CRITICAL_HIGH: 41.5,
    CRITICAL_LOW: 36.0
  },
  HEART_RATE: {
    NORMAL_MIN: 60,
    NORMAL_MAX: 120,
    ELEVATED_THRESHOLD: 140,
    LOW_THRESHOLD: 50,
    CRITICAL_HIGH: 180,
    CRITICAL_LOW: 40
  },
  ACTIVITY: {
    LOW_ACTIVITY_THRESHOLD: 0.1,
    HIGH_ACTIVITY_THRESHOLD: 1.5,
    MOVEMENT_VARIANCE_THRESHOLD: 0.05
  }
} as const

// Disease probability thresholds
export const DISEASE_THRESHOLDS = {
  HIGH_RISK: 0.7,
  MEDIUM_RISK: 0.4,
  LOW_RISK: 0.2,
  CONFIDENCE_THRESHOLD: 0.6
} as const

// Financial risk parameters
export const FINANCIAL_PARAMETERS = {
  ANIMAL_BASE_VALUE: 1500, // USD
  DAILY_MILK_VALUE: 25, // USD
  TREATMENT_COSTS: {
    mastitis: 250,
    lameness: 400,
    respiratory: 350,
    digestive: 200,
    reproductive: 500,
    metabolic: 300
  },
  INSURANCE_BASE_RATE: 0.03, // 3% of animal value
  MARKET_IMPACT_FACTORS: {
    healthy: 1.0,
    at_risk: 0.95,
    sick: 0.85,
    critical: 0.70
  }
} as const

// Sensor data parameters
export const SENSOR_PARAMETERS = {
  SAMPLING_INTERVAL_MINUTES: 15,
  BATTERY_LOW_THRESHOLD: 20, // percentage
  SIGNAL_STRENGTH_MIN: -90, // dBm
  GPS_ACCURACY_THRESHOLD: 5, // meters
  ACCELEROMETER_RANGE: 2, // ±2g
  TEMPERATURE_ACCURACY: 0.1, // °C
  HEART_RATE_ACCURACY: 1 // BPM
} as const

// Alert configuration
export const ALERT_CONFIG = {
  MAX_ALERTS_PER_ANIMAL: 10,
  ALERT_RETENTION_DAYS: 30,
  ESCALATION_INTERVALS: {
    low: 24 * 60 * 60 * 1000, // 24 hours in ms
    medium: 12 * 60 * 60 * 1000, // 12 hours in ms
    high: 4 * 60 * 60 * 1000, // 4 hours in ms
    critical: 1 * 60 * 60 * 1000 // 1 hour in ms
  }
} as const

// Data quality parameters
export const DATA_QUALITY = {
  MIN_READINGS_PER_HOUR: 3,
  MAX_MISSING_PERCENTAGE: 15, // 15% missing data acceptable
  OUTLIER_DETECTION_THRESHOLD: 3, // standard deviations
  DATA_RETENTION_DAYS: 365 * 2 // 2 years
} as const

// API error codes
export const ERROR_CODES = {
  // Client errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  ANIMAL_NOT_FOUND: 'ANIMAL_NOT_FOUND',
  FARM_NOT_FOUND: 'FARM_NOT_FOUND',
  INVALID_ANIMAL_ID: 'INVALID_ANIMAL_ID',
  INVALID_FARM_ID: 'INVALID_FARM_ID',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  DUPLICATE_READING: 'DUPLICATE_READING',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  
  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  ML_SERVICE_ERROR: 'ML_SERVICE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR'
} as const

// Farm locations (for demo data)
export const DEMO_FARM_LOCATIONS = {
  F001: { latitude: 40.7128, longitude: -74.0060, name: 'Green Valley Farm' },
  F002: { latitude: 41.8781, longitude: -87.6298, name: 'Prairie Wind Farm' },
  F003: { latitude: 39.7392, longitude: -104.9903, name: 'Rocky Mountain Ranch' },
  F004: { latitude: 47.6062, longitude: -122.3321, name: 'Pacific Northwest Farm' },
  F005: { latitude: 30.2672, longitude: -97.7431, name: 'Lone Star Ranch' }
} as const

// Animal breeds (for demo data)
export const CATTLE_BREEDS = [
  'Holstein',
  'Angus',
  'Hereford',
  'Jersey',
  'Simmental',
  'Charolais',
  'Limousin',
  'Brahman',
  'Texas Longhorn',
  'Highland'
] as const

// Time windows for analysis
export const TIME_WINDOWS = {
  REAL_TIME: '5m',
  SHORT_TERM: '1h',
  MEDIUM_TERM: '6h',
  DAILY: '24h',
  WEEKLY: '7d',
  MONTHLY: '30d',
  QUARTERLY: '90d',
  YEARLY: '365d'
} as const

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const

// Environment-specific configurations
export const ENVIRONMENT_CONFIG = {
  development: {
    LOG_LEVEL: 'debug',
    ENABLE_CORS: true,
    ENABLE_SWAGGER: true,
    MOCK_ML_SERVICES: true
  },
  test: {
    LOG_LEVEL: 'warn',
    ENABLE_CORS: true,
    ENABLE_SWAGGER: false,
    MOCK_ML_SERVICES: true
  },
  staging: {
    LOG_LEVEL: 'info',
    ENABLE_CORS: true,
    ENABLE_SWAGGER: true,
    MOCK_ML_SERVICES: false
  },
  production: {
    LOG_LEVEL: 'warn',
    ENABLE_CORS: false,
    ENABLE_SWAGGER: false,
    MOCK_ML_SERVICES: false
  }
} as const

// Validation regex patterns
export const VALIDATION_PATTERNS = {
  ANIMAL_ID: /^[A-Z]\d{3}$/,
  FARM_ID: /^F\d{3}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
} as const