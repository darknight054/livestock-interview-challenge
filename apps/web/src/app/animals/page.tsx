'use client'

import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAnimals } from '@/hooks/use-animals'
import { formatHealthStatus, formatDate, getHealthStatusStyles, getAnimalAvatarUrl } from '@/lib/utils'
import type { Animal, HealthStatus } from '@livestock/types'
import { Search, Filter, Plus, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

function AnimalCard({ animal }: { animal: Animal }) {
  const styles = getHealthStatusStyles(animal.healthStatus)
  const avatarUrl = getAnimalAvatarUrl(animal.id)
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {animal.id.slice(0, 2).toUpperCase()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">Animal {animal.id}</h3>
                <p className="text-sm text-muted-foreground">
                  {animal.breed} • Farm {animal.farmId}
                </p>
              </div>
              <Badge variant={styles as any}>
                {formatHealthStatus(animal.healthStatus)}
              </Badge>
            </div>
            
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Weight:</span>
                <span>{animal.weight ? `${animal.weight} kg` : 'Not recorded'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Birth Date:</span>
                <span>{formatDate(animal.birthDate)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Updated:</span>
                <span>{formatDate(animal.lastUpdated)}</span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <Link href={`/animals/${animal.id}` as any}>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </Link>
              
              {(animal.healthStatus === 'at_risk' || animal.healthStatus === 'sick' || animal.healthStatus === 'critical') && (
                <div className="flex items-center text-amber-600 text-sm">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Needs Attention
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AnimalsGrid() {
  const { data: animalsData, isLoading, error } = useAnimals()
  
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex items-start space-x-4">
                  <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !animalsData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-center">
            <div className="space-y-2">
              <AlertTriangle className="h-8 w-8 text-red-600 mx-auto" />
              <p className="text-lg font-medium">Failed to load animals</p>
              <p className="text-muted-foreground">There was an error loading the animal data.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { animals, count } = animalsData

  if (animals.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-center">
            <div className="space-y-2">
              <p className="text-lg font-medium">No animals found</p>
              <p className="text-muted-foreground">Start by adding animals to your farm.</p>
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Animal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {animals.map((animal) => (
          <AnimalCard key={animal.id} animal={animal} />
        ))}
      </div>
      
      {count > animals.length && (
        <div className="text-center">
          <p className="text-muted-foreground">
            Showing {animals.length} of {count} animals
          </p>
          <Button variant="outline" className="mt-2">
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}

export default function AnimalsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Animals</h1>
          <p className="text-muted-foreground">
            Manage and monitor your livestock health
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Animal
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>Filter and search your animals</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search animals..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Suspense fallback={<div>Loading animals...</div>}>
        <AnimalsGrid />
      </Suspense>
    </div>
  )
}