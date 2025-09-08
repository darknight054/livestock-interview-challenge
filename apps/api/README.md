# Livestock Health Monitoring API

A RESTful API service for the Smart Livestock Health & Financial Risk Assessment Platform. This service provides endpoints for managing animal data, sensor readings, and health predictions.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+

### Installation & Running

```bash
# Install dependencies (from project root)
pnpm install

# Build shared packages
pnpm build

# Start the API server in development mode
cd apps/api
pnpm dev
```

The API will be available at `http://localhost:3001`

## 📚 API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:3001/api-docs
- **OpenAPI JSON**: http://localhost:3001/api-docs.json

## 🛠️ Available Scripts

```bash
pnpm dev          # Start development server with hot reload
pnpm build        # Build for production
pnpm start        # Start production server
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm lint         # Run ESLint
pnpm type-check   # Run TypeScript type checking
pnpm clean        # Remove build artifacts
```

## 📡 API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /api/v1/health` - Detailed health information
- `GET /api/v1/health/detailed` - Extended health metrics

### Animals Management
- `GET /api/v1/animals` - Get all animals (paginated, filterable)
- `GET /api/v1/animals/{animalId}` - Get specific animal details
- `GET /api/v1/animals/{animalId}/history` - Get animal history
- `GET /api/v1/animals/stats` - Get animal statistics

### Sensor Data
- `GET /api/v1/sensors/{animalId}/latest` - Get latest sensor reading
- `GET /api/v1/sensors/{animalId}/history` - Get sensor reading history
- `GET /api/v1/sensors/batch` - Get sensor data for multiple animals
- `GET /api/v1/sensors/status` - Get sensor status overview

### Health Predictions (Bonus Challenge)
- `POST /api/v1/predictions/health` - Generate health prediction (mock implementation)

## 🔍 Example Requests

### Get All Animals
```bash
curl "http://localhost:3001/api/v1/animals?page=1&limit=10&farmId=F001"
```

### Get Animal Details
```bash
curl "http://localhost:3001/api/v1/animals/C001"
```

### Get Latest Sensor Reading
```bash
curl "http://localhost:3001/api/v1/sensors/C001/latest"
```

### Generate Health Prediction
```bash
curl -X POST "http://localhost:3001/api/v1/predictions/health" \
  -H "Content-Type: application/json" \
  -d '{"animalId": "C001"}'
```

## 📊 Data Models

### Animal
- `id`: Unique identifier (e.g., "C001")
- `farmId`: Farm identifier (e.g., "F001") 
- `breed`: Cattle breed
- `birthDate`: Birth date (ISO 8601)
- `weight`: Weight in kg
- `healthStatus`: Current health status (healthy, at_risk, sick, critical)
- `lastUpdated`: Last update timestamp

### Sensor Reading
- `id`: Unique reading identifier
- `animalId`: Associated animal ID
- `timestamp`: Reading timestamp
- `bodyTemperature`: Body temperature in Celsius
- `heartRate`: Heart rate in BPM
- `gpsLatitude`: GPS latitude
- `gpsLongitude`: GPS longitude
- `accelX/Y/Z`: Acceleration data
- `sensorStatus`: Sensor operational status

## 🏗️ Architecture

The API is built with:
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Swagger/OpenAPI** - API documentation
- **Zod** - Runtime validation
- **CSV data loading** - Mock data from CSV files
- **CORS & Security** - Helmet, rate limiting

### Project Structure
```
apps/api/
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic services
│   └── index.ts         # Application entry point
├── package.json
└── README.md
```

## 🔧 Configuration

The API server can be configured via environment variables:

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGINS` - Allowed CORS origins

## 📈 Features

### Current Implementation
✅ Animal management endpoints  
✅ Sensor data retrieval  
✅ Health check endpoints  
✅ Swagger documentation  
✅ Error handling & validation  
✅ CORS & security middleware  
✅ CSV data loading service  

### Bonus Challenge Opportunities
🎯 **Machine Learning Integration**
- Replace mock prediction endpoint with real ML model
- Implement health status prediction based on sensor data
- Add risk assessment algorithms

🎯 **Enhanced Features**
- Real-time sensor data streaming
- Advanced analytics and reporting
- Database integration
- Authentication & authorization
- Caching layer

## 🧪 Testing

The API includes comprehensive error handling and validation:
- Input validation with Zod schemas
- Structured error responses
- HTTP status code consistency
- Request/response logging

## 🔐 Security

Security measures implemented:
- **Helmet.js** - Security headers
- **CORS** - Cross-origin request configuration
- **Rate limiting** - Request throttling
- **Input validation** - Prevents malformed requests

## 📝 Development Notes

- Mock data is generated for 50 animals across 5 farms
- Sensor data is loaded from CSV files in development
- All responses follow a consistent API response format
- Comprehensive Swagger documentation for all endpoints

## 🚀 Production Deployment

For production deployment:

1. Build the application:
   ```bash
   pnpm build
   ```

2. Start the production server:
   ```bash
   pnpm start
   ```

3. Configure environment variables for your production environment
4. Set up proper database connections (replacing CSV mock data)
5. Configure monitoring and logging solutions