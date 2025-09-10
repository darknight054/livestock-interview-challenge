'use client'

import { Suspense, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useHealthPredictions, usePerformanceBenchmarks } from '@/hooks/use-analytics'
import { TrendingUp, AlertTriangle, Activity, BarChart3, Calendar } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'

function HealthPredictions() {
  const [riskLevel, setRiskLevel] = useState<'all' | 'high' | 'critical'>('all')
  const [days, setDays] = useState(7)
  
  const { data: predictions, isLoading, error } = useHealthPredictions(riskLevel, undefined, days)
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Health Predictions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Health Predictions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Failed to load health predictions</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const predictionData = predictions?.data || {}
  const predictionsList = predictionData.predictions || []
  const summary = predictionData.summary || {}

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Health Predictions</span>
            </CardTitle>
            <CardDescription>
              AI-powered health risk assessment and predictions
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Select value={riskLevel} onValueChange={(value: any) => setRiskLevel(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risks</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={days.toString()} onValueChange={(value) => setDays(Number(value))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="14">14 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.totalPredictions || 0}</div>
              <div className="text-xs text-muted-foreground">Total Predictions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{summary.highRiskCount || 0}</div>
              <div className="text-xs text-muted-foreground">High Risk</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{summary.criticalRiskCount || 0}</div>
              <div className="text-xs text-muted-foreground">Critical Risk</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{Math.round(summary.averageConfidence * 100) || 0}%</div>
              <div className="text-xs text-muted-foreground">Avg Confidence</div>
            </div>
          </div>

          {/* Predictions List */}
          {predictionsList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No predictions available for the selected criteria
            </div>
          ) : (
            <div className="space-y-2">
              {predictionsList.slice(0, 5).map((prediction: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{prediction.animalId || `Animal ${index + 1}`}</div>
                    <div className="text-sm text-muted-foreground">
                      {prediction.prediction || 'Health risk detected'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={
                      prediction.riskLevel === 'critical' ? 'destructive' :
                      prediction.riskLevel === 'high' ? 'secondary' : 'outline'
                    }>
                      {prediction.riskLevel || 'medium'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {Math.round((prediction.confidence || 0.8) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PerformanceBenchmarks() {
  const [metric, setMetric] = useState<'health' | 'productivity' | 'efficiency' | 'all'>('all')
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  
  const { data: benchmarks, isLoading, error } = usePerformanceBenchmarks(metric, period)
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Performance Benchmarks</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Performance Benchmarks</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>Failed to load performance benchmarks</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const benchmarkData = benchmarks?.data || {}
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Performance Benchmarks</span>
            </CardTitle>
            <CardDescription>
              Compare performance against industry standards
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Select value={metric} onValueChange={(value: any) => setMetric(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Metrics</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="productivity">Productivity</SelectItem>
                <SelectItem value="efficiency">Efficiency</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Mock benchmark data visualization */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">92%</div>
              <div className="text-sm text-muted-foreground">Health Score</div>
              <Badge variant="secondary" className="mt-1">Above Average</Badge>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">87%</div>
              <div className="text-sm text-muted-foreground">Productivity</div>
              <Badge variant="outline" className="mt-1">Industry Average</Badge>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">78%</div>
              <div className="text-sm text-muted-foreground">Efficiency</div>
              <Badge variant="secondary" className="mt-1">Below Average</Badge>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground" suppressHydrationWarning>
            Benchmarks based on {period} period • Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AnimalTimeSeriesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Time Series Analytics</span>
        </CardTitle>
        <CardDescription>
          View detailed sensor trends and patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Select an animal from the Animals page to view detailed time-series analytics
          </p>
          <Button variant="outline" onClick={()=> { window.location.href = '/animals' }}>
            Go to Animals
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Advanced analytics and insights for your livestock
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <span className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<div>Loading health predictions...</div>}>
          <HealthPredictions />
        </Suspense>
        
        <Suspense fallback={<div>Loading performance benchmarks...</div>}>
          <PerformanceBenchmarks />
        </Suspense>
      </div>

      <Suspense fallback={<div>Loading analytics...</div>}>
        <AnimalTimeSeriesCard />
      </Suspense>
    </div>
  )
}
