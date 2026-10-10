import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import {
  calculateEvidenceConfidence,
  calculateRiskScore,
  classifyRisk,
  determineVerification,
  explainEvidence,
  type HazardType,
  type SeverityLevel,
} from './engine.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.resolve(process.env.STORE_PATH ?? path.resolve(__dirname, '../data/store.json'));
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const secret = process.env.JWT_SECRET ?? 'demo-secret';

const sseClients: Response[] = [];
type AuthRequest = Request & { user?: { id: string; sub?: string; role: Role; email: string } };

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

const demoUsers = [
  { id: 'u-public', email: 'public@demo.local', name: 'Public User', role: 'public', password: 'public123' },
  { id: 'u-field', email: 'field@demo.local', name: 'Field Officer', role: 'field', password: 'field123' },
  { id: 'u-authority', email: 'authority@demo.local', name: 'Authority Operator', role: 'authority', password: 'authority123' },
  { id: 'u-admin', email: 'admin@demo.local', name: 'System Admin', role: 'admin', password: 'admin123' },
] as const;

type Role = 'public' | 'field' | 'authority' | 'admin';

type SourceStatus = 'LIVE' | 'DEMO' | 'UNAVAILABLE' | 'STALE';

type incidentStatus = 'NEW' | 'UNDER_REVIEW' | 'VERIFIED' | 'CONFLICTING' | 'RESOLVED' | 'DISPROVEN';

type AlertPriority = 'INFORMATION' | 'WARNING' | 'HIGH' | 'CRITICAL';

type DeliveryState = 'CREATED' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'RETRYING' | 'ACKNOWLEDGED';

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  password: string;
}

interface Incident {
  id: string;
  hazard: HazardType;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  severity: SeverityLevel;
  confidence: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: incidentStatus;
  verification: 'VERIFIED' | 'UNVERIFIED' | 'CONFLICTING' | 'DISPROVEN';
  source: string;
  evidence: string[];
  peopleAffected?: number;
  roadBlocked?: boolean;
  requiredResources: string[];
  assignedTeam?: string;
  createdAt: string;
  updatedAt: string;
}

interface Report {
  id: string;
  hazard: HazardType;
  description: string;
  latitude: number;
  longitude: number;
  severity: SeverityLevel;
  source: string;
  submittedBy: string;
  createdAt: string;
  peopleAffected?: number;
  roadBlocked?: boolean;
  assistanceNeeded?: boolean;
  offline?: boolean;
}

interface Alert {
  id: string;
  incidentId: string;
  title: string;
  priority: AlertPriority;
  status: 'DRAFT' | 'APPROVED' | 'SENT';
  language: string;
  content: {
    english: string;
    local: string;
  };
  targetArea: string;
  deliveryState: DeliveryState;
  deliveryMode: 'DEMO' | 'SMS' | 'EMAIL' | 'WEB_PUSH' | 'BROADCAST';
  createdAt: string;
  acknowledgedBy: string[];
}

interface Resource {
  id: string;
  type: string;
  status: 'AVAILABLE' | 'IN_TRANSIT' | 'DEPLOYED' | 'MAINTENANCE';
  capacity: number;
  location: { lat: number; lng: number };
  lastUpdated: string;
}

interface Shelter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  status: 'OPEN' | 'FULL' | 'MAINTENANCE';
}

interface Store {
  users: User[];
  incidents: Incident[];
  reports: Report[];
  alerts: Alert[];
  resources: Resource[];
  shelters: Shelter[];
}

function generateId(prefix: string) {
  return `${prefix}-${uuidv4().slice(0, 8)}`;
}

const baseStore: Store = {
  users: demoUsers.map((u) => ({ ...u })),
  incidents: [
    {
      id: 'INC-2026-000101',
      hazard: 'Flood',
      title: 'Flooding near Kurnool market',
      description: 'Overflowing drainage and inundation of low-lying shops.',
      latitude: 15.8281,
      longitude: 78.0373,
      severity: 'HIGH',
      confidence: 81,
      riskScore: 76,
      riskLevel: 'HIGH',
      status: 'UNDER_REVIEW',
      verification: 'VERIFIED',
      source: 'citizen-report',
      evidence: ['Local flooding reported by 4 residents', 'Rainfall above seasonal average', 'Drainage overflow confirmed'],
      peopleAffected: 240,
      roadBlocked: true,
      requiredResources: ['Rescue boat', 'Medical team', 'Water supply'],
      assignedTeam: 'Team-Alpha',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'INC-2026-000102',
      hazard: 'Landslide',
      title: 'Slope instability on hill road',
      description: 'Cracks and debris on a slope above a village road.',
      latitude: 13.083,
      longitude: 77.473,
      severity: 'MEDIUM',
      confidence: 64,
      riskScore: 52,
      riskLevel: 'MEDIUM',
      status: 'VERIFIED',
      verification: 'UNVERIFIED',
      source: 'field-report',
      evidence: ['Field inspection recorded fresh cracks', 'Road access partially obstructed'],
      peopleAffected: 80,
      roadBlocked: false,
      requiredResources: ['Inspection team', 'Slope equipment'],
      assignedTeam: 'Team-Beta',
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  reports: [
    {
      id: 'REP-001',
      hazard: 'Flood',
      description: 'Road under water near market area.',
      latitude: 15.8281,
      longitude: 78.0373,
      severity: 'HIGH',
      source: 'citizen-report',
      submittedBy: 'public@demo.local',
      createdAt: new Date().toISOString(),
      peopleAffected: 120,
      roadBlocked: true,
      assistanceNeeded: true,
      offline: false,
    },
  ],
  alerts: [
    {
      id: 'ALT-001',
      incidentId: 'INC-2026-000101',
      title: 'Flood warning for Kurnool market zone',
      priority: 'HIGH',
      status: 'APPROVED',
      language: 'en',
      content: {
        english: 'Avoid the low-lying market district. Move to higher ground and follow local emergency instructions.',
        local: 'దయచేసి తక్కువ స్థాయి మార్కెట్ ప్రాంతాన్ని నివారించండి. ఎత్తైన ప్రాంతానికి 이동ించండి మరియు స్థానిక అత్యవసర సూచనలను పాటించండి.',
      },
      targetArea: 'Kurnool market',
      deliveryState: 'DELIVERED',
      deliveryMode: 'DEMO',
      createdAt: new Date().toISOString(),
      acknowledgedBy: [],
    },
  ],
  resources: [
    { id: 'R-001', type: 'Ambulance', status: 'AVAILABLE', capacity: 3, location: { lat: 15.83, lng: 78.04 }, lastUpdated: new Date().toISOString() },
    { id: 'R-002', type: 'Rescue Boat', status: 'IN_TRANSIT', capacity: 8, location: { lat: 15.82, lng: 78.05 }, lastUpdated: new Date().toISOString() },
    { id: 'R-003', type: 'Medical Supplies', status: 'AVAILABLE', capacity: 10, location: { lat: 15.84, lng: 78.02 }, lastUpdated: new Date().toISOString() },
  ],
  shelters: [
    { id: 'S-001', name: 'City Community Hall', latitude: 15.831, longitude: 78.043, capacity: 150, status: 'OPEN' },
    { id: 'S-002', name: 'Rural School Shelter', latitude: 15.823, longitude: 78.03, capacity: 80, status: 'OPEN' },
    { id: 'S-003', name: 'Hospital Annex', latitude: 15.812, longitude: 78.041, capacity: 50, status: 'FULL' },
  ],
};

async function loadStore(): Promise<Store> {
  try {
    const content = await fs.readFile(dataPath, 'utf-8');
    if (!content.trim()) {
      await fs.writeFile(dataPath, JSON.stringify(baseStore, null, 2));
      return baseStore;
    }
    return JSON.parse(content) as Store;
  } catch (error) {
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, JSON.stringify(baseStore, null, 2));
    return baseStore;
  }
}

async function saveStore(store: Store) {
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(store, null, 2));
}

function getTokenForUser(user: User) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, secret, { expiresIn: '8h' });
}

function verifyToken(token: string) {
  return jwt.verify(token, secret) as { sub: string; role: Role; email: string };
}

function requireAuth(roles: Role[] = ['public', 'field', 'authority', 'admin']) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authorization = req.headers.authorization ?? '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const userData = verifyToken(token);
      if (!roles.includes(userData.role)) {
        return res.status(403).json({ error: 'Insufficient role permissions' });
      }
      const authReq = req as AuthRequest;
      authReq.user = { ...userData, id: userData.sub };
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

function notifyClients(eventName: string, payload: unknown) {
  const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of [...sseClients]) {
    if (!client.writableEnded) {
      client.write(message);
    }
  }
}

function calculateIncidentMetrics(incident: Incident) {
  const confidence = calculateEvidenceConfidence({
    hazard: incident.hazard,
    severity: incident.severity,
    source: incident.source,
    evidenceCount: incident.evidence.length,
    conflictingSources: incident.verification === 'CONFLICTING' ? 2 : 0,
    isFresh: true,
    peopleAffected: incident.peopleAffected,
    roadBlocked: incident.roadBlocked,
    nearbyShelters: 2,
  });

  const risk = calculateRiskScore({
    hazard: incident.hazard,
    severity: incident.severity,
    source: incident.source,
    evidenceCount: incident.evidence.length,
    conflictingSources: incident.verification === 'CONFLICTING' ? 2 : 0,
    isFresh: true,
    peopleAffected: incident.peopleAffected,
    roadBlocked: incident.roadBlocked,
    nearbyShelters: 2,
    confidence,
  });

  return { confidence, risk, riskLevel: classifyRisk(risk), verification: determineVerification(confidence, incident.verification === 'CONFLICTING' ? 2 : 0) };
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mode: 'DEMO', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  res.write('data: {"type":"connected"}\n\n');
  sseClients.push(res);
  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index >= 0) sseClients.splice(index, 1);
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = demoUsers.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase() && candidate.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid demo credentials' });
  }

  const token = getTokenForUser(user as unknown as User);
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.get('/api/incidents', async (_req, res) => {
  const store = await loadStore();
  res.json(store.incidents);
});

app.get('/api/incidents/:id', async (req, res) => {
  const store = await loadStore();
  const incident = store.incidents.find((item) => item.id === req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  res.json(incident);
});

app.post('/api/incidents', requireAuth(['field', 'authority', 'admin']), async (req, res) => {
  const store = await loadStore();
  const payload = req.body as Partial<Incident>;
  const hazard = (payload.hazard ?? 'Flood') as HazardType;
  const severity = (payload.severity ?? 'MEDIUM') as SeverityLevel;
  const incident: Incident = {
    id: `INC-${new Date().getFullYear()}-${String(store.incidents.length + 1).padStart(6, '0')}`,
    hazard,
    title: payload.title ?? `${hazard} incident`,
    description: payload.description ?? 'Submitted through operator dashboard',
    latitude: Number(payload.latitude ?? 15.82),
    longitude: Number(payload.longitude ?? 78.03),
    severity,
    confidence: 60,
    riskScore: 48,
    riskLevel: 'MEDIUM',
    status: payload.status ?? 'NEW',
    verification: 'UNVERIFIED',
    source: payload.source ?? 'operator-entry',
    evidence: payload.evidence ?? ['Operator provided initial evidence'],
    peopleAffected: Number(payload.peopleAffected ?? 0),
    roadBlocked: payload.roadBlocked ?? false,
    requiredResources: payload.requiredResources ?? ['Field team'],
    assignedTeam: payload.assignedTeam,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const metrics = calculateIncidentMetrics(incident);
  incident.confidence = metrics.confidence;
  incident.riskScore = metrics.risk;
  incident.riskLevel = metrics.riskLevel;
  incident.verification = metrics.verification;
  store.incidents.unshift(incident);
  await saveStore(store);
  notifyClients('incident-updated', { event: 'incident-created', incident });
  res.status(201).json(incident);
});

app.patch('/api/incidents/:id', requireAuth(['field', 'authority', 'admin']), async (req, res) => {
  const store = await loadStore();
  const incident = store.incidents.find((item) => item.id === req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  Object.assign(incident, req.body, { updatedAt: new Date().toISOString() });
  const metrics = calculateIncidentMetrics(incident);
  incident.confidence = metrics.confidence;
  incident.riskScore = metrics.risk;
  incident.riskLevel = metrics.riskLevel;
  incident.verification = metrics.verification;
  await saveStore(store);
  notifyClients('incident-updated', { event: 'incident-touched', incident });
  res.json(incident);
});

app.post('/api/reports', async (req, res) => {
  const payload = req.body as Partial<Report>;
  const hazard = (payload.hazard ?? 'Flood') as HazardType;
  const severity = (payload.severity ?? 'MEDIUM') as SeverityLevel;

  const report: Report = {
    id: generateId('REP'),
    hazard,
    description: payload.description ?? 'User incident report',
    latitude: Number(payload.latitude ?? 15.82),
    longitude: Number(payload.longitude ?? 78.03),
    severity,
    source: payload.source ?? 'citizen-report',
    submittedBy: payload.submittedBy ?? 'public@demo.local',
    createdAt: new Date().toISOString(),
    peopleAffected: Number(payload.peopleAffected ?? 0),
    roadBlocked: Boolean(payload.roadBlocked),
    assistanceNeeded: Boolean(payload.assistanceNeeded),
    offline: Boolean(payload.offline),
  };

  const store = await loadStore();
  const confidence = calculateEvidenceConfidence({
    hazard,
    severity,
    source: report.source,
    evidenceCount: 3,
    conflictingSources: 0,
    isFresh: true,
    peopleAffected: report.peopleAffected,
    roadBlocked: report.roadBlocked,
    nearbyShelters: 2,
  });
  const risk = calculateRiskScore({
    hazard,
    severity,
    source: report.source,
    evidenceCount: 3,
    conflictingSources: 0,
    isFresh: true,
    peopleAffected: report.peopleAffected,
    roadBlocked: report.roadBlocked,
    nearbyShelters: 2,
    confidence,
  });

  const incident: Incident = {
    id: `INC-${new Date().getFullYear()}-${String(store.incidents.length + 1).padStart(6, '0')}`,
    hazard,
    title: `${hazard} report in submitted area`,
    description: report.description,
    latitude: report.latitude,
    longitude: report.longitude,
    severity,
    confidence,
    riskScore: risk,
    riskLevel: classifyRisk(risk),
    status: 'NEW',
    verification: determineVerification(confidence, 0),
    source: report.source,
    evidence: [
      'Citizen report received through public submission',
      'Location and hazard type recorded',
      'Operator review recommended',
    ],
    peopleAffected: report.peopleAffected,
    roadBlocked: report.roadBlocked,
    requiredResources: report.roadBlocked ? ['Rescue team', 'Road inspection'] : ['Field response'],
    createdAt: report.createdAt,
    updatedAt: report.createdAt,
  };

  store.reports.unshift(report);
  store.incidents.unshift(incident);
  await saveStore(store);
  notifyClients('incident-updated', { event: 'report-submitted', incident });
  return res.status(201).json({ report, incident, confidence, risk, explanation: explainEvidence({ ...report, confidence, hazard, severity, evidenceCount: 3, conflictingSources: 0, isFresh: true, nearbyShelters: 2 }) });
});

app.get('/api/resources', async (_req, res) => {
  const store = await loadStore();
  res.json(store.resources);
});

app.post('/api/resources/assign', requireAuth(['authority', 'admin']), async (req, res) => {
  const { incidentId, resourceId } = req.body as { incidentId?: string; resourceId?: string };
  const store = await loadStore();
  const resource = store.resources.find((item) => item.id === resourceId);
  const incident = store.incidents.find((item) => item.id === incidentId);

  if (!resource || !incident) {
    return res.status(404).json({ error: 'Resource or incident not found' });
  }

  resource.status = 'DEPLOYED';
  resource.lastUpdated = new Date().toISOString();
  incident.assignedTeam = resource.type;
  incident.updatedAt = new Date().toISOString();
  await saveStore(store);
  notifyClients('incident-updated', { event: 'resource-assigned', resource, incident });
  return res.json({ resource, incident });
});

app.get('/api/shelters/nearby', async (req, res) => {
  const { lat, lng } = req.query as { lat?: string; lng?: string };
  const latitude = Number(lat ?? 15.82);
  const longitude = Number(lng ?? 78.03);
  const store = await loadStore();
  const shelters = store.shelters.map((shelter) => {
    const distance = Math.hypot(shelter.latitude - latitude, shelter.longitude - longitude) * 111;
    return { ...shelter, distanceKm: Number(distance.toFixed(2)) };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  res.json(shelters.slice(0, 5));
});

app.get('/api/alerts', async (_req, res) => {
  const store = await loadStore();
  res.json(store.alerts);
});

app.post('/api/alerts', requireAuth(['authority', 'admin']), async (req, res) => {
  const store = await loadStore();
  const payload = req.body as { incidentId?: string; title?: string; priority?: AlertPriority; targetArea?: string; language?: string; content?: { english?: string; local?: string } };
  const incident = store.incidents.find((item) => item.id === payload.incidentId);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });

  const alert: Alert = {
    id: generateId('ALT'),
    incidentId: incident.id,
    title: payload.title ?? `Alert for ${incident.hazard}`,
    priority: payload.priority ?? 'WARNING',
    status: 'APPROVED',
    language: payload.language ?? 'en',
    content: {
      english: payload.content?.english ?? 'Follow local emergency guidance and stay away from affected zones.',
      local: payload.content?.local ?? 'స్థానిక అత్యవసర మార్గదర్శకాలను పాటించండి మరియు ప్రభావిత ప్రాంతాల నుండి దూరంగా ఉండండి.',
    },
    targetArea: payload.targetArea ?? 'Affected zone',
    deliveryState: 'DELIVERED',
    deliveryMode: 'DEMO',
    createdAt: new Date().toISOString(),
    acknowledgedBy: [],
  };

  store.alerts.unshift(alert);
  await saveStore(store);
  notifyClients('incident-updated', { event: 'alert-created', alert });
  return res.status(201).json(alert);
});

app.get('/api/alerts/:id', async (req, res) => {
  const store = await loadStore();
  const alert = store.alerts.find((item) => item.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json(alert);
});

app.post('/api/alerts/:id/acknowledge', requireAuth(['public', 'field', 'authority', 'admin']), async (req, res) => {
  const store = await loadStore();
  const alert = store.alerts.find((item) => item.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  const { status } = req.body as { status?: 'I AM SAFE' | 'I NEED HELP' | "CAN'T EVACUATE" };
  const user = (req as AuthRequest).user as { email?: string; name?: string } | undefined;
  alert.acknowledgedBy.push(`${user?.email ?? 'public'}:${status ?? 'I AM SAFE'}`);
  alert.deliveryState = 'ACKNOWLEDGED';
  await saveStore(store);
  notifyClients('incident-updated', { event: 'alert-acknowledged', alert });
  res.json({ success: true, alert, acknowledgement: status ?? 'I AM SAFE' });
});

app.post('/api/field-reports', requireAuth(['field', 'authority', 'admin']), async (req, res) => {
  const payload = req.body as Partial<Report>;
  const report: Report = {
    id: generateId('REP'),
    hazard: (payload.hazard ?? 'Flood') as HazardType,
    description: payload.description ?? 'Field report created offline',
    latitude: Number(payload.latitude ?? 15.82),
    longitude: Number(payload.longitude ?? 78.03),
    severity: (payload.severity ?? 'HIGH') as SeverityLevel,
    source: 'field-report',
    submittedBy: payload.submittedBy ?? 'field@demo.local',
    createdAt: new Date().toISOString(),
    peopleAffected: Number(payload.peopleAffected ?? 50),
    roadBlocked: Boolean(payload.roadBlocked),
    assistanceNeeded: Boolean(payload.assistanceNeeded),
    offline: true,
  };

  const store = await loadStore();
  store.reports.unshift(report);
  await saveStore(store);
  notifyClients('incident-updated', { event: 'field-report-saved', report });
  return res.status(201).json({ status: 'Saved Offline — Waiting for Synchronization.', report });
});

app.get('/api/dashboard', async (_req, res) => {
  const store = await loadStore();
  const incidents = store.incidents;
  const criticalCount = incidents.filter((incident) => incident.riskLevel === 'CRITICAL').length;
  const awaitingReview = incidents.filter((incident) => incident.status === 'UNDER_REVIEW').length;
  const alertsActive = store.alerts.filter((alert) => alert.status !== 'DRAFT').length;
  const resourcesAvailable = store.resources.filter((resource) => resource.status === 'AVAILABLE').length;

  res.json({
    totals: {
      incidents: incidents.length,
      criticalCount,
      awaitingReview,
      activeAlerts: alertsActive,
      resourcesAvailable,
    },
    incidents: incidents.slice(0, 8),
    alerts: store.alerts,
    resources: store.resources,
  });
});

app.post('/api/demo/flood', requireAuth(['authority', 'admin']), async (_req, res) => {
  const store = await loadStore();
  const incident: Incident = {
    id: 'INC-2026-000124',
    hazard: 'Flood',
    title: 'Demo flood scenario at Srisailam road',
    description: 'Simulated rainfall surge and overflowing drainage created localized flooding.',
    latitude: 15.85,
    longitude: 78.05,
    severity: 'CRITICAL',
    confidence: 88,
    riskScore: 92,
    riskLevel: 'CRITICAL',
    status: 'UNDER_REVIEW',
    verification: 'VERIFIED',
    source: 'demo-sensor',
    evidence: ['Demo rainfall indicator', 'Citizen report from low-lying area', 'Sensor stream indicates rapid rise'],
    peopleAffected: 180,
    roadBlocked: true,
    requiredResources: ['Rescue boat', 'Medical support', 'Sandbags'],
    assignedTeam: 'Demo Team',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const alert: Alert = {
    id: 'ALT-DEM-01',
    incidentId: incident.id,
    title: 'Flood warning: Srisailam road',
    priority: 'CRITICAL',
    status: 'APPROVED',
    language: 'te',
    content: {
      english: 'Move away from the low-lying road and follow emergency instructions.',
      local: 'తక్కువ స్థాయి రహదారి నుంచి బయటకు వెళ్లి అత్యవసర సూచనలను పాటించండి.',
    },
    targetArea: 'Srisailam road',
    deliveryState: 'QUEUED',
    deliveryMode: 'DEMO',
    createdAt: new Date().toISOString(),
    acknowledgedBy: [],
  };

  store.incidents.unshift(incident);
  store.alerts.unshift(alert);
  await saveStore(store);
  notifyClients('incident-updated', { event: 'demo-scenario', incident, alert });
  return res.status(201).json({ incident, alert });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Example of the local fallback database pattern: a JSON store is used here for the prototype.
// PostgreSQL with PostGIS is documented in database/schema.sql and can replace this store later.

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error', err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Disaster API running on http://localhost:${port}`);
});

export default app;
