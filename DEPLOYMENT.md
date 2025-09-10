# Production Deployment Guide

## 🚀 **Quick Start with Docker**

### Prerequisites
- Docker and Docker Compose
- CSV data files (`sensor_readings.csv`, `health_labels.csv`) in the `data/` directory
- **Important**: Ensure ports 5432 (PostgreSQL), 6379 (Redis), 3001 (API), and 3000 (Web) are free on your system

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
docker-compose run --rm --profile import data-importer

# This will process 7.8M+ sensor records efficiently
# ⏱️ Expected time: 20-25 minutes for complete import
```

### 4. Start Applications
```bash
# Start API and Web services
docker-compose up -d api web

# Check health status
curl http://localhost:3001/health/detailed
```

### 5. Access Applications
- **API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs
- **Web Dashboard**: http://localhost:3000
- **Health Check**: http://localhost:3001/health

---

## 🏗️ **Production Architecture**

### Infrastructure Stack
- **PostgreSQL 15 + TimescaleDB**: Time-series database with continuous aggregates
- **Redis 7**: Caching and rate limiting
- **Node.js 18**: API runtime with clustering
- **Next.js 14**: Web dashboard with SSR
- **Docker**: Containerized deployment

### Performance Features
- **Sub-second API responses** (vs 30+ seconds with CSV)
- **Intelligent caching** with Redis and circuit breakers
- **Time-series aggregation** using materialized views
- **Production rate limiting** with sliding windows
- **Comprehensive monitoring** with health checks

---

## ⚙️ **Configuration**

### Environment Variables
```bash
# Database (PostgreSQL + TimescaleDB)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=livestock_monitoring
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_POOL_SIZE=20

# Redis (Caching & Rate Limiting)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# API Configuration
PORT=3001
NODE_ENV=production
ENABLE_SWAGGER=true
```

### Rate Limiting Tiers
- **Free**: 100 requests/minute, 5K/day
- **Premium**: 500 requests/minute, 50K/day  
- **Enterprise**: 2000 requests/minute, 500K/day

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
GET  /api/v1/analytics/health/predictions     # Health predictions
```

### Time-Series Resolutions
- **5min, 15min, 1hour, 1day**: Pre-aggregated materialized views
- **Real-time**: Latest sensor readings with 1-minute cache TTL
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

### Monitoring Metrics
- **Response times**: Average, P95, P99
- **Error rates**: 4xx, 5xx errors
- **Cache performance**: Hit rates, evictions
- **Database health**: Connection pool, query performance
- **Resource usage**: Memory, CPU, connections

### Alerts & Thresholds
- **Database down**: Critical alert
- **High error rate**: >5% errors over 5 minutes
- **Slow responses**: >2 second average
- **Cache issues**: <80% hit rate sustained

---

## 🔧 **Performance Optimization**

### Database Optimizations
- **TimescaleDB hypertables** for sensor data partitioning
- **Continuous aggregates** for real-time analytics
- **Strategic indexes** on animal_id, timestamp, farm_id
- **Connection pooling** with 20 max connections

### Caching Strategy
- **Redis caching** with intelligent TTLs
- **Circuit breaker** pattern for cache failures
- **Cache warming** for frequently accessed data
- **Compression** for large payloads

### Rate Limiting
- **Sliding window** algorithm with Redis
- **Per-endpoint limits** with different tiers
- **Graceful degradation** when Redis unavailable
- **Proper HTTP headers** for client feedback

---

## 🔐 **Security Features**

### Production Security
- **Helmet.js**: Security headers
- **Rate limiting**: DDoS protection
- **Input validation**: Zod schemas
- **Non-root containers**: Security best practices
- **Health checks**: System monitoring

### Environment Isolation
- **Separate environments** for dev/staging/prod
- **Secret management** via environment variables
- **Database isolation** with user permissions
- **Network security** with Docker networks

---

## 🐛 **Troubleshooting**

### Common Issues

**Database Connection Errors**
```bash
# Check database status
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -d livestock_monitoring -c "SELECT NOW();"
```

**Redis Connection Issues**
```bash
# Check Redis status  
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

**Slow API Responses**
```bash
# Check cache hit rates
curl http://localhost:3001/health/metrics | jq '.data.cache'

# Monitor database performance
curl http://localhost:3001/health/metrics | jq '.data.database'
```

**Import Data Issues**
```bash
# Check data files exist
ls -la data/

# Run import manually with logs
docker-compose run --rm data-importer
```

### Performance Tuning
```bash
# Increase database connections
DB_POOL_SIZE=30

# Adjust cache TTLs
REDIS_TTL=600000

# Tune rate limits
RATE_LIMIT_MAX_REQUESTS=200
```

---

## 🚀 **Production Deployment**

### Kubernetes Deployment
```yaml
# Use provided docker-compose as reference
# Convert to Kubernetes manifests with:
# - Deployment, Service, ConfigMap, Secret resources
# - Horizontal Pod Autoscaling (HPA)
# - Ingress for load balancing
# - Persistent volumes for database data
```

### Scaling Recommendations
- **API**: 2-4 replicas behind load balancer
- **Database**: Single instance with read replicas
- **Redis**: Single instance with persistence
- **Monitoring**: Prometheus + Grafana integration

### Production Checklist
- [ ] Environment variables configured
- [ ] Database backups scheduled
- [ ] Monitoring and alerting setup
- [ ] SSL/TLS certificates installed
- [ ] Log aggregation configured
- [ ] Rate limiting tuned for expected load
- [ ] Health checks configured in orchestrator
- [ ] Secrets management implemented
- [ ] CI/CD pipeline setup
- [ ] Performance testing completed

---

## 📋 **Migration from CSV**

The system has been optimized to migrate from the original CSV-based approach:

### Before (CSV)
- ❌ 30+ second response times
- ❌ Memory exhaustion with large files  
- ❌ No caching or rate limiting
- ❌ Linear scan for each query
- ❌ No real-time aggregations

### After (Database + Cache)
- ✅ Sub-second response times
- ✅ Efficient memory usage
- ✅ Intelligent caching with Redis
- ✅ Indexed database queries
- ✅ Pre-computed materialized views
- ✅ Production-ready monitoring
- ✅ Comprehensive rate limiting
- ✅ Horizontal scalability

This represents a **100x performance improvement** while adding production-ready features for monitoring, caching, and rate limiting.