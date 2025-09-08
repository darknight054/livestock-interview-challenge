import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import type { Express } from 'express'
import { config } from './app-config'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Livestock Health Monitoring API',
      version: '1.0.0',
      description: 'Smart Livestock Health & Financial Risk Assessment Platform API',
      contact: {
        name: 'API Support',
        email: 'support@livestock-health.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}/api/v1`,
        description: 'Development server'
      },
      {
        url: 'https://api.livestock-health.com/v1',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        Animal: {
          type: 'object',
          required: ['id', 'farmId', 'breed', 'birthDate', 'healthStatus', 'lastUpdated'],
          properties: {
            id: {
              type: 'string',
              pattern: '^[A-Z]\\d{3}$',
              example: 'C001',
              description: 'Unique animal identifier'
            },
            farmId: {
              type: 'string',
              pattern: '^F\\d{3}$',
              example: 'F001',
              description: 'Farm identifier'
            },
            breed: {
              type: 'string',
              example: 'Holstein',
              description: 'Cattle breed'
            },
            birthDate: {
              type: 'string',
              format: 'date-time',
              example: '2022-03-15T00:00:00Z',
              description: 'Animal birth date'
            },
            weight: {
              type: 'number',
              minimum: 0,
              example: 650,
              description: 'Animal weight in kg'
            },
            healthStatus: {
              type: 'string',
              enum: ['healthy', 'at_risk', 'sick', 'critical'],
              example: 'healthy',
              description: 'Current health status'
            },
            lastUpdated: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
              description: 'Last update timestamp'
            }
          }
        },
        SensorReading: {
          type: 'object',
          required: ['id', 'animalId', 'farmId', 'timestamp', 'sensorStatus'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000',
              description: 'Unique reading identifier'
            },
            animalId: {
              type: 'string',
              pattern: '^[A-Z]\\d{3}$',
              example: 'C001',
              description: 'Animal identifier'
            },
            farmId: {
              type: 'string',
              pattern: '^F\\d{3}$',
              example: 'F001',
              description: 'Farm identifier'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
              description: 'Reading timestamp'
            },
            bodyTemperature: {
              type: 'number',
              minimum: 30,
              maximum: 50,
              example: 39.2,
              description: 'Body temperature in Celsius'
            },
            heartRate: {
              type: 'integer',
              minimum: 0,
              maximum: 250,
              example: 85,
              description: 'Heart rate in BPM'
            },
            gpsLatitude: {
              type: 'number',
              minimum: -90,
              maximum: 90,
              example: 40.7128,
              description: 'GPS latitude'
            },
            gpsLongitude: {
              type: 'number',
              minimum: -180,
              maximum: 180,
              example: -74.0060,
              description: 'GPS longitude'
            },
            accelX: {
              type: 'number',
              minimum: -5,
              maximum: 5,
              example: 0.5,
              description: 'X-axis acceleration in g'
            },
            accelY: {
              type: 'number',
              minimum: -5,
              maximum: 5,
              example: -0.2,
              description: 'Y-axis acceleration in g'
            },
            accelZ: {
              type: 'number',
              minimum: -5,
              maximum: 5,
              example: 0.8,
              description: 'Z-axis acceleration in g'
            },
            sensorStatus: {
              type: 'string',
              enum: ['healthy', 'low_battery', 'malfunction', 'offline'],
              example: 'healthy',
              description: 'Sensor operational status'
            }
          }
        },
        HealthPrediction: {
          type: 'object',
          required: ['animalId', 'timestamp', 'healthStatus', 'confidence'],
          properties: {
            animalId: {
              type: 'string',
              pattern: '^C\\d{3}$',
              example: 'C001',
              description: 'Animal identifier'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Prediction timestamp'
            },
            healthStatus: {
              type: 'string',
              example: 'healthy',
              description: 'Predicted health status'
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              example: 0.85,
              description: 'Prediction confidence (0-1)'
            },
            message: {
              type: 'string',
              example: 'This is a mock prediction. Implement ML model for bonus challenge.',
              description: 'Additional prediction message'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          required: ['success', 'timestamp'],
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)'
            },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z'
            }
          }
        }
      },
      responses: {
        BadRequest: {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiResponse'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiResponse'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiResponse'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'API health check endpoints'
      },
      {
        name: 'Animals',
        description: 'Animal management endpoints'
      },
      {
        name: 'Sensors',
        description: 'Sensor data management endpoints'
      },
      {
        name: 'Predictions',
        description: 'Health prediction endpoints (Bonus Challenge)'
      }
    ]
  },
  apis: ['./src/routes/*.ts'] // Path to the API docs
}

const specs = swaggerJsdoc(options)

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCssUrl: 'https://cdn.jsdelivr.net/npm/swagger-ui-themes@3.0.0/themes/3.x/theme-newspaper.css'
  }))
  
  // JSON endpoint for the OpenAPI specification
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(specs)
  })
}