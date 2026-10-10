# Disaster Platform API Overview

The prototype uses a JSON-backed local store with a PostgreSQL/PostGIS-ready schema defined in `database/schema.sql`.

## Core endpoints

- GET /api/health
- POST /api/auth/login
- GET /api/incidents
- GET /api/incidents/:id
- POST /api/incidents
- PATCH /api/incidents/:id
- POST /api/reports
- GET /api/resources
- POST /api/resources/assign
- GET /api/shelters/nearby
- GET /api/alerts
- POST /api/alerts
- GET /api/alerts/:id
- POST /api/alerts/:id/acknowledge
- POST /api/field-reports
- GET /api/dashboard
- GET /api/events
- POST /api/demo/flood

## Demo accounts

- public@demo.local / public123
- field@demo.local / field123
- authority@demo.local / authority123
- admin@demo.local / admin123

## Confidence calculation

Confidence is derived from evidence count, source reliability, severity, and freshness. The rule-based logic is implemented in `backend/src/engine.ts` and intentionally transparent.

## Risk scoring

Risk combines hazard severity, confidence, affected population, road access, and shelter coverage. The output is a 0-100 score plus risk classification: LOW, MEDIUM, HIGH, CRITICAL.

## Data status indicators

- LIVE DATA: integrated external provider is active
- DEMO DATA: simulated scenario or local storage is being used
- DATA UNAVAILABLE: no source is available or provider is offline
