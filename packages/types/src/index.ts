// Core domain types for livestock health monitoring platform
export interface Animal {
  id: string
  farmId: string
  breed: string
  birthDate: string
  weight?: number
  healthStatus: HealthStatus
  lastUpdated: string
}

export interface Farm {
  id: string
  name: string
  location: {
    latitude: number
    longitude: number
  }
  totalAnimals: number
  contactInfo: {
    owner: string
    email: string
    phone: string
  }
}

// Sensor data types
export interface SensorReading {
  id: string
  animalId: string
  farmId: string
  timestamp: string
  bodyTemperature?: number
  heartRate?: number
  gpsLatitude?: number
  gpsLongitude?: number
  accelX?: number
  accelY?: number
  accelZ?: number
  sensorStatus: SensorStatus
}

export type SensorStatus = 'healthy' | 'low_battery' | 'malfunction' | 'offline'

// Health prediction types  
export interface HealthPrediction {
  id: string
  animalId: string
  timestamp: string
  healthStatus: HealthStatus
  confidence: number
  predictedDiseases: PredictedDisease[]
  riskFactors: RiskFactor[]
  recommendations: string[]
}

export type HealthStatus = 'healthy' | 'at_risk' | 'sick' | 'critical'

export interface PredictedDisease {
  type: DiseaseType
  probability: number
  severity: DiseaseSeverity
  expectedOnset?: string
}

export type DiseaseType = 'mastitis' | 'lameness' | 'respiratory' | 'digestive' | 'reproductive' | 'metabolic'
export type DiseaseSeverity = 'mild' | 'moderate' | 'severe' | 'critical'

export interface RiskFactor {
  factor: string
  weight: number
  description: string
}

// Financial risk assessment types
export interface FinancialRisk {
  animalId: string
  timestamp: string
  riskScore: number // 0-100
  expectedLoss: number // USD
  insurancePremiumRecommendation: number // % of animal value
  marketImpact: MarketImpact
  treatmentCosts: TreatmentCost[]
}

export interface MarketImpact {
  currentValue: number
  potentialLoss: number
  timeToRecovery?: number // days
  marketPriceImpact: number // % reduction
}

export interface TreatmentCost {
  diseaseType: DiseaseType
  estimatedCost: number
  duration: number // days
  successRate: number // 0-1
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  timestamp: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// Health monitoring dashboard types
export interface DashboardData {
  overview: FarmOverview
  alerts: Alert[]
  healthTrends: HealthTrend[]
  financialSummary: FinancialSummary
}

export interface FarmOverview {
  totalAnimals: number
  healthyCount: number
  atRiskCount: number
  sickCount: number
  criticalCount: number
  sensorStatusCounts: Record<SensorStatus, number>
}

export interface Alert {
  id: string
  animalId: string
  type: AlertType
  severity: AlertSeverity
  message: string
  timestamp: string
  acknowledged: boolean
  recommendedActions: string[]
}

export type AlertType = 'health' | 'sensor' | 'financial' | 'system'
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface HealthTrend {
  date: string
  healthyCount: number
  atRiskCount: number
  sickCount: number
  criticalCount: number
}

export interface FinancialSummary {
  totalPortfolioValue: number
  totalRiskExposure: number
  expectedAnnualLoss: number
  recommendedInsurancePremium: number
  riskByFarm: FarmRisk[]
}

export interface FarmRisk {
  farmId: string
  farmName: string
  animalCount: number
  avgRiskScore: number
  totalExposure: number
}

// API endpoint types
export interface GetHealthParams {
  animalId: string
}

export interface GetHealthResponse {
  animal: Animal
  currentHealth: HealthPrediction
  recentReadings: SensorReading[]
  alerts: Alert[]
}

export interface PostPredictHealthRequest {
  animalId: string
  sensorData: SensorReading[]
}

export interface PostPredictHealthResponse {
  prediction: HealthPrediction
  confidence: number
  processedAt: string
}

export interface GetFinancialRiskParams {
  animalId: string
}

export interface GetFinancialRiskResponse {
  risk: FinancialRisk
  historicalTrends: Array<{
    date: string
    riskScore: number
    expectedLoss: number
  }>
}

export interface PostSensorDataRequest {
  readings: SensorReading[]
}

export interface PostSensorDataResponse {
  processed: number
  failed: number
  errors?: ApiError[]
}

// Utility types
export type DateRange = {
  startDate: string
  endDate: string
}

export type PaginationParams = {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}