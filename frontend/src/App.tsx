import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { API_BASE, apiFetch, clearSession, getCurrentUser, saveSession, type User } from './utils/api';

type DashboardStats = {
  totals: {
    incidents: number;
    criticalCount: number;
    awaitingReview: number;
    activeAlerts: number;
    resourcesAvailable: number;
  };
  incidents: any[];
  alerts: any[];
  resources: any[];
};

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());

  const handleLogin = (user: User, token: string) => {
    saveSession(token, user);
    setCurrentUser(user);
  };

  const logout = () => {
    clearSession();
    setCurrentUser(null);
  };

  const links = useMemo(
    () => [
      { to: '/', label: 'Home', roles: ['public', 'field', 'authority', 'admin'] },
      { to: '/map', label: 'Live Map', roles: ['public', 'field', 'authority', 'admin'] },
      { to: '/report', label: 'Report Incident', roles: ['public', 'field', 'authority', 'admin'] },
      { to: '/alerts', label: 'Alerts', roles: ['public', 'field', 'authority', 'admin'] },
      { to: '/dashboard', label: 'Command Center', roles: ['field', 'authority', 'admin'] },
      { to: '/login', label: currentUser ? 'Profile' : 'Login', roles: ['public', 'field', 'authority', 'admin'] },
    ],
    [currentUser],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <Link to="/" className="text-xl font-black tracking-tight text-slate-900">
              DISASTER CTRL
            </Link>
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-600">DEMO / SIMULATION MODE</div>
          </div>
          <nav className="hidden items-center gap-5 text-sm md:flex">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className="text-slate-700 transition hover:text-slate-900">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {currentUser ? (
              <>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-700">
                  {currentUser.role.toUpperCase()}
                </span>
                <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:border-red-500 hover:text-red-600">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage currentUser={currentUser} />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/report" element={<ReportPage currentUser={currentUser} />} />
          <Route path="/alerts" element={<AlertsPage currentUser={currentUser} />} />
          <Route path="/dashboard" element={currentUser ? <DashboardPage /> : <Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} currentUser={currentUser} />} />
        </Routes>
      </main>
    </div>
  );
}

function HomePage({ currentUser }: { currentUser: User | null }) {
  const [summary, setSummary] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch<DashboardStats>('/api/dashboard');
        setSummary(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards = [
    { label: 'Active Incidents', value: summary?.totals.incidents ?? 0, tone: 'bg-red-500/10 text-red-300' },
    { label: 'Critical', value: summary?.totals.criticalCount ?? 0, tone: 'bg-amber-500/10 text-amber-300' },
    { label: 'Awaiting Review', value: summary?.totals.awaitingReview ?? 0, tone: 'bg-blue-500/10 text-blue-300' },
    { label: 'Resources Ready', value: summary?.totals.resourcesAvailable ?? 0, tone: 'bg-emerald-500/10 text-emerald-300' },
  ];

  return (
    <div className="space-y-8">
      <section className="glass-panel rounded-2xl p-6 shadow-glow">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
              LIVE DATA · DEMO MODE
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
              Unified disaster intelligence for faster, safer emergency response.
            </h1>
            <p className="max-w-xl text-slate-700">
              Monitor flood, landslide, earthquake, and drought risks in one place. Validate evidence, prioritize action, and coordinate the closest response teams with clarity.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/report" className="rounded-xl bg-amber-500 px-4 py-3 font-semibold text-slate-950 hover:bg-amber-400">
              Report an incident
            </Link>
            <Link to="/map" className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900">
              View live map
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className={`${card.tone} rounded-2xl border border-slate-200 p-5`}>
            <div className="text-xs uppercase tracking-[0.15em] text-slate-700">{card.label}</div>
            <div className="mt-3 text-3xl font-black">{card.value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="glass-panel rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Current incident briefing</h2>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">Priority zone</span>
          </div>
          {loading ? <div>Loading briefing...</div> : (
            <div className="space-y-4">
              {summary?.incidents.slice(0, 3).map((incident) => (
                <div key={incident.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.15em] text-slate-700">{incident.hazard}</div>
                      <div className="text-lg font-bold text-white">{incident.title}</div>
                    </div>
                    <span className={`status-pill ${incident.riskLevel === 'CRITICAL' ? 'bg-red-500/15 text-red-300' : incident.riskLevel === 'HIGH' ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                      {incident.riskLevel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{incident.description}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-700">
                    <span>Confidence: {incident.confidence}/100</span>
                    <span>People affected: {incident.peopleAffected ?? 'Unavailable'}</span>
                    <span>Source: {incident.source}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h2 className="mb-4 text-xl font-bold text-white">What to do now</h2>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">1. Check the latest incident map and confirm the highest-risk zones.</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">2. Verify the evidence quality and people exposed.</div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">3. Approve an alert only after review and route rescue resources.</div>
          </div>
          {currentUser && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              Logged in as {currentUser.name} ({currentUser.role})
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MapPage() {
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    apiFetch<any[]>('/api/incidents')
      .then(setIncidents)
      .catch((error) => console.error(error));
  }, []);

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Disaster map</h1>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-700">Flood · Landslide · Earthquake · Drought</div>
        </div>
        <MapContainer center={[15.82, 78.03]} zoom={8} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {incidents.map((incident) => (
            <CircleMarker
              key={incident.id}
              center={[incident.latitude, incident.longitude]}
              radius={incident.riskLevel === 'CRITICAL' ? 16 : incident.riskLevel === 'HIGH' ? 12 : 10}
              pathOptions={{
                color: incident.riskLevel === 'CRITICAL' ? '#ef4444' : incident.riskLevel === 'HIGH' ? '#f97316' : '#facc15',
                fillColor: incident.riskLevel === 'CRITICAL' ? '#ef4444' : incident.riskLevel === 'HIGH' ? '#f97316' : '#facc15',
                fillOpacity: 0.8,
              }}
            >
              <Popup>
                <div className="space-y-1 text-slate-900">
                  <div className="font-bold">{incident.title}</div>
                  <div>{incident.hazard}</div>
                  <div>Risk: {incident.riskLevel}</div>
                  <div>Verification: {incident.verification}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </section>
    </div>
  );
}

function ReportPage({ currentUser }: { currentUser: User | null }) {
  const [form, setForm] = useState({
    hazard: 'Flood',
    description: 'Water entering a low-lying neighborhood after intense rainfall.',
    severity: 'HIGH',
    latitude: 15.8281,
    longitude: 78.0373,
    peopleAffected: 120,
    roadBlocked: true,
    assistanceNeeded: true,
  });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await apiFetch<any>('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          source: currentUser ? 'field-report' : 'citizen-report',
          submittedBy: currentUser?.email ?? 'public@demo.local',
        }),
      });
      setResult(response);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-6">
        <h1 className="mb-4 text-2xl font-bold">Report an incident</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-700">
            Disaster type
            <select value={form.hazard} onChange={(event) => setForm({ ...form, hazard: event.target.value })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-white">
              <option>Flood</option>
              <option>Landslide</option>
              <option>Earthquake</option>
              <option>Drought</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            Severity
            <select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as any })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-white">
              <option>LOW</option>
              <option>MEDIUM</option>
              <option>HIGH</option>
              <option>CRITICAL</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-700 md:col-span-2">
            Description
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-[110px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-white" />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            Latitude
            <input type="number" step="0.0001" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: Number(event.target.value) })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-white" />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            Longitude
            <input type="number" step="0.0001" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: Number(event.target.value) })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-white" />
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            Estimated people affected
            <input type="number" value={form.peopleAffected} onChange={(event) => setForm({ ...form, peopleAffected: Number(event.target.value) })} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-white" />
          </label>
          <div className="flex flex-col gap-3 pt-7 text-sm text-slate-700">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.roadBlocked} onChange={() => setForm({ ...form, roadBlocked: !form.roadBlocked })} /> Road blocked</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.assistanceNeeded} onChange={() => setForm({ ...form, assistanceNeeded: !form.assistanceNeeded })} /> Immediate assistance needed</label>
          </div>
        </div>
        {error && <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
        <button type="submit" className="mt-6 w-full rounded-xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-500">
          Submit report
        </button>
      </form>

      <div className="glass-panel rounded-2xl p-6">
        <h2 className="text-xl font-bold">Results</h2>
        {result ? (
          <div className="mt-4 space-y-4 text-sm text-slate-700">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">confidence score</div>
              <div className="mt-2 text-3xl font-black">{result.confidence}</div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-amber-300">risk score</div>
              <div className="mt-2 text-3xl font-black">{result.risk}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="mb-2 font-semibold text-white">Evidence explanation</div>
              <ul className="list-disc space-y-2 pl-5 text-slate-700">
                {result.explanation.map((item: string) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-slate-700">No report submitted yet.</div>
        )}
      </div>
    </div>
  );
}

function AlertsPage({ currentUser }: { currentUser: User | null }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    apiFetch<any[]>('/api/alerts')
      .then(setAlerts)
      .catch((error) => console.error(error));
  }, []);

  const acknowledge = async (id: string) => {
    try {
      const response = await apiFetch<any>(`/api/alerts/${id}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify({ status: 'I AM SAFE' }),
      });
      setStatus(`Acknowledged: ${response.acknowledgement}`);
      const refreshed = await apiFetch<any[]>('/api/alerts');
      setAlerts(refreshed);
    } catch (error: any) {
      setStatus(error.message || 'Acknowledgement failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-5">
        <h1 className="text-2xl font-bold">Emergency alerts</h1>
        {status && <div className="mt-3 text-sm text-emerald-300">{status}</div>}
      </div>
      <div className="grid gap-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="glass-panel rounded-2xl p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-slate-700">{alert.priority}</div>
                <div className="text-xl font-bold text-white">{alert.title}</div>
              </div>
              <div className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">{alert.deliveryMode}</div>
            </div>
            <div className="mt-3 text-slate-700">English: {alert.content.english}</div>
            <div className="mt-2 text-slate-700">Local: {alert.content.local}</div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.15em] text-slate-700">Target: {alert.targetArea}</div>
              {currentUser ? (
                <button onClick={() => acknowledge(alert.id)} className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400">
                  Acknowledge
                </button>
              ) : (
                <Link to="/login" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
                  Sign in to acknowledge
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const load = async () => {
      const data = await apiFetch<DashboardStats>('/api/dashboard');
      setDashboard(data);
    };
    load();

    const eventSource = new EventSource(`${API_BASE}/api/events`);
    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.event || payload.type === 'connected') {
        load();
      }
    };
    eventSource.addEventListener('incident-updated', () => {
      load();
    });

    return () => eventSource.close();
  }, []);

  if (!dashboard) {
    return <div className="glass-panel rounded-2xl p-6">Loading command center...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        {[
          ['Incidents', dashboard.totals.incidents],
          ['Critical', dashboard.totals.criticalCount],
          ['Awaiting review', dashboard.totals.awaitingReview],
          ['Alerts', dashboard.totals.activeAlerts],
          ['Resources', dashboard.totals.resourcesAvailable],
        ].map(([label, value]) => (
          <div key={label} className="glass-panel rounded-2xl p-5">
            <div className="text-xs uppercase tracking-[0.15em] text-slate-700">{label}</div>
            <div className="mt-3 text-3xl font-black text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="mb-4 text-xl font-bold">Active incidents</h2>
          <div className="space-y-3">
            {dashboard.incidents.map((incident) => (
              <div key={incident.id} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white">{incident.title}</div>
                  <span className="status-pill bg-red-500/10 text-red-300">{incident.riskLevel}</span>
                </div>
                <div className="mt-2 text-sm text-slate-700">{incident.description}</div>
                <div className="mt-2 text-xs text-slate-700">{incident.hazard} · {incident.confidence}/100 confidence</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <h2 className="mb-4 text-xl font-bold">Response resources</h2>
          <div className="space-y-3">
            {dashboard.resources.map((resource) => (
              <div key={resource.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <div>
                  <div className="font-semibold text-white">{resource.type}</div>
                  <div className="text-xs text-slate-700">Capacity {resource.capacity}</div>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">{resource.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onLogin, currentUser }: { onLogin: (user: User, token: string) => void; currentUser: User | null }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'public@demo.local', password: 'public123' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onLogin(response.user, response.token);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="glass-panel rounded-2xl p-6">
        <h1 className="text-2xl font-bold">Demo login</h1>
        <p className="mt-2 text-sm text-slate-700">Use any of the available role-based demo accounts.</p>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <button type="button" onClick={() => setForm({ email: 'public@demo.local', password: 'public123' })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-left hover:border-slate-500">Public: public@demo.local / public123</button>
          <button type="button" onClick={() => setForm({ email: 'field@demo.local', password: 'field123' })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-left hover:border-slate-500">Field: field@demo.local / field123</button>
          <button type="button" onClick={() => setForm({ email: 'authority@demo.local', password: 'authority123' })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-left hover:border-slate-500">Authority: authority@demo.local / authority123</button>
          <button type="button" onClick={() => setForm({ email: 'admin@demo.local', password: 'admin123' })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-left hover:border-slate-500">Admin: admin@demo.local / admin123</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-slate-700">
            Email
            <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-white" />
          </label>
          <label className="block text-sm text-slate-700">
            Password
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-white" />
          </label>
          {error && <div className="text-sm text-red-300">{error}</div>}
          <button type="submit" className="w-full rounded-xl bg-amber-500 px-4 py-3 font-bold text-slate-950 hover:bg-amber-400">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
