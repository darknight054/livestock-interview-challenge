import { useQuery } from '@tanstack/react-query'
import { dashboardApi, healthApi, financialApi } from '@/lib/api-client'

export const DASHBOARD_QUERY_KEY = 'dashboard'
export const HEALTH_QUERY_KEY = 'health'
export const FINANCIAL_QUERY_KEY = 'financial'

/**
 * Hook to get dashboard overview data
 */
export function useDashboard() {
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY],
    queryFn: dashboardApi.getOverview,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
  })
}

/**
 * Hook to get system health
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: [HEALTH_QUERY_KEY],
    queryFn: healthApi.getHealth,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
  })
}

/**
 * Hook to get financial portfolio summary
 */
export function useFinancialPortfolio() {
  return useQuery({
    queryKey: [FINANCIAL_QUERY_KEY, 'portfolio'],
    queryFn: financialApi.getPortfolio,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to get financial risk for a specific animal
 */
export function useFinancialRisk(animalId: string) {
  return useQuery({
    queryKey: [FINANCIAL_QUERY_KEY, 'risk', animalId],
    queryFn: () => financialApi.getRisk(animalId),
    enabled: !!animalId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}