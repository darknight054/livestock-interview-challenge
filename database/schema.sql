-- PostgreSQL with TimescaleDB schema for Livestock Monitoring System
-- Optimized for time-series sensor data and production performance

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Farms table - relatively static data
CREATE TABLE farms (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    total_animals INTEGER DEFAULT 0,
    owner_name VARCHAR(255),
    owner_email VARCHAR(255),
    owner_phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Animals table - semi-static data
CREATE TABLE animals (
    id VARCHAR(10) PRIMARY KEY,
    farm_id VARCHAR(10) NOT NULL REFERENCES farms(id),
    breed VARCHAR(100),
    birth_date DATE,
    weight DECIMAL(6, 2),
    health_status VARCHAR(20) DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'at_risk', 'sick', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensor readings - high-volume time-series data
CREATE TABLE sensor_readings (
    id UUID DEFAULT gen_random_uuid(),
    animal_id VARCHAR(10) NOT NULL REFERENCES animals(id),
    farm_id VARCHAR(10) NOT NULL REFERENCES farms(id),
    timestamp TIMESTAMPTZ NOT NULL,
    body_temperature DECIMAL(4, 2),
    heart_rate INTEGER,
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    accel_x DECIMAL(6, 3),
    accel_y DECIMAL(6, 3),
    accel_z DECIMAL(6, 3),
    battery_level INTEGER,
    sensor_status VARCHAR(20) DEFAULT 'healthy' CHECK (sensor_status IN ('healthy', 'low_battery', 'malfunction', 'offline')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (timestamp, animal_id)
);

-- Health labels/predictions - time-series prediction data
CREATE TABLE health_labels (
    id UUID DEFAULT gen_random_uuid(),
    animal_id VARCHAR(10) NOT NULL REFERENCES animals(id),
    timestamp TIMESTAMPTZ NOT NULL,
    health_status_int INTEGER NOT NULL CHECK (health_status_int IN (0, 1, 2, 3)),
    health_status VARCHAR(20) NOT NULL CHECK (health_status IN ('healthy', 'at_risk', 'sick', 'critical')),
    disease_type VARCHAR(50) NOT NULL CHECK (disease_type IN ('healthy', 'mastitis', 'respiratory', 'lameness')),
    disease_day INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (timestamp, animal_id)
);

-- Convert sensor_readings to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('sensor_readings', 'timestamp', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Convert health_labels to TimescaleDB hypertable
SELECT create_hypertable('health_labels', 'timestamp', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_sensor_readings_animal_id_timestamp 
    ON sensor_readings (animal_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_farm_id_timestamp 
    ON sensor_readings (farm_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp_animal_id 
    ON sensor_readings (timestamp DESC, animal_id);

CREATE INDEX IF NOT EXISTS idx_health_labels_animal_id_timestamp 
    ON health_labels (animal_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_animals_farm_id 
    ON animals (farm_id);

CREATE INDEX IF NOT EXISTS idx_animals_health_status 
    ON animals (health_status);

-- Continuous aggregates for time-series analytics (5min, 15min, 1hour, 1day)
CREATE MATERIALIZED VIEW sensor_readings_5min
WITH (timescaledb.continuous) AS
SELECT 
    animal_id,
    farm_id,
    time_bucket('5 minutes', timestamp) AS bucket,
    AVG(body_temperature) AS avg_temperature,
    MIN(body_temperature) AS min_temperature,
    MAX(body_temperature) AS max_temperature,
    AVG(heart_rate) AS avg_heart_rate,
    MIN(heart_rate) AS min_heart_rate,
    MAX(heart_rate) AS max_heart_rate,
    COUNT(*) AS reading_count
FROM sensor_readings
GROUP BY animal_id, farm_id, bucket;

CREATE MATERIALIZED VIEW sensor_readings_15min
WITH (timescaledb.continuous) AS
SELECT 
    animal_id,
    farm_id,
    time_bucket('15 minutes', timestamp) AS bucket,
    AVG(body_temperature) AS avg_temperature,
    MIN(body_temperature) AS min_temperature,
    MAX(body_temperature) AS max_temperature,
    AVG(heart_rate) AS avg_heart_rate,
    MIN(heart_rate) AS min_heart_rate,
    MAX(heart_rate) AS max_heart_rate,
    COUNT(*) AS reading_count
FROM sensor_readings
GROUP BY animal_id, farm_id, bucket;

CREATE MATERIALIZED VIEW sensor_readings_1hour
WITH (timescaledb.continuous) AS
SELECT 
    animal_id,
    farm_id,
    time_bucket('1 hour', timestamp) AS bucket,
    AVG(body_temperature) AS avg_temperature,
    MIN(body_temperature) AS min_temperature,
    MAX(body_temperature) AS max_temperature,
    AVG(heart_rate) AS avg_heart_rate,
    MIN(heart_rate) AS min_heart_rate,
    MAX(heart_rate) AS max_heart_rate,
    COUNT(*) AS reading_count
FROM sensor_readings
GROUP BY animal_id, farm_id, bucket;

CREATE MATERIALIZED VIEW sensor_readings_1day
WITH (timescaledb.continuous) AS
SELECT 
    animal_id,
    farm_id,
    time_bucket('1 day', timestamp) AS bucket,
    AVG(body_temperature) AS avg_temperature,
    MIN(body_temperature) AS min_temperature,
    MAX(body_temperature) AS max_temperature,
    AVG(heart_rate) AS avg_heart_rate,
    MIN(heart_rate) AS min_heart_rate,
    MAX(heart_rate) AS max_heart_rate,
    COUNT(*) AS reading_count
FROM sensor_readings
GROUP BY animal_id, farm_id, bucket;

-- Refresh policies for continuous aggregates
SELECT add_continuous_aggregate_policy('sensor_readings_5min',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('sensor_readings_15min',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('sensor_readings_1hour',
    start_offset => INTERVAL '12 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('sensor_readings_1day',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day',
    if_not_exists => TRUE);

-- Data retention policy (optional - keep 1 year of raw data)
-- Note: Retention policies require background workers which may not be available in development
-- These can be added manually in production environments
-- SELECT add_retention_policy('sensor_readings', INTERVAL '365 days', if_not_exists => TRUE);
-- SELECT add_retention_policy('health_labels', INTERVAL '365 days', if_not_exists => TRUE);

-- Functions for common queries
CREATE OR REPLACE FUNCTION get_latest_sensor_reading(p_animal_id VARCHAR)
RETURNS sensor_readings AS $$
BEGIN
    RETURN (
        SELECT * FROM sensor_readings 
        WHERE animal_id = p_animal_id 
        ORDER BY timestamp DESC 
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_animal_health_summary(p_animal_id VARCHAR)
RETURNS TABLE (
    current_health_status VARCHAR,
    latest_temperature DECIMAL,
    latest_heart_rate INTEGER,
    last_reading_time TIMESTAMPTZ,
    total_readings_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.health_status,
        sr.body_temperature,
        sr.heart_rate,
        sr.timestamp,
        (SELECT COUNT(*) FROM sensor_readings 
         WHERE animal_id = p_animal_id 
         AND timestamp >= CURRENT_DATE) as readings_today
    FROM animals a
    LEFT JOIN LATERAL (
        SELECT * FROM sensor_readings 
        WHERE animal_id = p_animal_id 
        ORDER BY timestamp DESC 
        LIMIT 1
    ) sr ON true
    WHERE a.id = p_animal_id;
END;
$$ LANGUAGE plpgsql;