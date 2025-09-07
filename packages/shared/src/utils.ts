import { format, parseISO, addDays, subDays, isValid } from 'date-fns'
import type { 
  ApiResponse, 
  ApiError, 
  HealthStatus, 
  SensorStatus,
  DiseaseType,
  AlertSeverity
} from '@livestock/types'

// API response helpers
export function createApiResponse<T>(
  data: T,
  success = true,
  error?: ApiError
): ApiResponse<T> {
  return {
    success,
    data: success ? data : undefined,
    error: !success ? error : undefined,
    timestamp: new Date().toISOString()
  }
}

export function createApiError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    code,
    message,
    details
  }
}

// Date utilities
export function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp
  return isValid(date) ? format(date, 'yyyy-MM-dd HH:mm:ss') : 'Invalid Date'
}

export function formatDate(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? parseISO(timestamp) : timestamp
  return isValid(date) ? format(date, 'yyyy-MM-dd') : 'Invalid Date'
}

export function addDaysToDate(date: string | Date, days: number): string {
  const baseDate = typeof date === 'string' ? parseISO(date) : date
  return addDays(baseDate, days).toISOString()
}

export function subtractDaysFromDate(date: string | Date, days: number): string {
  const baseDate = typeof date === 'string' ? parseISO(date) : date
  return subDays(baseDate, days).toISOString()
}

export function isDateInRange(
  date: string | Date,
  startDate: string | Date,
  endDate: string | Date
): boolean {
  const checkDate = typeof date === 'string' ? parseISO(date) : date
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
  
  return checkDate >= start && checkDate <= end
}

// Health status utilities
export function getHealthStatusPriority(status: HealthStatus): number {
  const priorities: Record<HealthStatus, number> = {
    'critical': 4,
    'sick': 3,
    'at_risk': 2,
    'healthy': 1
  }
  return priorities[status]
}

export function getHealthStatusColor(status: HealthStatus): string {
  const colors: Record<HealthStatus, string> = {
    'healthy': '#10B981',   // green-500
    'at_risk': '#F59E0B',   // amber-500
    'sick': '#EF4444',      // red-500
    'critical': '#DC2626'   // red-600
  }
  return colors[status]
}

export function getHealthStatusLabel(status: HealthStatus): string {
  const labels: Record<HealthStatus, string> = {
    'healthy': 'Healthy',
    'at_risk': 'At Risk',
    'sick': 'Sick',
    'critical': 'Critical'
  }
  return labels[status]
}

// Sensor status utilities
export function getSensorStatusColor(status: SensorStatus): string {
  const colors: Record<SensorStatus, string> = {
    'healthy': '#10B981',     // green-500
    'low_battery': '#F59E0B', // amber-500
    'malfunction': '#EF4444', // red-500
    'offline': '#6B7280'      // gray-500
  }
  return colors[status]
}

export function getSensorStatusLabel(status: SensorStatus): string {
  const labels: Record<SensorStatus, string> = {
    'healthy': 'Healthy',
    'low_battery': 'Low Battery',
    'malfunction': 'Malfunction',
    'offline': 'Offline'
  }
  return labels[status]
}

// Disease type utilities
export function getDiseaseTypeLabel(type: DiseaseType): string {
  const labels: Record<DiseaseType, string> = {
    'mastitis': 'Mastitis',
    'lameness': 'Lameness',
    'respiratory': 'Respiratory',
    'digestive': 'Digestive',
    'reproductive': 'Reproductive',
    'metabolic': 'Metabolic'
  }
  return labels[type]
}

export function getDiseaseTypeColor(type: DiseaseType): string {
  const colors: Record<DiseaseType, string> = {
    'mastitis': '#EF4444',      // red-500
    'lameness': '#F59E0B',      // amber-500
    'respiratory': '#8B5CF6',   // violet-500
    'digestive': '#06B6D4',     // cyan-500
    'reproductive': '#EC4899',  // pink-500
    'metabolic': '#10B981'      // green-500
  }
  return colors[type]
}

// Alert severity utilities
export function getAlertSeverityColor(severity: AlertSeverity): string {
  const colors: Record<AlertSeverity, string> = {
    'low': '#10B981',     // green-500
    'medium': '#F59E0B',  // amber-500
    'high': '#EF4444',    // red-500
    'critical': '#DC2626' // red-600
  }
  return colors[severity]
}

export function getAlertSeverityLabel(severity: AlertSeverity): string {
  const labels: Record<AlertSeverity, string> = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'critical': 'Critical'
  }
  return labels[severity]
}

// ID generation utilities
export function generateAnimalId(sequence: number): string {
  return `C${sequence.toString().padStart(3, '0')}`
}

export function generateFarmId(sequence: number): string {
  return `F${sequence.toString().padStart(3, '0')}`
}

export function generateUUID(): string {
  return crypto.randomUUID()
}

// Data transformation utilities
export function roundToDecimalPlaces(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

export function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return roundToDecimalPlaces((value / total) * 100, 2)
}

// Array utilities
export function groupBy<T, K extends keyof T>(array: T[], key: K): Map<T[K], T[]> {
  return array.reduce((map, item) => {
    const groupKey = item[key]
    const group = map.get(groupKey) || []
    group.push(item)
    map.set(groupKey, group)
    return map
  }, new Map<T[K], T[]>())
}

export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1
    if (aVal > bVal) return order === 'asc' ? 1 : -1
    return 0
  })
}

export function unique<T>(array: T[]): T[] {
  return [...new Set(array)]
}

// Financial utilities
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

export function formatPercentage(value: number, decimals = 2): string {
  return `${roundToDecimalPlaces(value * 100, decimals)}%`
}

// Logging utility
export function createLogEntry(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  context?: Record<string, unknown>
) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  }
}