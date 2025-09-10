/**
 * CSV Data Import Script for Livestock Monitoring System (Optimized)
 *
 * Key improvements:
 * - DRY: Generic CSV importer to handle both files
 * - Faster batch inserts using UNNEST (1 query per batch instead of N placeholders)
 * - Lower memory churn: numbers stored as numbers, not strings
 * - Fewer DB roundtrips when creating farms/animals (batched UNNEST inserts)
 * - Clearer validation helpers + consistent logging
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse'
import { initializeDatabase, executeQuery } from '../apps/api/src/config/database.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '../data')

// --------------------------- Types --------------------------- //
interface SensorReadingCSV {
  animal_id: string
  farm_id: string
  timestamp: string
  body_temperature?: string
  heart_rate?: string
  gps_latitude?: string
  gps_longitude?: string
  accel_x?: string
  accel_y?: string
  accel_z?: string
  battery_level?: string
  sensor_status: string
}

interface HealthLabelCSV {
  animal_id: string
  timestamp: string
  health_status: string
  disease_type?: string
  disease_day?: string
}

interface CleanedSensorReading {
  animal_id: string
  farm_id: string
  timestamp: string // ISO string
  body_temperature: number | null
  heart_rate: number | null
  gps_latitude: number | null
  gps_longitude: number | null
  accel_x: number | null
  accel_y: number | null
  accel_z: number | null
  battery_level: number | null
  sensor_status: string
}

interface CleanedHealthLabel {
  animal_id: string
  timestamp: string
  health_status_int: number
  health_status: string
  disease_type: string
  disease_day: number
}

// --------------------------- Helpers --------------------------- //
const CSV_OPTIONS = {
  columns: true,
  skip_empty_lines: true,
  delimiter: ',',
  quote: '"'
} as const

const HEALTH_STATUS_MAP: Record<string, string> = {
  '0': 'healthy',
  '1': 'at_risk',
  '2': 'sick',
  '3': 'critical'
}

const VALID_SENSOR_STATUSES = new Set(['healthy', 'low_battery', 'malfunction', 'offline'])
const VALID_DISEASE_TYPES = new Set(['healthy', 'mastitis', 'respiratory', 'lameness'])

function toISO(value: string): string | null {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function parseNumber(
  value: string | undefined,
  min: number,
  max: number,
  integer = false
): number | null {
  if (!value) return null
  const n = integer ? Number.parseInt(value) : Number.parseFloat(value)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

function validateSensorStatus(status: string): string {
  const s = (status || '').toLowerCase()
  return VALID_SENSOR_STATUSES.has(s) ? s : 'healthy'
}

function validateDiseaseType(diseaseType?: string): string {
  const s = (diseaseType || 'healthy').toLowerCase()
  return VALID_DISEASE_TYPES.has(s) ? s : 'healthy'
}

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2)
}

// --------------------------- Importer --------------------------- //
class CSVImporter {
  private batchSize: number
  private processedSensorReadings = 0
  private processedHealthLabels = 0
  private errors: string[] = []

  constructor(batchSize = Number(process.env.BATCH_SIZE || 2000)) {
    this.batchSize = batchSize
    console.log('CSV Data Importer initialized')
    console.log(`Data directory: ${DATA_DIR}`)
    console.log(`Batch size: ${this.batchSize.toLocaleString()} records`)
  }

  async importData(): Promise<void> {
    try {
      console.log('\nConnecting to database...')
      initializeDatabase()

      await this.importFarmsAndAnimals()
      await this.importSensors()
      await this.importHealth()

      console.log('\nData import completed successfully!')
      console.log(`Total sensor readings imported: ${this.processedSensorReadings.toLocaleString()}`)
      console.log(`Total health labels imported: ${this.processedHealthLabels.toLocaleString()}`)

      if (this.errors.length > 0) {
        console.log(`Errors encountered: ${this.errors.length}`)
        this.errors.slice(0, 5).forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
      }
    } catch (err) {
      console.error('Import failed:', err)
      throw err
    }
  }

  // ---------------------- Generic CSV -> DB ---------------------- //
  private async importCSV<TIn, TOut>(
    fileName: string,
    rowCleaner: (row: TIn) => TOut | null,
    batchInserter: (batch: TOut[]) => Promise<void>,
    progress: (processed: number) => void
  ): Promise<void> {
    const filePath = path.join(DATA_DIR, fileName)

    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`)
      return
    }

    console.log(`\nImporting ${fileName}...`)
    console.log(`File: ${filePath}`)
    const stats = fs.statSync(filePath)
    console.log(`File size: ${formatMB(stats.size)} MB`)

    let batch: TOut[] = []

    await new Promise<void>((resolve, reject) => {
      const stream = fs.createReadStream(filePath).pipe(parse(CSV_OPTIONS))

      stream.on('data', async (row: TIn) => {
        stream.pause()
        try {
          const cleaned = rowCleaner(row)
          if (cleaned) batch.push(cleaned)
          else this.errors.push(`Invalid row in ${fileName}`)

          if (batch.length >= this.batchSize) {
            await batchInserter(batch)
            progress(batch.length)
            batch = []
            if ((global as any).gc) (global as any).gc()
          }
        } catch (e: any) {
          this.errors.push(`Batch insert failed for ${fileName}: ${e?.message || e}`)
          console.error('Batch insert error:', e)
        } finally {
          stream.resume()
        }
      })

      stream.on('end', async () => {
        try {
          if (batch.length > 0) {
            await batchInserter(batch)
            progress(batch.length)
          }
          resolve()
        } catch (e) {
          reject(e)
        }
      })

      stream.on('error', reject)
    })
  }

  // ---------------------- Sensors ---------------------- //
  private cleanSensor(row: SensorReadingCSV): CleanedSensorReading | null {
    if (!row.animal_id || !row.farm_id || !row.timestamp) return null

    const ts = toISO(row.timestamp)
    if (!ts) return null

    return {
      animal_id: row.animal_id.trim(),
      farm_id: row.farm_id.trim(),
      timestamp: ts,
      body_temperature: parseNumber(row.body_temperature, 30, 50),
      heart_rate: parseNumber(row.heart_rate, 0, 300, true),
      gps_latitude: parseNumber(row.gps_latitude, -90, 90),
      gps_longitude: parseNumber(row.gps_longitude, -180, 180),
      accel_x: parseNumber(row.accel_x, -10, 10),
      accel_y: parseNumber(row.accel_y, -10, 10),
      accel_z: parseNumber(row.accel_z, -10, 10),
      battery_level: parseNumber(row.battery_level, 0, 100, true),
      sensor_status: validateSensorStatus(row.sensor_status)
    }
  }

  private async insertSensors(batch: CleanedSensorReading[]): Promise<void> {
    // Build column arrays for UNNEST
    const col = {
      animal_id: [] as string[],
      farm_id: [] as string[],
      timestamp: [] as string[],
      body_temperature: [] as (number | null)[],
      heart_rate: [] as (number | null)[],
      gps_latitude: [] as (number | null)[],
      gps_longitude: [] as (number | null)[],
      accel_x: [] as (number | null)[],
      accel_y: [] as (number | null)[],
      accel_z: [] as (number | null)[],
      battery_level: [] as (number | null)[],
      sensor_status: [] as string[]
    }

    for (const r of batch) {
      col.animal_id.push(r.animal_id)
      col.farm_id.push(r.farm_id)
      col.timestamp.push(r.timestamp)
      col.body_temperature.push(r.body_temperature)
      col.heart_rate.push(r.heart_rate)
      col.gps_latitude.push(r.gps_latitude)
      col.gps_longitude.push(r.gps_longitude)
      col.accel_x.push(r.accel_x)
      col.accel_y.push(r.accel_y)
      col.accel_z.push(r.accel_z)
      col.battery_level.push(r.battery_level)
      col.sensor_status.push(r.sensor_status)
    }

    const sql = `
      INSERT INTO sensor_readings (
        animal_id, farm_id, timestamp, body_temperature, heart_rate,
        gps_latitude, gps_longitude, accel_x, accel_y, accel_z,
        battery_level, sensor_status
      )
      SELECT * FROM UNNEST (
        $1::text[],
        $2::text[],
        $3::timestamptz[],
        $4::double precision[],
        $5::integer[],
        $6::double precision[],
        $7::double precision[],
        $8::double precision[],
        $9::double precision[],
        $10::double precision[],
        $11::integer[],
        $12::text[]
      )
      ON CONFLICT (timestamp, animal_id) DO NOTHING;
    `

    await executeQuery(sql, [
      col.animal_id,
      col.farm_id,
      col.timestamp,
      col.body_temperature,
      col.heart_rate,
      col.gps_latitude,
      col.gps_longitude,
      col.accel_x,
      col.accel_y,
      col.accel_z,
      col.battery_level,
      col.sensor_status
    ])
  }

  private async importSensors(): Promise<void> {
    await this.importCSV<SensorReadingCSV, CleanedSensorReading>(
      'sensor_readings.csv',
      (row) => this.cleanSensor(row),
      (batch) => this.insertSensors(batch),
      (n) => {
        this.processedSensorReadings += n
        console.log(`Processed ${this.processedSensorReadings.toLocaleString()} sensor readings`)
      }
    )
  }

  // ---------------------- Health Labels ---------------------- //
  private cleanHealth(row: HealthLabelCSV): CleanedHealthLabel | null {
    if (!row.animal_id || !row.timestamp || !row.health_status) return null
    const ts = toISO(row.timestamp)
    if (!ts) return null

    const health_status_int = Number.parseInt(row.health_status) || 0
    const health_status = HEALTH_STATUS_MAP[row.health_status] || 'healthy'

    return {
      animal_id: row.animal_id.trim(),
      timestamp: ts,
      health_status_int,
      health_status,
      disease_type: validateDiseaseType(row.disease_type),
      disease_day: Number.parseInt(row.disease_day || '0') || 0
    }
  }

  private async insertHealth(batch: CleanedHealthLabel[]): Promise<void> {
    const col = {
      animal_id: [] as string[],
      timestamp: [] as string[],
      health_status_int: [] as number[],
      health_status: [] as string[],
      disease_type: [] as string[],
      disease_day: [] as number[]
    }

    for (const r of batch) {
      col.animal_id.push(r.animal_id)
      col.timestamp.push(r.timestamp)
      col.health_status_int.push(r.health_status_int)
      col.health_status.push(r.health_status)
      col.disease_type.push(r.disease_type)
      col.disease_day.push(r.disease_day)
    }

    const sql = `
      INSERT INTO health_labels (
        animal_id, timestamp, health_status_int, health_status, disease_type, disease_day
      )
      SELECT * FROM UNNEST (
        $1::text[],
        $2::timestamptz[],
        $3::integer[],
        $4::text[],
        $5::text[],
        $6::integer[]
      )
      ON CONFLICT (timestamp, animal_id) DO NOTHING;
    `

    await executeQuery(sql, [
      col.animal_id,
      col.timestamp,
      col.health_status_int,
      col.health_status,
      col.disease_type,
      col.disease_day
    ])
  }

  private async importHealth(): Promise<void> {
    await this.importCSV<HealthLabelCSV, CleanedHealthLabel>(
      'health_labels.csv',
      (row) => this.cleanHealth(row),
      (batch) => this.insertHealth(batch),
      (n) => {
        this.processedHealthLabels += n
        console.log(`Processed ${this.processedHealthLabels.toLocaleString()} health labels`)
      }
    )
  }

  // ---------------------- Farms & Animals ---------------------- //
  private async importFarmsAndAnimals(): Promise<void> {
    console.log('\nCreating farms and animals metadata...')

    const sensorFilePath = path.join(DATA_DIR, 'sensor_readings.csv')
    if (!fs.existsSync(sensorFilePath)) {
      console.log(`Sensor readings file not found: ${sensorFilePath}`)
      return
    }

    console.log('Scanning sensor_readings.csv for unique farm/animal IDs...')

    const farmAnimalCounts = new Map<string, number>() // farm_id -> count
    const animalToFarm = new Map<string, string>() // animal_id -> farm_id

    await new Promise<void>((resolve, reject) => {
      const stream = fs.createReadStream(sensorFilePath).pipe(parse(CSV_OPTIONS))
      stream.on('data', (row: SensorReadingCSV) => {
        if (!row?.farm_id || !row?.animal_id) return
        const farm = String(row.farm_id).trim()
        const animal = String(row.animal_id).trim()
        if (!animalToFarm.has(animal)) {
          animalToFarm.set(animal, farm)
          farmAnimalCounts.set(farm, (farmAnimalCounts.get(farm) || 0) + 1)
        }
      })
      stream.on('end', () => resolve())
      stream.on('error', reject)
    })

    console.log(`Found ${farmAnimalCounts.size} unique farms and ${animalToFarm.size} unique animals`)

    // ----- Batch insert farms ----- //
    if (farmAnimalCounts.size > 0) {
      const ids: string[] = []
      const names: string[] = []
      const lats: number[] = []
      const lngs: number[] = []
      const totals: number[] = []

      for (const [farmId, total] of farmAnimalCounts.entries()) {
        ids.push(farmId)
        names.push(`Farm ${farmId}`)
        lats.push(40.0 + Math.random() * 10)
        lngs.push(-100.0 + Math.random() * 20)
        totals.push(total)
      }

      const sql = `
        INSERT INTO farms (id, name, latitude, longitude, total_animals)
        SELECT * FROM UNNEST(
          $1::text[], $2::text[], $3::double precision[], $4::double precision[], $5::integer[]
        )
        ON CONFLICT (id) DO UPDATE SET total_animals = EXCLUDED.total_animals;
      `
      await executeQuery(sql, [ids, names, lats, lngs, totals])
    }

    // ----- Batch insert animals ----- //
    if (animalToFarm.size > 0) {
      const breeds = ['Holstein', 'Angus', 'Hereford', 'Charolais', 'Simmental']

      const ids: string[] = []
      const farmIds: string[] = []
      const breedCol: string[] = []
      const birthDates: string[] = [] // ISO date (yyyy-mm-dd)
      const weights: number[] = []
      const statuses: string[] = []

      const now = Date.now()
      for (const [animalId, farmId] of animalToFarm.entries()) {
        ids.push(animalId)
        farmIds.push(farmId)
        const breed = breeds[Math.floor(Math.random() * breeds.length)]
        breedCol.push(breed)
        const birthDate = new Date(now - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000)
        birthDates.push(birthDate.toISOString().slice(0, 10))
        weights.push(400 + Math.random() * 400)
        statuses.push('healthy')
      }

      const sql = `
        INSERT INTO animals (id, farm_id, breed, birth_date, weight, health_status)
        SELECT * FROM UNNEST(
          $1::text[], $2::text[], $3::text[], $4::date[], $5::double precision[], $6::text[]
        )
        ON CONFLICT (id) DO UPDATE SET
          farm_id = EXCLUDED.farm_id,
          breed = EXCLUDED.breed;
      `
      await executeQuery(sql, [ids, farmIds, breedCol, birthDates, weights, statuses])
    }

    console.log('Farms and animals metadata created/updated')
  }
}

// --------------------------- Main --------------------------- //
async function main() {
  const importer = new CSVImporter()
  try {
    const start = Date.now()
    await importer.importData()
    const secs = ((Date.now() - start) / 1000).toFixed(2)
    console.log(`\nImport completed in ${secs} seconds`)
    process.exit(0)
  } catch (err) {
    console.error('Import failed:', err)
    process.exit(1)
  }
}

console.log('Script starting...')
main()

export { CSVImporter }
