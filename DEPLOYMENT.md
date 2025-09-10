# Production Deployment Guide

## 🚀 **Quick Start with Docker**

### Prerequisites
- Docker and Docker Compose
- CSV data files (`sensor_readings.csv`, `health_labels.csv`) in the `data/` directory
- **Important**: Ensure ports 5432 (PostgreSQL), 6379 (Redis), 3001 (API), and 3002 (Web) are free on your system

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Minimum required: DB_PASSWORD, REDIS_PASSWORD
```

### 2. Start Infrastructure
```bash
# Start database and Redis
docker-compose up -d postgres redis

# Wait for services to be ready (about 30 seconds)
docker-compose logs -f postgres redis
```

### 3. Import Data (One-time)
```bash
# Import CSV data to database
pnpm import-data

# This will process 7.8M+ sensor records efficiently
# ⏱️ Expected time: 20-25 minutes for complete import
```

### 4. Start Applications
```bash
# Start API and Web services
pnpm dev:api
pnpm dev:web

# Check health status
curl http://localhost:3001/health/detailed
```

### 5. Access Applications
- **API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs
- **Web Dashboard**: http://localhost:3002
- **Health Check**: http://localhost:3001/health

---

## 🏗️ **Production Architecture**

### Infrastructure Stack
- **PostgreSQL 15 + TimescaleDB**: Time-series database with continuous aggregates
- **Redis 7**: Caching and rate limiting
- **Node.js 18**: API runtime with clustering
- **Next.js 14**: Web dashboard with SSR

### Performance Features
- **Sub-second API responses** (vs 30+ seconds with CSV)
- **Intelligent caching** with Redis and circuit breakers
- **Time-series aggregation** using materialized views
- **Production rate limiting** with sliding windows
- **Comprehensive monitoring** with health checks
---

## 📊 **API Endpoints**

### Core Endpoints
```bash
# Health & Monitoring
GET  /health                    # Quick health check
GET  /health/detailed          # Comprehensive system status
GET  /health/metrics          # Performance metrics

# Animals
GET  /api/v1/animals          # List animals (paginated, filtered)
GET  /api/v1/animals/:id      # Get animal details

# Sensors (High Performance)
GET  /api/v1/sensors/:id/latest        # Latest sensor reading
GET  /api/v1/sensors/:id/history       # Historical data (cached)
GET  /api/v1/sensors/batch             # Batch sensor data

# Analytics & Time-Series
GET  /api/v1/analytics/sensor/:id/timeseries  # Aggregated data
GET  /api/v1/analytics/farm/:id/overview      # Farm analytics
```

### Time-Series Resolutions
- **5min, 15min, 1hour, 1day**: Pre-aggregated materialized views
- **Real-time**: Latest sensor readings
- **Historical**: Efficient pagination with database optimization

---

## 📈 **Monitoring & Health Checks**

### Health Check Endpoints
```bash
# Kubernetes/Docker health probes
curl http://localhost:3001/health

# Detailed status with all components
curl http://localhost:3001/health/detailed

# Performance and resource metrics
curl http://localhost:3001/health/metrics
```

## 🔧 **Performance Optimization**

### Database Optimizations
- **TimescaleDB hypertables** for sensor data partitioning
- **Continuous aggregates** for real-time analytics
- **Strategic indexes** on animal_id, timestamp, farm_id
- **Connection pooling** with 20 max connections

### Caching Strategy
- **Redis caching** with TTLs
- **Compression** for large payloads

### Rate Limiting
- **Sliding window** algorithm with Redis
- **Per-endpoint limits** with different tiers
- **Proper HTTP headers** for client feedback


### Troubleshooting
- If you see no data from analytics api and data import has been completed successfully,
Run this four docker commands and check if its preparing the materialistic views:
```bash
docker exec -it *postgres_container name* psql -U username -d livestock_monitoring -c "CALL refresh_continuous_aggregate('sensor_readings_5min', NULL, NULL);"
docker exec -it *postgres_container name* psql -U username -d livestock_monitoring -c "CALL refresh_continuous_aggregate('sensor_readings_15min', NULL, NULL);"
docker exec -it *postgres_container name* psql -U username -d livestock_monitoring -c "CALL refresh_continuous_aggregate('sensor_readings_1hour', NULL, NULL);"
docker exec -it *postgres_container name* psql -U username -d livestock_monitoring -c "CALL refresh_continuous_aggregate('sensor_readings_1day', NULL, NULL);"
```

- If you see that the you made changes to the db and it is not getting updated:
Possible reasons could be redis caching, check the TTL or if its urgent:
```bash
docker exec -it *redis container name* redis-cli -a redis123 FLUSHALL
```

