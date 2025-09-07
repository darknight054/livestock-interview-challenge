/**
 * CSV Data Loader Service
 * Loads sensor readings and health data from CSV files
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createReadStream } from 'fs'
import { parse } from 'csv-parse'

// Types for CSV data
export interface SensorReading {
  animalId: string
  farmId: string
  timestamp: string
  temperature?: number
  heartRate?: number
  gpsLat?: number
  gpsLng?: number
  accelX?: number
  accelY?: number
  accelZ?: number
  batteryLevel?: number
  sensorStatus: string
}

export interface HealthLabel {
  animalId: string
  timestamp: string
  healthStatus: number
  diseaseType: string
  diseaseDay?: number
}

export interface DatasetSummary {
  generation_info: {
    start_date: string
    end_date: string
    total_animals: number
    total_records: number
    sampling_interval_minutes: number
  }
  sensor_stats: Record<string, any>
  health_distribution: Record<string, any>
  farm_distribution: Record<string, number>
  data_quality: Record<string, any>
}

class CSVDataLoader {
  private readonly dataPath: string
  private datasetSummary: DatasetSummary | null = null

  constructor() {
    // Path to data files (relative to project root)
    const __filename = fileURLToPath(import.meta.url)
    const projectRoot = path.resolve(path.dirname(__filename), '../../../..')
    this.dataPath = path.join(projectRoot, 'data')
  }

  private get sensorReadingsFile(): string {
    return path.join(this.dataPath, 'sensor_readings.csv')
  }

  private get healthLabelsFile(): string {
    return path.join(this.dataPath, 'health_labels.csv')
  }

  private get datasetSummaryFile(): string {
    return path.join(this.dataPath, 'dataset_summary.json')
  }

  /**
   * Load dataset summary information
   */
  async getDatasetSummary(): Promise<DatasetSummary> {
    if (this.datasetSummary) {
      return this.datasetSummary
    }

    try {
      const data = await fs.promises.readFile(this.datasetSummaryFile, 'utf-8')
      this.datasetSummary = JSON.parse(data)
      return this.datasetSummary!
    } catch (error) {
      console.warn('Warning: Could not load dataset summary:', error)
      // Return default summary
      this.datasetSummary = {
        generation_info: {
          start_date: '2024-01-01T00:00:00',
          end_date: '2024-06-30T00:00:00',
          total_animals: 500,
          total_records: 7831612,
          sampling_interval_minutes: 15
        },
        sensor_stats: {},
        health_distribution: {},
        farm_distribution: {},
        data_quality: {}
      }
      return this.datasetSummary
    }
  }

  /**
   * Get sensor readings for a specific animal
   */
  async getSensorReadings(
    animalId: string,
    options: {
      startTime?: Date
      limit?: number
      hours?: number
    } = {}
  ): Promise<SensorReading[]> {
    const { startTime, limit = 100, hours } = options
    const readings: SensorReading[] = []
    let count = 0

    // Calculate time filter
    let timeFilter: Date | undefined = startTime
    if (hours && !startTime) {
      timeFilter = new Date(Date.now() - hours * 60 * 60 * 1000)
    }

    return new Promise((resolve, reject) => {
      const stream = createReadStream(this.sensorReadingsFile)
        .pipe(parse({ 
          columns: true,
          skip_empty_lines: true
        }))

      stream.on('data', (row: any) => {
        // Skip if not the requested animal
        if (row.animal_id !== animalId) {
          return
        }

        // Apply time filter if provided
        if (timeFilter) {
          const rowTime = new Date(row.timestamp)
          if (rowTime < timeFilter) {
            return
          }
        }

        // Convert and format the data
        const reading: SensorReading = {
          animalId: row.animal_id,
          farmId: row.farm_id,
          timestamp: row.timestamp,
          temperature: row.body_temperature ? parseFloat(row.body_temperature) : undefined,
          heartRate: row.heart_rate ? parseInt(row.heart_rate) : undefined,
          gpsLat: row.gps_latitude ? parseFloat(row.gps_latitude) : undefined,
          gpsLng: row.gps_longitude ? parseFloat(row.gps_longitude) : undefined,
          accelX: row.accel_x ? parseFloat(row.accel_x) : undefined,
          accelY: row.accel_y ? parseFloat(row.accel_y) : undefined,
          accelZ: row.accel_z ? parseFloat(row.accel_z) : undefined,
          batteryLevel: undefined, // Not in CSV
          sensorStatus: row.sensor_status
        }

        readings.push(reading)
        count++

        // For better performance, destroy stream early when we have enough data
        if (count >= limit) {
          stream.destroy()
          return
        }
      })

      stream.on('end', () => {
        resolve(readings)
      })

      stream.on('error', (error: Error) => {
        console.error('Error reading sensor data:', error)
        reject(error)
      })
    })
  }

  /**
   * Get sensor readings for multiple animals
   */
  async getBatchSensorReadings(
    animalIds: string[],
    options: {
      startTime?: Date
      limitPerAnimal?: number
      hours?: number
    } = {}
  ): Promise<Record<string, SensorReading[]>> {
    const { limitPerAnimal = 50 } = options
    const results: Record<string, SensorReading[]> = {}

    // Initialize results
    for (const animalId of animalIds) {
      results[animalId] = []
    }

    for (const animalId of animalIds) {
      try {
        const readings = await this.getSensorReadings(animalId, {
          ...options,
          limit: limitPerAnimal
        })
        results[animalId] = readings
      } catch (error) {
        console.error(`Error loading data for animal ${animalId}:`, error)
        results[animalId] = []
      }
    }

    return results
  }

  /**
   * Get list of all animal IDs in the dataset
   */
  async getAnimalList(limit: number = 100): Promise<string[]> {
    const animalIds = new Set<string>()

    return new Promise((resolve, reject) => {
      const stream = createReadStream(this.sensorReadingsFile)
        .pipe(parse({ 
          columns: true,
          skip_empty_lines: true
        }))

      stream.on('data', (row: any) => {
        animalIds.add(row.animal_id)
        
        // Limit for performance
        if (animalIds.size >= limit) {
          stream.destroy()
        }
      })

      stream.on('end', () => {
        resolve(Array.from(animalIds).sort())
      })

      stream.on('error', (error: Error) => {
        console.error('Error reading animal list:', error)
        reject(error)
      })
    })
  }

  /**
   * Get health labels for an animal
   */
  async getHealthLabels(
    animalId: string,
    limit: number = 100
  ): Promise<HealthLabel[]> {
    const healthData: HealthLabel[] = []
    let count = 0

    return new Promise((resolve, reject) => {
      const stream = createReadStream(this.healthLabelsFile)
        .pipe(parse({ 
          columns: true,
          skip_empty_lines: true
        }))

      stream.on('data', (row: any) => {
        if (row.animal_id !== animalId) {
          return
        }

        const healthRecord: HealthLabel = {
          animalId: row.animal_id,
          timestamp: row.timestamp,
          healthStatus: parseInt(row.health_status),
          diseaseType: row.disease_type,
          diseaseDay: row.disease_day !== '0' ? parseInt(row.disease_day) : undefined
        }

        healthData.push(healthRecord)
        count++

        if (count >= limit) {
          stream.destroy()
        }
      })

      stream.on('end', () => {
        resolve(healthData)
      })

      stream.on('error', (error: Error) => {
        console.error('Error reading health data:', error)
        reject(error)
      })
    })
  }
}

// Export singleton instance
export const csvDataLoader = new CSVDataLoader()