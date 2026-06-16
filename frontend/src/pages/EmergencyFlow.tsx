import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Ambulance, Building2, ChevronLeft,
  Clock, Copy, Phone, QrCode, Search, ShieldAlert, User, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Api from '../api/Api';

// ── Types ─────────────────────────────────────────────────────────────────────

type FlowState =
  | 'IDLE'        // Screen 1 — hold-to-activate button
  | 'CONFIRMING'  // Screen 2 — 3s countdown ring
  | 'LOCATING'    // acquiring GPS
  | 'CREATING'    // POST /emergency/create
  | 'DISPATCHING' // Screen 3 — polling dispatch status
  | 'PATIENT_ID'  // Screen 4 — optional identification
  | 'TRACKING'    // Screens 5-6 — hospital + ambulance live
  | 'TIMELINE'    // Screen 8 — event history
  | 'ERROR';

type DispatchStatus = 'PENDING' | 'SEARCHING' | 'MATCHED' | 'FAILED';

interface DispatchState {
  hospital:  { status: DispatchStatus; detail: Record<string, unknown> | null };
  ambulance: { status: DispatchStatus; detail: Record<string, unknown> | null };
  completed_at: string | null;
}

interface TimelineEvent {
  id: number;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
}

const HOLD_MS = 3000;
const POLL_MS = 2000;

// ── Color helpers ─────────────────────────────────────────────────────────────

const statusColor: Record<DispatchStatus, string> = {
  PENDING:   'bg-zinc-200',
  SEARCHING: 'bg-amber-400',
  MATCHED:   'bg-emerald-500',
  FAILED:    'bg-red-400',
};

const statusLabel: Record<DispatchStatus, string> = {
  PENDING:   'Pending',
  SEARCHING: 'Searching…',
  MATCHED:   'Matched ✓',
  FAILED:    'Not found',
};

const EVENT_ICONS: Record<string, string> = {
  EMERGENCY_CREATED:       '🚨',
  LOCATION_CAPTURED:       '📍',
  TOKEN_CREATED:           '🔑',
  QR_GENERATED:            '📱',
  FAMILY_NOTIFIED:         '📞',
  AUTO_DISPATCH_STARTED:   '⚡',
  HOSPITAL_ASSIGNED:       '🏥',
  AMBULANCE_MATCHED:       '🚑',
  AMBULANCE_ASSIGNED:      '🚑',
  DRIVER_ACCEPTED:         '✅',
  AMBULANCE_EN_ROUTE:      '🛣️',
  PATIENT_IDENTIFIED:      '🪪',
  UNKNOWN_PATIENT_ASSIGNED:'❓',
  AUTO_DISPATCH_COMPLETED: '✅',
  EMERGENCY_CANCELLED:     '❌',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmergencyFlow() {
  const navigate = useNavigate();

  const [state, setState] = useState<FlowState>('IDLE');
  const [holdProgress, setHoldProgress] = useState(0);     // 0–100
  const [emergencyId, setEmergencyId] = useState<string | null>(null);
  const [emergencyToken, setEmergencyToken] = useState<string | null>(null);
  const [dispatch, setDispatch] = useState<DispatchState | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mrkInput, setMrkInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [copied, setCopied] = useState(false);

  const holdTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStart    = useRef(0);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── GPS helper ──────────────────────────────────────────────────────────────
  const getCoords = (): Promise<GeolocationCoordinates> =>
    new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        pos => resolve(pos.coords),
        err => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    );

  // ── Hold-to-confirm logic ───────────────────────────────────────────────────
  const startHold = useCallback(() => {
    if (state !== 'IDLE') return;
    holdStart.current = Date.now();
    setState('CONFIRMING');
    holdTimer.current = setInterval(() => {
      const elapsed = Date.now() - holdStart.current;
      const pct = Math.min(100, (elapsed / HOLD_MS) * 100);
      setHoldProgress(pct);
      if (pct >= 100) {
        clearInterval(holdTimer.current!);
        holdTimer.current = null;
        activateEmergency();
      }
    }, 50);
  }, [state]);

  const cancelHold = useCallback(() => {
    if (state !== 'CONFIRMING') return;
    if (holdTimer.current) { clearInterval(holdTimer.current); holdTimer.current = null; }
    setHoldProgress(0);
    setState('IDLE');
  }, [state]);

  // ── Activate: locate → create → dispatch ───────────────────────────────────
  const activateEmergency = async () => {
    setState('LOCATING');
    let coords: GeolocationCoordinates;
    try {
      coords = await getCoords();
    } catch {
      setError('Location access denied. Please enable GPS and try again.');
      setState('ERROR');
      return;
    }

    setState('CREATING');
    try {
      const { data } = await Api.post('/emergency/create', {
        latitude:          coords.latitude,
        longitude:         coords.longitude,
        location_accuracy: coords.accuracy,
      });
      setEmergencyId(data.data.emergency_id);
      setEmergencyToken(data.data.emergency_token);
      setState('DISPATCHING');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) setError('You must be signed in to trigger an emergency.');
      else if (status === 429) setError('Too many emergency requests. Please wait before trying again.');
      else setError('Failed to create emergency. Please call 112 immediately.');
      setState('ERROR');
    }
  };

  // ── Dispatch polling ────────────────────────────────────────────────────────
  useEffect(() => {
    if (state !== 'DISPATCHING' || !emergencyId) return;

    const poll = async () => {
      try {
        const { data } = await Api.get(`/emergency/${emergencyId}/dispatch`);
        const d: DispatchState = data.data.dispatch;
        setDispatch(d);
        // Both done → move to patient ID screen
        if (d.completed_at) {
          clearInterval(pollInterval.current!);
          pollInterval.current = null;
          setState('PATIENT_ID');
        }
      } catch { /* keep polling */ }
    };

    poll();
    pollInterval.current = setInterval(poll, POLL_MS);
    return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
  }, [state, emergencyId]);

  // ── Timeline polling (lighter, once in TRACKING) ───────────────────────────
  useEffect(() => {
    if ((state !== 'TRACKING' && state !== 'TIMELINE') || !emergencyId) return;

    const pollTimeline = async () => {
      try {
        const { data } = await Api.get(`/emergency/${emergencyId}/timeline`);
        setEvents(data.data?.events ?? data.data ?? []);
      } catch { /* ignore */ }
    };

    pollTimeline();
    const t = setInterval(pollTimeline, 5000);
    return () => clearInterval(t);
  }, [state, emergencyId]);

  // ── Copy helper ─────────────────────────────────────────────────────────────
  const copyToken = async () => {
    if (!emergencyToken) return;
    await navigator.clipboard.writeText(emergencyToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Patient identification actions ─────────────────────────────────────────
  const identifyByMrk = async () => {
    const id = mrkInput.trim().toUpperCase();
    if (!id) return;
    try {
      await Api.post(`/emergency/${emergencyId}/identify`, { method: 'mrk_id', mrk_id: id });
      toast.success('Patient identified via MediRaksha ID');
      setState('TRACKING');
    } catch {
      toast.error('MediRaksha ID not found');
    }
  };

  const identifyByPhone = async () => {
    const ph = phoneInput.trim();
    if (!ph) return;
    try {
      await Api.post(`/emergency/${emergencyId}/identify`, { method: 'contact', phone: ph });
      toast.success('Patient identified via phone lookup');
      setState('TRACKING');
    } catch {
      toast.error('No patient found with this number');
    }
  };

  const skipIdentification = async () => {
    try {
      await Api.post(`/emergency/${emergencyId}/identify`, { method: 'unknown' });
    } catch { /* not critical */ }
    setState('TRACKING');
  };

  // ── Prevent body scroll while modal is active ──────────────────────────────
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  const wrapper = 'fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white overflow-y-auto';

  // ── IDLE / CONFIRMING ───────────────────────────────────────────────────────
  if (state === 'IDLE' || state === 'CONFIRMING') {
    const circumference = 2 * Math.PI * 56; // r=56
    const dash = circumference - (holdProgress / 100) * circumference;

    return (
      <div className={wrapper}>
        {/* Header */}
        <div className="flex items-center px-5 pt-10 pb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10">
            <ChevronLeft size={24} />
          </button>
          <span className="ml-3 text-zinc-400 text-sm font-medium tracking-wide uppercase">Emergency Response</span>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">
          <div className="relative">
            {/* Ambient pulse */}
            <span className="absolute inset-0 rounded-full bg-rose-600/20 animate-ping" />

            {/* SVG progress ring */}
            <svg width="140" height="140" className="-rotate-90">
              <circle cx="70" cy="70" r="56" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle
                cx="70" cy="70" r="56" fill="none"
                stroke={state === 'CONFIRMING' ? '#f43f5e' : '#ffffff18'}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dash}
                style={{ transition: state === 'CONFIRMING' ? 'none' : 'stroke 0.3s' }}
              />
            </svg>

            {/* Button face */}
            <button
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={startHold}
              onTouchEnd={cancelHold}
              className={`absolute inset-3 rounded-full flex flex-col items-center justify-center select-none transition-all
                ${state === 'CONFIRMING' ? 'bg-rose-600 scale-95' : 'bg-rose-700 hover:bg-rose-600 active:scale-95'}`}
            >
              <ShieldAlert size={32} />
              <span className="mt-1 text-xs font-black tracking-widest">SOS</span>
            </button>
          </div>

          {state === 'IDLE' ? (
            <>
              <p className="text-lg font-semibold text-zinc-100">Hold 3 seconds to activate</p>
              <p className="text-sm text-zinc-500 max-w-xs">
                Immediately alerts hospitals, dispatches ambulance, and notifies family.
              </p>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-rose-400">Keep holding…</p>
              <p className="text-sm text-zinc-400">Release to cancel</p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-10 flex flex-col gap-3">
          <a href="tel:112" className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 text-sm font-medium">
            <Phone size={16} /> Call 112 (National Emergency)
          </a>
        </div>
      </div>
    );
  }

  // ── LOCATING / CREATING ─────────────────────────────────────────────────────
  if (state === 'LOCATING' || state === 'CREATING') {
    return (
      <div className={`${wrapper} items-center justify-center gap-6`}>
        <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-300 text-base font-medium">
          {state === 'LOCATING' ? 'Locating you…' : 'Sending emergency alert…'}
        </p>
        <p className="text-zinc-500 text-sm">Do not close this screen</p>
      </div>
    );
  }

  // ── DISPATCHING ─────────────────────────────────────────────────────────────
  if (state === 'DISPATCHING') {
    const hStatus: DispatchStatus = dispatch?.hospital.status ?? 'SEARCHING';
    const aStatus: DispatchStatus = dispatch?.ambulance.status ?? 'SEARCHING';

    return (
      <div className={wrapper}>
        <div className="px-5 pt-10 pb-4">
          <span className="inline-flex items-center gap-2 text-rose-400 font-black text-sm uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Emergency Active
          </span>
          <p className="mt-1 text-zinc-500 text-xs font-mono">{emergencyId}</p>
        </div>

        <div className="px-5 flex-1 space-y-4">
          {/* Hospital dispatch card */}
          <DispatchCard
            icon={<Building2 size={20} />}
            label="Hospital"
            status={hStatus}
            detail={dispatch?.hospital.detail ?? null}
            detailLine={d => d?.name as string}
          />

          {/* Ambulance dispatch card */}
          <DispatchCard
            icon={<Ambulance size={20} />}
            label="Ambulance"
            status={aStatus}
            detail={dispatch?.ambulance.detail ?? null}
            detailLine={d => `${d?.ambulance_code ?? ''} · ${d?.ambulance_type ?? ''}`}
          />

          {/* Token */}
          <div className="rounded-2xl bg-white/5 p-4 space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Emergency Token</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-zinc-300 font-mono truncate">{emergencyToken}</code>
              <button onClick={copyToken} className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-zinc-300">
                <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-zinc-600">Show this to hospital staff or first responders</p>
          </div>
        </div>

        <div className="px-5 pb-8 pt-4">
          <p className="text-center text-zinc-500 text-xs">Stay calm. Help is being dispatched.</p>
        </div>
      </div>
    );
  }

  // ── PATIENT IDENTIFICATION ───────────────────────────────────────────────────
  if (state === 'PATIENT_ID') {
    return (
      <div className={wrapper}>
        <div className="px-5 pt-10 pb-4">
          <p className="text-rose-400 font-black text-sm uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Dispatch Complete
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">Identify the patient</h2>
          <p className="mt-1 text-zinc-400 text-sm">Optional — emergency response is already running.</p>
        </div>

        <div className="px-5 flex-1 space-y-3">
          {/* QR scan */}
          <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-left">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 shrink-0">
              <QrCode size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Scan Emergency QR</p>
              <p className="text-xs text-zinc-500 mt-0.5">Fastest — use patient's MediRaksha QR card</p>
            </div>
          </button>

          {/* MRK ID */}
          <div className="rounded-2xl bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600/20 flex items-center justify-center text-sky-400 shrink-0">
                <User size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Enter MediRaksha ID</p>
                <p className="text-xs text-zinc-500">Format: MRK-XXXXXX</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                value={mrkInput}
                onChange={e => setMrkInput(e.target.value.toUpperCase())}
                placeholder="MRK-000000"
                maxLength={10}
                className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:ring-2 focus:ring-sky-500 font-mono"
              />
              <button onClick={identifyByMrk} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-sm font-semibold">
                Find
              </button>
            </div>
          </div>

          {/* Phone lookup */}
          <div className="rounded-2xl bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Search size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Phone Number Lookup</p>
                <p className="text-xs text-zinc-500">Low-confidence — requires verification</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="+91 98765 43210"
                type="tel"
                className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button onClick={identifyByPhone} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold">
                Search
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 pb-8 pt-4">
          <button
            onClick={skipIdentification}
            className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 text-sm font-medium"
          >
            Continue Without Identification →
          </button>
        </div>
      </div>
    );
  }

  // ── TRACKING (Screens 5-6) ───────────────────────────────────────────────────
  if (state === 'TRACKING') {
    const hospital  = dispatch?.hospital.detail;
    const ambulance = dispatch?.ambulance.detail;

    return (
      <div className={wrapper}>
        <div className="px-5 pt-10 pb-4 flex items-center justify-between">
          <div>
            <p className="text-rose-400 font-black text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Emergency Active
            </p>
            <p className="text-zinc-500 text-xs font-mono mt-0.5">{emergencyId}</p>
          </div>
          <button onClick={() => setState('TIMELINE')} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
            <Clock size={12} /> Timeline
          </button>
        </div>

        <div className="px-5 flex-1 space-y-4">
          {/* Hospital card */}
          {hospital ? (
            <div className="rounded-2xl bg-emerald-950/60 border border-emerald-800/40 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-700/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Building2 size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{String(hospital.name ?? hospital.hospital_name ?? '—')}</p>
                  <p className="text-xs text-emerald-400 mt-0.5">
                    Matched · {hospital.city as string} · ICU: {hospital.icu_beds_available as number ?? '?'} beds
                  </p>
                </div>
              </div>
              {hospital.phone != null && (
                <a href={`tel:${String(hospital.phone)}`} className="mt-3 flex items-center gap-2 text-xs text-emerald-300 hover:text-white">
                  <Phone size={12} /> {String(hospital.phone)}
                </a>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-white/5 p-4 text-center text-zinc-500 text-sm">
              No hospital matched nearby
            </div>
          )}

          {/* Ambulance card */}
          {ambulance ? (
            <div className="rounded-2xl bg-sky-950/60 border border-sky-800/40 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-700/30 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                  <Ambulance size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{String(ambulance.ambulance_code ?? '—')}</p>
                  <p className="text-xs text-sky-400 mt-0.5">
                    {String(ambulance.ambulance_type ?? '')} · {String(ambulance.registration_number ?? '')}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">Status: {String(ambulance.assignment_status ?? 'PENDING')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/5 p-4 text-center text-zinc-500 text-sm">
              No ambulance dispatched nearby
            </div>
          )}

          {/* Token */}
          <div className="rounded-2xl bg-white/5 p-4 flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-zinc-400 truncate">{emergencyToken}</code>
            <button onClick={copyToken} className="shrink-0 px-3 py-1.5 rounded-lg bg-white/10 text-xs text-zinc-300">
              <Copy size={12} />
            </button>
          </div>
        </div>

        <div className="px-5 pb-8 pt-4 space-y-2">
          <a href="tel:112" className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 text-zinc-400 text-sm">
            <Phone size={14} /> Call 112
          </a>
        </div>
      </div>
    );
  }

  // ── TIMELINE (Screen 8) ──────────────────────────────────────────────────────
  if (state === 'TIMELINE') {
    return (
      <div className={wrapper}>
        <div className="px-5 pt-10 pb-4 flex items-center gap-3">
          <button onClick={() => setState('TRACKING')} className="p-2 rounded-full hover:bg-white/10">
            <ChevronLeft size={22} />
          </button>
          <div>
            <h2 className="text-base font-bold">Emergency Timeline</h2>
            <p className="text-zinc-500 text-xs font-mono">{emergencyId}</p>
          </div>
        </div>

        <div className="px-5 flex-1">
          {events.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">Loading events…</p>
          ) : (
            <div className="relative pl-6 border-l border-zinc-800 space-y-6 pb-8">
              {events.map((ev, i) => (
                <div key={ev.id} className="relative">
                  <span className={`absolute -left-[1.65rem] w-3 h-3 rounded-full border-2 ${i === events.length - 1 ? 'bg-zinc-800 border-zinc-600' : 'bg-white border-white'}`} />
                  <p className="text-sm font-semibold text-white leading-tight">
                    {EVENT_ICONS[ev.event_type] ?? '●'} {ev.event_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">{new Date(ev.created_at).toLocaleTimeString()}</p>
                </div>
              ))}
              {/* Future events */}
              {['Ambulance En Route', 'Patient Picked Up', 'Hospital Arrival', 'Admission'].map(label => (
                <div key={label} className="relative opacity-40">
                  <span className="absolute -left-[1.65rem] w-3 h-3 rounded-full border-2 bg-zinc-900 border-zinc-600" />
                  <p className="text-sm font-medium text-zinc-500">{label}</p>
                  <p className="text-xs text-zinc-700 mt-0.5">Pending</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── ERROR ────────────────────────────────────────────────────────────────────
  return (
    <div className={`${wrapper} items-center justify-center px-8 text-center gap-6`}>
      <div className="w-14 h-14 rounded-full bg-red-900/30 flex items-center justify-center text-red-400">
        <X size={28} />
      </div>
      <div>
        <p className="text-lg font-bold text-white mb-1">Something went wrong</p>
        <p className="text-zinc-400 text-sm">{error}</p>
      </div>
      <a href="tel:112" className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-700 text-white font-semibold">
        <Phone size={16} /> Call 112 Now
      </a>
      <button onClick={() => setState('IDLE')} className="text-zinc-500 text-sm hover:text-zinc-300">
        Try Again
      </button>
    </div>
  );
}

// ── Dispatch Card sub-component ───────────────────────────────────────────────

function DispatchCard({
  icon, label, status, detail, detailLine,
}: {
  icon:       React.ReactNode;
  label:      string;
  status:     DispatchStatus;
  detail:     Record<string, unknown> | null;
  detailLine: (d: Record<string, unknown>) => string;
}) {
  return (
    <div className="rounded-2xl bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-300">
          {icon}
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium text-white ${statusColor[status]}`}>
          {statusLabel[status]}
        </span>
      </div>
      {status === 'SEARCHING' && (
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full animate-pulse w-2/3" />
        </div>
      )}
      {status === 'MATCHED' && detail && (
        <p className="text-xs text-zinc-400">{detailLine(detail)}</p>
      )}
    </div>
  );
}
