import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sensorsApi } from '@/lib/api-client'
import type { SensorReading } from '@livestock/types'

export const SENSORS_QUERY_KEY = 'sensors'

/**
 * Hook to get latest sensor reading for an animal
 */
export function useLatestSensorReading(animalId: string) {
  return useQuery({
    queryKey: [SENSORS_QUERY_KEY, animalId, 'latest'],
    queryFn: () => sensorsApi.getLatest(animalId),
    enabled: !!animalId,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to get sensor history for an animal
 */
export function useSensorHistory(animalId: string, hours = 24) {
  return useQuery({
    queryKey: [SENSORS_QUERY_KEY, animalId, 'history', hours],
    queryFn: () => sensorsApi.getHistory(animalId, hours),
    enabled: !!animalId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to submit sensor data
 */
export function useSubmitSensorData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (readings: SensorReading[]) => sensorsApi.submitData(readings),
    onSuccess: (_, readings) => {
      // Invalidate sensor queries for all animals that had data submitted
      const animalIds = Array.from(new Set(readings.map(r => r.animalId)))
      
      animalIds.forEach(animalId => {
        queryClient.invalidateQueries({ 
          queryKey: [SENSORS_QUERY_KEY, animalId] 
        })
      })
    },
  })
}