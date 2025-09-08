'use client'

import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAnimals } from '@/hooks/use-animals'
import { useSystemHealth } from '@/hooks/use-dashboard'
import { formatHealthStatus, formatDateTime, getHealthStatusStyles } from '@/lib/utils'
import type { HealthStatus } from '@livestock/types'
import { Activity, AlertTriangle, Heart, TrendingUp } from 'lucide-react'

function HealthStatusCard({ status, count, title }: { 
  status: HealthStatus
  count: number
  title: string 
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Heart className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        <Badge variant={getHealthStatusStyles(status) as any} className="mt-1">
          {formatHealthStatus(status)}
        </Badge>
      </CardContent>
    </Card>
  )
}

function DashboardStats() {
  const { data: animals, isLoading, error } = useAnimals()
  
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-12"></div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !animals) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Failed to load dashboard data</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Count animals by health status
  const healthCounts = animals.animals.reduce((acc, animal) => {
    acc[animal.healthStatus] = (acc[animal.healthStatus] || 0) + 1
    return acc
  }, {} as Record<HealthStatus, number>)

  const totalAnimals = animals.count || 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Animals</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAnimals}</div>
          <p className="text-xs text-muted-foreground">
            Across all farms
          </p>
        </CardContent>
      </Card>
      
      <HealthStatusCard 
        status="healthy" 
        count={healthCounts.healthy || 0} 
        title="Healthy Animals" 
      />
      
      <HealthStatusCard 
        status="at_risk" 
        count={healthCounts.at_risk || 0} 
        title="At Risk" 
      />
      
      <HealthStatusCard 
        status="sick" 
        count={(healthCounts.sick || 0) + (healthCounts.critical || 0)} 
        title="Needs Attention" 
      />
    </div>
  )
}

function SystemStatus() {
  const { data: health, isLoading } = useSystemHealth()
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>System Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
        ) : health ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{health.status}</Badge>
              <span className="text-sm text-muted-foreground">
                Version {health.version}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Last updated: {formatDateTime(health.timestamp)}
            </p>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>System status unavailable</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RecentAnimals() {
  const { data: animals, isLoading } = useAnimals()
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Animals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const recentAnimals = animals?.animals.slice(0, 5) || []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Animals</CardTitle>
        <CardDescription>
          Latest animals added to the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentAnimals.map((animal) => (
            <div key={animal.id} className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {animal.id.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Animal {animal.id}</p>
                  <Badge variant={getHealthStatusStyles(animal.healthStatus) as any}>
                    {formatHealthStatus(animal.healthStatus)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {animal.breed} • Farm {animal.farmId}
                </p>
              </div>
            </div>
          ))}
          {recentAnimals.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No animals found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your livestock health monitoring platform
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Loading dashboard...</div>}>
        <DashboardStats />
      </Suspense>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="md:col-span-1 lg:col-span-4">
          <Suspense fallback={<div>Loading animals...</div>}>
            <RecentAnimals />
          </Suspense>
        </div>
        <div className="md:col-span-1 lg:col-span-3">
          <Suspense fallback={<div>Loading system status...</div>}>
            <SystemStatus />
          </Suspense>
        </div>
      </div>
    </div>
  )
}