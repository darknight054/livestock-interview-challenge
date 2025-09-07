# Technical Design Document

## System Architecture

### Current Architecture
```
┌────────────────────────────────────────────┐
│           Web Dashboard (Next.js)          │
├────────────────────────────────────────────┤
│          REST API (Express.js)             │
├────────────────────────────────────────────┤
│        CSV Data Loader Service             │
│         ** PERFORMANCE BOTTLENECK **       │
├────────────────────────────────────────────┤
│          CSV Files (738MB+)                │
│    sensor_readings.csv | health_labels.csv │
└────────────────────────────────────────────┘
```

## API Specifications

### Existing Endpoints (Provided Out-of-the-Box)

These endpoints are already implemented but have performance issues you need to fix:

#### Core Sensor Data (SLOW - Performance Bottleneck)
```typescript
GET /api/v1/sensors/:animalId/latest
Response: SensorReading // Most recent sensor data

GET /api/v1/sensors/:animalId/history
Query: hours, limit
Response: SensorReading[] // Historical data

GET /api/v1/sensors/batch
Query: animalIds[], limit
Response: Record<string, SensorReading[]>
```
**Current Issue**: 30+ second response times due to CSV file reading

#### Animal Management
```typescript
GET /api/v1/animals
Response: Animal[] // List all animals

GET /api/v1/animals/:animalId
Response: AnimalDetails // Individual animal info
```

#### Health Check
```typescript
GET /health
Response: { status: 'healthy', timestamp: string }

GET /api/v1/health
Response: DetailedHealthMetrics // System health with metrics
```

#### ML Predictions (Stub - Optional Bonus Challenge)
```typescript
POST /api/v1/predictions/health
Body: { animalId: string }
Response: MockPrediction // Currently returns mock data
```

### Endpoints You Must Implement

#### Time-Series API
```typescript
GET /api/v1/timeseries/:animalId
Query: {
  resolution: '5m' | '15m' | '1h' | '1d'
  start: ISO8601
  end: ISO8601
  metrics: string[] // temperature, heartRate, etc
}
Response: {
  data: {
    timestamp: string
    temperature_avg: number
    temperature_min: number
    temperature_max: number
    // ... other metrics
  }[]
}
Performance: <200ms required

POST /api/v1/timeseries/downsample
Body: {
  animal_ids: string[]
  source_resolution: string
  target_resolution: string
  time_range: { start: Date, end: Date }
}
Response: { job_id: string, status: string }
```

#### Rate-Limited Public API
```typescript
GET /api/v2/public/livestock
Headers: {
  'X-API-Key': string
}
Response Headers: {
  'X-RateLimit-Limit': '100'
  'X-RateLimit-Remaining': '95'
  'X-RateLimit-Reset': '1234567890'
}
Rate Limits: 100 req/min, 5000 req/day

GET /api/v2/usage/quota
Response: {
  limit: number
  remaining: number
  reset_time: ISO8601
}
```

## Data Schema

### Sensor Data Structure
```typescript
interface SensorReading {
  animalId: string      // 'C001' format
  farmId: string        // 'F001' format
  timestamp: string     // ISO 8601
  temperature?: number  // Celsius, 30-50°C range
  heartRate?: number    // BPM, 0-200 range
  gpsLat?: number       // Latitude
  gpsLng?: number       // Longitude
  accelX?: number       // -2g to +2g
  accelY?: number
  accelZ?: number
  sensorStatus: string  // 'healthy', 'low_battery', etc
}
```

### Health Labels Structure
```typescript
interface HealthLabel {
  animalId: string
  timestamp: string
  healthStatus: 0 | 1    // 0=healthy, 1=sick
  diseaseType: string    // 'healthy', 'mastitis', 'lameness', etc
  diseaseDay?: number    // Days since disease onset
}
```

## Implementation Guidelines

### Code Structure
```
apps/api/src/
├── services/
│   ├── csv-data-loader.ts  # Current slow implementation
│   ├── database.ts         # Your DB connection (if using)
│   ├── cache.ts            # Your caching layer (if using)
│   └── timeseries.ts       # Time-series aggregation
├── routes/
│   ├── sensors.ts          # Sensor endpoints
│   ├── timeseries.ts       # New time-series endpoints
│   └── public.ts           # Rate-limited public API
└── middleware/
    ├── rate-limiter.ts     # Rate limiting implementation
    └── error-handler.ts    # Error handling
```

### Testing Requirements
- Maintain >90% test coverage
- Include performance benchmarks (optional)
- Test with concurrent requests (optional)
- Validate data accuracy (optional)