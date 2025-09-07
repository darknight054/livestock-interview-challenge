import { z } from 'zod'
import type { 
  SensorReading, 
  HealthPrediction, 
  FinancialRisk,
  Animal,
  Farm
} from '@livestock/types'

// Sensor reading validation schema
export const SensorReadingSchema = z.object({
  id: z.string().min(1),
  animalId: z.string().regex(/^[A-Z]\d{3}$/), // Format: C001, C002, etc.
  farmId: z.string().regex(/^F\d{3}$/), // Format: F001, F002, etc.
  timestamp: z.string().datetime(),
  bodyTemperature: z.number().min(30).max(50).optional(),
  heartRate: z.number().int().min(0).max(250).optional(),
  gpsLatitude: z.number().min(-90).max(90).optional(),
  gpsLongitude: z.number().min(-180).max(180).optional(),
  accelX: z.number().min(-5).max(5).optional(),
  accelY: z.number().min(-5).max(5).optional(),
  accelZ: z.number().min(-5).max(5).optional(),
  sensorStatus: z.enum(['healthy', 'low_battery', 'malfunction', 'offline'])
}) satisfies z.ZodType<SensorReading>

// Health prediction validation schema
export const HealthPredictionSchema = z.object({
  id: z.string().min(1),
  animalId: z.string().regex(/^[A-Z]\d{3}$/),
  timestamp: z.string().datetime(),
  healthStatus: z.enum(['healthy', 'at_risk', 'sick', 'critical']),
  confidence: z.number().min(0).max(1),
  predictedDiseases: z.array(z.object({
    type: z.enum(['mastitis', 'lameness', 'respiratory', 'digestive', 'reproductive', 'metabolic']),
    probability: z.number().min(0).max(1),
    severity: z.enum(['mild', 'moderate', 'severe', 'critical']),
    expectedOnset: z.string().datetime().optional()
  })),
  riskFactors: z.array(z.object({
    factor: z.string(),
    weight: z.number().min(0).max(1),
    description: z.string()
  })),
  recommendations: z.array(z.string())
}) satisfies z.ZodType<HealthPrediction>

// Financial risk validation schema
export const FinancialRiskSchema = z.object({
  animalId: z.string().regex(/^[A-Z]\d{3}$/),
  timestamp: z.string().datetime(),
  riskScore: z.number().int().min(0).max(100),
  expectedLoss: z.number().min(0),
  insurancePremiumRecommendation: z.number().min(0).max(1),
  marketImpact: z.object({
    currentValue: z.number().min(0),
    potentialLoss: z.number().min(0),
    timeToRecovery: z.number().int().min(0).optional(),
    marketPriceImpact: z.number().min(0).max(1)
  }),
  treatmentCosts: z.array(z.object({
    diseaseType: z.enum(['mastitis', 'lameness', 'respiratory', 'digestive', 'reproductive', 'metabolic']),
    estimatedCost: z.number().min(0),
    duration: z.number().int().min(0),
    successRate: z.number().min(0).max(1)
  }))
}) satisfies z.ZodType<FinancialRisk>

// Animal validation schema
export const AnimalSchema = z.object({
  id: z.string().regex(/^[A-Z]\d{3}$/),
  farmId: z.string().regex(/^F\d{3}$/),
  breed: z.string().min(1),
  birthDate: z.string().datetime(),
  weight: z.number().min(0).optional(),
  healthStatus: z.enum(['healthy', 'at_risk', 'sick', 'critical']),
  lastUpdated: z.string().datetime()
}) satisfies z.ZodType<Animal>

// Farm validation schema
export const FarmSchema = z.object({
  id: z.string().regex(/^F\d{3}$/),
  name: z.string().min(1),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }),
  totalAnimals: z.number().int().min(0),
  contactInfo: z.object({
    owner: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(10)
  })
}) satisfies z.ZodType<Farm>

// API request validation schemas
export const GetHealthParamsSchema = z.object({
  animalId: z.string().regex(/^[A-Z]\d{3}$/)
})

export const PostPredictHealthRequestSchema = z.object({
  animalId: z.string().regex(/^[A-Z]\d{3}$/),
  sensorData: z.array(SensorReadingSchema).min(1).max(100)
})

export const PostSensorDataRequestSchema = z.object({
  readings: z.array(SensorReadingSchema).min(1).max(1000)
})

export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Validation helper functions
export function validateSensorReading(data: unknown): SensorReading {
  return SensorReadingSchema.parse(data)
}

export function validateHealthPrediction(data: unknown): HealthPrediction {
  return HealthPredictionSchema.parse(data)
}

export function validateFinancialRisk(data: unknown): FinancialRisk {
  return FinancialRiskSchema.parse(data)
}

export function validateAnimal(data: unknown): Animal {
  return AnimalSchema.parse(data)
}

export function validateFarm(data: unknown): Farm {
  return FarmSchema.parse(data)
}

// Safe validation functions that return results instead of throwing
export function safeParseSensorReading(data: unknown) {
  return SensorReadingSchema.safeParse(data)
}

export function safeParseHealthPrediction(data: unknown) {
  return HealthPredictionSchema.safeParse(data)
}

export function safeParseFinancialRisk(data: unknown) {
  return FinancialRiskSchema.safeParse(data)
}

export function safeParseAnimal(data: unknown) {
  return AnimalSchema.safeParse(data)
}

export function safeParseFarm(data: unknown) {
  return FarmSchema.safeParse(data)
}