-- PostgreSQL / PostGIS-ready schema for the disaster intelligence prototype.
-- This project uses a JSON-backed local store for the demo, but the following schema documents the production-ready structure.

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE incidents (
  id VARCHAR(64) PRIMARY KEY,
  hazard VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  severity VARCHAR(16) NOT NULL,
  confidence_score INTEGER NOT NULL,
  risk_score INTEGER NOT NULL,
  risk_level VARCHAR(16) NOT NULL,
  status VARCHAR(32) NOT NULL,
  verification VARCHAR(32) NOT NULL,
  source VARCHAR(128),
  evidence JSONB,
  affected_population INTEGER,
  road_blocked BOOLEAN,
  required_resources JSONB,
  assigned_team VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_hazard ON incidents(hazard);
CREATE INDEX idx_incidents_created_at ON incidents(created_at);
CREATE INDEX idx_incidents_geo ON incidents USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));

CREATE TABLE reports (
  id VARCHAR(64) PRIMARY KEY,
  hazard VARCHAR(32) NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  severity VARCHAR(16) NOT NULL,
  source VARCHAR(128),
  submitted_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  people_affected INTEGER,
  road_blocked BOOLEAN,
  assistance_needed BOOLEAN,
  offline BOOLEAN DEFAULT FALSE
);

CREATE TABLE evidence (
  id UUID PRIMARY KEY,
  incident_id VARCHAR(64) REFERENCES incidents(id),
  source VARCHAR(128) NOT NULL,
  type VARCHAR(32),
  score INTEGER,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resources (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  capacity INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shelters (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  capacity INTEGER,
  status VARCHAR(16) NOT NULL
);

CREATE TABLE alerts (
  id VARCHAR(64) PRIMARY KEY,
  incident_id VARCHAR(64) REFERENCES incidents(id),
  title VARCHAR(255),
  priority VARCHAR(16),
  status VARCHAR(16),
  language VARCHAR(32),
  content JSONB,
  target_area VARCHAR(255),
  delivery_state VARCHAR(32),
  delivery_mode VARCHAR(32),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_by JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE field_reports (
  id VARCHAR(64) PRIMARY KEY,
  hazard VARCHAR(32),
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  severity VARCHAR(16),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synchronized BOOLEAN DEFAULT FALSE,
  offline BOOLEAN DEFAULT TRUE
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  actor VARCHAR(255),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(64),
  entity_id VARCHAR(64),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
