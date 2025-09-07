import type { 
  Animal, 
  Farm, 
  SensorReading, 
  HealthPrediction, 
  FinancialRisk,
  Alert,
  DashboardData
} from '@livestock/types'
import { 
  generateAnimalId, 
  generateFarmId, 
  generateUUID,
  addDaysToDate,
  subtractDaysFromDate
} from './utils'
import { 
  DEMO_FARM_LOCATIONS, 
  CATTLE_BREEDS, 
  FINANCIAL_PARAMETERS 
} from './constants'

// Mock farm data
export const mockFarms: Farm[] = Object.entries(DEMO_FARM_LOCATIONS).map(
  ([id, { latitude, longitude, name }]) => ({
    id: id as keyof typeof DEMO_FARM_LOCATIONS,
    name,
    location: { latitude, longitude },
    totalAnimals: Math.floor(Math.random() * 150) + 50, // 50-200 animals
    contactInfo: {
      owner: `${name} Owner`,
      email: `owner@${name.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: `+1-555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`
    }
  })
)

// Generate mock animals
export function generateMockAnimals(count = 20): Animal[] {
  const animals: Animal[] = []
  const farmIds = Object.keys(DEMO_FARM_LOCATIONS)
  const healthStatuses = ['healthy', 'healthy', 'healthy', 'at_risk', 'sick'] // Weighted towards healthy
  
  for (let i = 1; i <= count; i++) {
    const farmId = farmIds[Math.floor(Math.random() * farmIds.length)]
    const healthStatus = healthStatuses[Math.floor(Math.random() * healthStatuses.length)] as Animal['healthStatus']
    
    animals.push({
      id: generateAnimalId(i),
      farmId,
      breed: CATTLE_BREEDS[Math.floor(Math.random() * CATTLE_BREEDS.length)],
      birthDate: subtractDaysFromDate(new Date(), Math.floor(Math.random() * 2000) + 365), // 1-6 years old
      weight: Math.floor(Math.random() * 300) + 400, // 400-700 kg
      healthStatus,
      lastUpdated: new Date().toISOString()
    })
  }
  
  return animals
}

// Generate mock sensor reading
export function generateMockSensorReading(
  animalId: string, 
  farmId: string, 
  timestamp?: string
): SensorReading {
  const now = timestamp || new Date().toISOString()
  const isHealthy = Math.random() > 0.1 // 90% chance of healthy readings
  
  // Base values for healthy animal
  let temperature = 38.5 + Math.random() * 1.0 // 38.5-39.5°C
  let heartRate = 70 + Math.random() * 40 // 70-110 BPM
  
  // Adjust for unhealthy animals
  if (!isHealthy) {
    temperature += Math.random() * 2 - 1 // ±1°C variation
    heartRate += Math.random() * 40 - 20 // ±20 BPM variation
  }
  
  return {
    id: generateUUID(),
    animalId,
    farmId,
    timestamp: now,
    bodyTemperature: Math.round(temperature * 100) / 100,
    heartRate: Math.round(heartRate),
    gpsLatitude: DEMO_FARM_LOCATIONS[farmId as keyof typeof DEMO_FARM_LOCATIONS]?.latitude + (Math.random() - 0.5) * 0.01,
    gpsLongitude: DEMO_FARM_LOCATIONS[farmId as keyof typeof DEMO_FARM_LOCATIONS]?.longitude + (Math.random() - 0.5) * 0.01,
    accelX: (Math.random() - 0.5) * 2, // -1 to 1 g
    accelY: (Math.random() - 0.5) * 2,
    accelZ: (Math.random() - 0.5) * 2,
    sensorStatus: Math.random() > 0.05 ? 'healthy' : ['low_battery', 'malfunction'][Math.floor(Math.random() * 2)] as SensorReading['sensorStatus']
  }
}

// Generate mock health prediction
export function generateMockHealthPrediction(animalId: string): HealthPrediction {
  const healthStatuses = ['healthy', 'at_risk', 'sick', 'critical']
  const diseases = ['mastitis', 'lameness', 'respiratory', 'digestive', 'reproductive', 'metabolic']
  const severities = ['mild', 'moderate', 'severe', 'critical']
  
  const healthStatus = healthStatuses[Math.floor(Math.random() * healthStatuses.length)] as HealthPrediction['healthStatus']
  const confidence = 0.6 + Math.random() * 0.4 // 60-100% confidence
  
  const predictedDiseases = healthStatus === 'healthy' ? [] : [
    {
      type: diseases[Math.floor(Math.random() * diseases.length)] as HealthPrediction['predictedDiseases'][0]['type'],
      probability: 0.3 + Math.random() * 0.5, // 30-80% probability
      severity: severities[Math.floor(Math.random() * severities.length)] as HealthPrediction['predictedDiseases'][0]['severity'],
      expectedOnset: healthStatus !== 'sick' ? addDaysToDate(new Date(), Math.floor(Math.random() * 7) + 1) : undefined
    }
  ]
  
  const riskFactors = [
    {
      factor: 'Elevated body temperature',
      weight: 0.3 + Math.random() * 0.4,
      description: 'Temperature readings above normal range'
    },
    {
      factor: 'Irregular heart rate',
      weight: 0.2 + Math.random() * 0.3,
      description: 'Heart rate variability outside normal parameters'
    },
    {
      factor: 'Reduced activity level',
      weight: 0.1 + Math.random() * 0.3,
      description: 'Lower than normal movement patterns detected'
    }
  ]
  
  const recommendations = [
    'Monitor temperature closely',
    'Increase observation frequency',
    'Consider veterinary consultation',
    'Isolate if symptoms worsen'
  ]
  
  return {
    id: generateUUID(),
    animalId,
    timestamp: new Date().toISOString(),
    healthStatus,
    confidence,
    predictedDiseases,
    riskFactors: riskFactors.slice(0, Math.floor(Math.random() * 3) + 1),
    recommendations: recommendations.slice(0, Math.floor(Math.random() * 4) + 1)
  }
}

// Generate mock financial risk
export function generateMockFinancialRisk(animalId: string): FinancialRisk {
  const riskScore = Math.floor(Math.random() * 100)
  const currentValue = FINANCIAL_PARAMETERS.ANIMAL_BASE_VALUE + (Math.random() - 0.5) * 500
  const potentialLoss = (riskScore / 100) * currentValue * (0.5 + Math.random() * 0.5)
  
  return {
    animalId,
    timestamp: new Date().toISOString(),
    riskScore,
    expectedLoss: Math.round(potentialLoss),
    insurancePremiumRecommendation: FINANCIAL_PARAMETERS.INSURANCE_BASE_RATE * (1 + riskScore / 100),
    marketImpact: {
      currentValue: Math.round(currentValue),
      potentialLoss: Math.round(potentialLoss),
      timeToRecovery: riskScore > 50 ? Math.floor(Math.random() * 30) + 7 : undefined,
      marketPriceImpact: (riskScore / 100) * 0.3 // Up to 30% price impact
    },
    treatmentCosts: [
      {
        diseaseType: 'mastitis',
        estimatedCost: FINANCIAL_PARAMETERS.TREATMENT_COSTS.mastitis,
        duration: 7 + Math.floor(Math.random() * 7),
        successRate: 0.8 + Math.random() * 0.15
      }
    ]
  }
}

// Generate mock alerts
export function generateMockAlerts(animalIds: string[]): Alert[] {
  const alertTypes = ['health', 'sensor', 'financial', 'system']
  const severities = ['low', 'medium', 'high', 'critical']
  const alerts: Alert[] = []
  
  // Generate 3-8 alerts
  const alertCount = Math.floor(Math.random() * 6) + 3
  
  for (let i = 0; i < alertCount; i++) {
    const animalId = animalIds[Math.floor(Math.random() * animalIds.length)]
    const type = alertTypes[Math.floor(Math.random() * alertTypes.length)] as Alert['type']
    const severity = severities[Math.floor(Math.random() * severities.length)] as Alert['severity']
    
    let message = ''
    let recommendedActions: string[] = []
    
    switch (type) {
      case 'health':
        message = `Health concern detected for animal ${animalId}`
        recommendedActions = ['Schedule veterinary examination', 'Monitor closely']
        break
      case 'sensor':
        message = `Sensor malfunction detected for animal ${animalId}`
        recommendedActions = ['Check sensor battery', 'Verify sensor placement']
        break
      case 'financial':
        message = `Elevated financial risk for animal ${animalId}`
        recommendedActions = ['Review insurance coverage', 'Assess market timing']
        break
      case 'system':
        message = 'System maintenance required'
        recommendedActions = ['Schedule maintenance window', 'Backup data']
        break
    }
    
    alerts.push({
      id: generateUUID(),
      animalId: type === 'system' ? 'SYS001' : animalId,
      type,
      severity,
      message,
      timestamp: subtractDaysFromDate(new Date(), Math.random() * 7),
      acknowledged: Math.random() > 0.3, // 70% acknowledged
      recommendedActions
    })
  }
  
  return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

// Generate mock dashboard data
export function generateMockDashboardData(): DashboardData {
  const totalAnimals = 150
  const healthyCount = Math.floor(totalAnimals * 0.75)
  const atRiskCount = Math.floor(totalAnimals * 0.15)
  const sickCount = Math.floor(totalAnimals * 0.08)
  const criticalCount = totalAnimals - healthyCount - atRiskCount - sickCount
  
  const mockAnimals = generateMockAnimals(20)
  const alerts = generateMockAlerts(mockAnimals.map(a => a.id))
  
  return {
    overview: {
      totalAnimals,
      healthyCount,
      atRiskCount,
      sickCount,
      criticalCount,
      sensorStatusCounts: {
        healthy: Math.floor(totalAnimals * 0.85),
        low_battery: Math.floor(totalAnimals * 0.10),
        malfunction: Math.floor(totalAnimals * 0.03),
        offline: Math.floor(totalAnimals * 0.02)
      }
    },
    alerts,
    healthTrends: Array.from({ length: 30 }, (_, i) => ({
      date: subtractDaysFromDate(new Date(), 29 - i),
      healthyCount: healthyCount + Math.floor((Math.random() - 0.5) * 20),
      atRiskCount: atRiskCount + Math.floor((Math.random() - 0.5) * 10),
      sickCount: sickCount + Math.floor((Math.random() - 0.5) * 5),
      criticalCount: criticalCount + Math.floor((Math.random() - 0.5) * 3)
    })),
    financialSummary: {
      totalPortfolioValue: totalAnimals * FINANCIAL_PARAMETERS.ANIMAL_BASE_VALUE,
      totalRiskExposure: Math.floor(totalAnimals * FINANCIAL_PARAMETERS.ANIMAL_BASE_VALUE * 0.15),
      expectedAnnualLoss: Math.floor(totalAnimals * FINANCIAL_PARAMETERS.ANIMAL_BASE_VALUE * 0.05),
      recommendedInsurancePremium: Math.floor(totalAnimals * FINANCIAL_PARAMETERS.ANIMAL_BASE_VALUE * FINANCIAL_PARAMETERS.INSURANCE_BASE_RATE),
      riskByFarm: mockFarms.map(farm => ({
        farmId: farm.id,
        farmName: farm.name,
        animalCount: Math.floor(farm.totalAnimals * 0.7), // Some farms have fewer animals
        avgRiskScore: Math.floor(Math.random() * 60) + 20, // 20-80 risk score
        totalExposure: Math.floor(farm.totalAnimals * FINANCIAL_PARAMETERS.ANIMAL_BASE_VALUE * 0.12)
      }))
    }
  }
}

// Helper functions for generating time series data
export function generateMockSensorTimeSeries(
  animalId: string,
  farmId: string,
  hours = 24,
  intervalMinutes = 15
): SensorReading[] {
  const readings: SensorReading[] = []
  const totalReadings = (hours * 60) / intervalMinutes
  
  for (let i = 0; i < totalReadings; i++) {
    const timestamp = subtractDaysFromDate(new Date(), (totalReadings - i - 1) * intervalMinutes / (60 * 24))
    readings.push(generateMockSensorReading(animalId, farmId, timestamp))
  }
  
  return readings
}