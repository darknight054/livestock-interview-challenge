import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/lib/api-client'

export const ANALYTICS_QUERY_KEY = 'analytics'

/**
 * Hook to get time-series analytics for an animal
 */
export function useAnimalTimeSeries(
  animalId: string, 
  resolution: '5min' | '15min' | '1hour' | '1day' = '15min',
  hours: number = 24,
  metrics: string = 'temperature,heartRate'
) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, 'timeseries', animalId, resolution, hours, metrics],
    queryFn: () => analyticsApi.getTimeSeries(animalId, { resolution, hours, metrics }),
    enabled: !!animalId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to get farm overview analytics
 */
export function useFarmOverview(
  farmId: string,
  resolution: '1hour' | '1day' = '1hour',
  days: number = 7
) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, 'farm-overview', farmId, resolution, days],
    queryFn: () => analyticsApi.getFarmOverview(farmId, { resolution, days }),
    enabled: !!farmId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to get health predictions
 */
export function useHealthPredictions(
  riskLevel: 'all' | 'high' | 'critical' = 'all',
  farmId?: string,
  days: number = 7
) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, 'health-predictions', riskLevel, farmId, days],
    queryFn: () => analyticsApi.getHealthPredictions({ riskLevel, farmId, days }),
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

/**
 * Hook to get performance benchmarks
 */
export function usePerformanceBenchmarks(
  metric: 'health' | 'productivity' | 'efficiency' | 'all' = 'all',
  period: 'week' | 'month' | 'quarter' | 'year' = 'month'
) {
  return useQuery({
    queryKey: [ANALYTICS_QUERY_KEY, 'performance-benchmarks', metric, period],
    queryFn: () => analyticsApi.getPerformanceBenchmarks({ metric, period }),
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}