# Unified Real-Time Disaster Intelligence & Response Platform

This project is a local prototype of a disaster intelligence and response workflow. It combines a React + TypeScript + Vite frontend with an Express + TypeScript backend and a JSON-backed local store for demo scenarios.

## Features implemented

- Public reporting flow for flood, landslide, earthquake, and drought
- Role-based login and demo accounts
- Incident list and risk scoring engine
- Command-center dashboard with live SSE updates
- Alert management and acknowledgement flow
- Interactive Leaflet map
- Demo flood scenario and incident lifecycle
- Local data schema and API documentation

## Local development

1. Create a .env file based on `.env.example`.
2. Install dependencies:
   `npm install`
3. Start the app:
   `npm run dev`
4. Launch the frontend at http://localhost:5173 and the API at http://localhost:4000.

## Backend build

`npm run build --workspace backend`

## Frontend build

`npm run build --workspace frontend`

## Tests

`npm run test --workspace backend`

## Deploy to Render

This app is configured as a single Render web service: Express serves the built frontend and API from the same origin, and a persistent disk stores the JSON demo database.

1. Push this project to a GitHub repository.
2. In Render, choose **New → Blueprint**, connect the repository, and apply the `render.yaml` blueprint.
3. Confirm the Starter service and persistent disk pricing before creating it. Render will generate the JWT secret.
4. Once deployed, open the service URL and check `/api/health`.

The Render service name is `disaster-intelligence-demo`; if you change the service name, update `CORS_ORIGIN` in `render.yaml` to match the generated `onrender.com` origin. Do not add real emergency or personal data: this remains a demonstration prototype with demo accounts.

## Known limitation

The prototype uses a local JSON fallback rather than a live PostgreSQL/PostGIS instance. The production-ready schema is captured in `database/schema.sql` and can be migrated to PostgreSQL later.

## Demo accounts

- public@demo.local / public123
- field@demo.local / field123
- authority@demo.local / authority123
- admin@demo.local / admin123

## Demo scenario

1. Sign in as `authority@demo.local`.
2. Open the command center.
3. Trigger the demo flood scenario from the dashboard or API.
4. Review the incident, alert, and acknowledgement flow.
