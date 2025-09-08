import type { Animal, SensorReading, HealthPrediction } from '@livestock/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

class ApiClient {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Animals API
  animals = {
    getAll: async (): Promise<{ animals: Animal[]; count: number }> => {
      const response: any = await this.fetch('/api/v1/animals')
      const animals = response.data?.data || []
      return {
        animals,
        count: animals.length
      }
    },

    getById: async (id: string): Promise<Animal> => {
      return this.fetch(`/api/v1/animals/${id}`)
    },

    create: async (animal: Omit<Animal, 'id' | 'lastUpdated'>): Promise<Animal> => {
      return this.fetch('/api/v1/animals', {
        method: 'POST',
        body: JSON.stringify(animal),
      })
    },

    update: async (id: string, data: Partial<Animal>): Promise<Animal> => {
      return this.fetch(`/api/v1/animals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },

    delete: async (id: string): Promise<void> => {
      return this.fetch(`/api/v1/animals/${id}`, {
        method: 'DELETE',
      })
    },
  }

  // Sensors API
  sensors = {
    getAll: async (): Promise<{ sensors: SensorReading[]; count: number }> => {
      return this.fetch('/api/sensors')
    },

    getByAnimalId: async (animalId: string): Promise<SensorReading[]> => {
      return this.fetch(`/api/sensors?animalId=${animalId}`)
    },

    getLatest: async (animalId: string): Promise<SensorReading> => {
      return this.fetch(`/api/sensors/${animalId}/latest`)
    },

    getHistory: async (animalId: string, hours: number): Promise<SensorReading[]> => {
      return this.fetch(`/api/sensors/${animalId}/history?hours=${hours}`)
    },

    submitData: async (readings: SensorReading[]): Promise<any> => {
      return this.fetch('/api/sensors', {
        method: 'POST',
        body: JSON.stringify({ readings }),
      })
    },
  }

  // Predictions API
  predictions = {
    getAll: async (): Promise<{ predictions: HealthPrediction[]; count: number }> => {
      return this.fetch('/api/predictions')
    },

    getByAnimalId: async (animalId: string): Promise<HealthPrediction[]> => {
      return this.fetch(`/api/predictions?animalId=${animalId}`)
    },
  }

  // Health API
  health = {
    check: async (): Promise<{ status: string; version: string; timestamp: string }> => {
      return this.fetch('/health')
    },
    
    getHealth: async (): Promise<{ status: string; version: string; timestamp: string }> => {
      return this.fetch('/health')
    },
  }

  // Dashboard API
  dashboard = {
    getOverview: async (): Promise<any> => {
      return this.fetch('/api/dashboard')
    },
  }

  // Financial API
  financial = {
    getRiskSummary: async (): Promise<any> => {
      return this.fetch('/api/financial/risk-summary')
    },

    getAnimalRisk: async (animalId: string): Promise<any> => {
      return this.fetch(`/api/financial/animals/${animalId}/risk`)
    },

    getPortfolio: async (): Promise<any> => {
      return this.fetch('/api/financial/portfolio')
    },

    getRisk: async (animalId: string): Promise<any> => {
      return this.fetch(`/api/financial/animals/${animalId}/risk`)
    },
  }
}

export const apiClient = new ApiClient()

// Export individual API modules for convenience
export const { 
  animals: animalsApi, 
  sensors: sensorsApi, 
  predictions: predictionsApi, 
  health: healthApi,
  dashboard: dashboardApi,
  financial: financialApi
} = apiClient