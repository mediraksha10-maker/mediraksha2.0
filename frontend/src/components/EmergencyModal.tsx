import { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle, MapPin, Copy, Check, Loader2, Phone, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import Api from '../api/Api';

type Step = 'idle' | 'locating' | 'sending' | 'success' | 'error';

interface EmergencyData {
  emergency_id: string;
  status: string;
  emergency_token: string;
  token_expires_at: string;
  qr_payload: string;
  family_notifications_queued: number;
  created_at: string;
}

export default function EmergencyModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('idle');
  const [data, setData] = useState<EmergencyData | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'locating' && step !== 'sending') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, onClose]);

  const triggerSOS = useCallback(async () => {
    setStep('locating');
    setError('');

    let accuracy: number | null = null;
    let latitude: number;
    let longitude: number;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      );
      latitude  = pos.coords.latitude;
      longitude = pos.coords.longitude;
      accuracy  = pos.coords.accuracy ?? null;
    } catch (e: any) {
      setStep('error');
      setError(
        e.code === 1
          ? 'Location access denied. Please enable GPS permissions and try again.'
          : 'Unable to determine your location. Ensure GPS is enabled and try again.'
      );
      return;
    }

    setStep('sending');
    try {
      const res = await Api.post('/emergency/create', {
        latitude,
        longitude,
        location_accuracy: accuracy,
      });

      if (res.data.success) {
        setData(res.data.data);
        setStep('success');
        toast.success('Emergency services alerted!', { duration: 5000 });
      }
    } catch (e: any) {
      setStep('error');
      const status = e.response?.status;
      if (status === 401) {
        setError('You must be signed in to trigger an emergency alert. Please log in first.');
      } else if (status === 429) {
        setError('Too many emergency requests. Please call 112 directly.');
      } else {
        setError(e.response?.data?.message || 'Failed to create emergency. Call 112 immediately.');
      }
    }
  }, []);

  const copy = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
      toast.success('Copied!', { duration: 1200 });
    } catch {
      toast.error('Copy failed');
    }
  }, []);

  const canClose = step !== 'locating' && step !== 'sending';

  const parseQR = (qr: string) => {
    try { return JSON.stringify(JSON.parse(qr), null, 2); } catch { return qr; }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={canClose ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ── Header ── */}
        <div className="relative bg-linear-to-br from-rose-700 to-rose-500 px-8 pt-8 pb-6 text-white">
          {canClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          )}

          <div className="flex items-center gap-4">
            {/* icon area */}
            <div className="relative shrink-0">
              {step === 'idle' && (
                <>
                  <div className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
                  <div className="relative w-14 h-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                    <ShieldAlert size={26} />
                  </div>
                </>
              )}
              {(step === 'locating' || step === 'sending') && (
                <div className="w-14 h-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                  <Loader2 size={26} className="animate-spin" />
                </div>
              )}
              {step === 'success' && (
                <div className="w-14 h-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                  <Check size={26} />
                </div>
              )}
              {step === 'error' && (
                <div className="w-14 h-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                  <AlertCircle size={26} />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight">
                {step === 'idle'     ? 'Emergency SOS'         :
                 step === 'locating' ? 'Locating You…'         :
                 step === 'sending'  ? 'Alerting Services…'    :
                 step === 'success'  ? 'Help Is On the Way'    :
                                      'Alert Failed'}
              </h2>
              <p className="text-rose-100 text-sm mt-0.5">
                {step === 'idle'     ? 'Instantly alert emergency services'      :
                 step === 'locating' ? 'Capturing your GPS coordinates'          :
                 step === 'sending'  ? 'Contacting emergency network'            :
                 step === 'success'  ? `ID: ${data?.emergency_id}`              :
                                      'Please call 112 directly'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-8 py-6">

          {/* IDLE */}
          {step === 'idle' && (
            <div className="space-y-5">
              <p className="text-slate-600 text-sm leading-relaxed">
                Pressing SOS will capture your GPS location, create a secure emergency token, and
                instantly notify your registered emergency contacts.
              </p>

              <ul className="space-y-2">
                {[
                  [MapPin, 'Your precise GPS location is captured'],
                  [Phone, 'Registered emergency contacts are notified'],
                  [ShieldAlert, 'A secure token is issued for hospital access'],
                ].map(([Icon, label]: any) => (
                  <li key={label} className="flex items-center gap-2.5 text-xs text-slate-500">
                    <Icon size={13} className="text-rose-500 shrink-0" />
                    {label}
                  </li>
                ))}
              </ul>

              <button
                onClick={triggerSOS}
                className="w-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-lg py-4 rounded-2xl transition-all duration-200 tracking-widest shadow-lg shadow-rose-200 uppercase"
              >
                Trigger SOS
              </button>

              <p className="text-center text-xs text-slate-400">
                For genuine emergencies only · Rate limited to 3 triggers per 15 min
              </p>
            </div>
          )}

          {/* LOCATING / SENDING */}
          {(step === 'locating' || step === 'sending') && (
            <div className="py-10 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full border-4 border-rose-100 border-t-rose-500 animate-spin" />
              <p className="font-bold text-slate-700 text-lg">
                {step === 'locating' ? 'Getting your location…' : 'Sending emergency alert…'}
              </p>
              <p className="text-slate-400 text-sm max-w-[240px]">
                {step === 'locating'
                  ? 'Please allow location access when the browser prompts you'
                  : 'Notifying emergency network — this takes only a moment'}
              </p>
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && data && (
            <div className="space-y-4">
              {/* Emergency ID card */}
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Emergency ID</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tight mt-0.5 font-mono">
                      {data.emergency_id}
                    </p>
                  </div>
                  <button
                    onClick={() => copy('id', data.emergency_id)}
                    className="mt-1 w-9 h-9 rounded-xl bg-white border border-rose-100 flex items-center justify-center hover:bg-rose-50 transition-colors shrink-0"
                  >
                    {copied.id
                      ? <Check size={15} className="text-emerald-500" />
                      : <Copy size={15} className="text-rose-400" />}
                  </button>
                </div>

                <div className="border-t border-rose-100 pt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Access Token</p>
                    <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">
                      {data.emergency_token.slice(0, 28)}…
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Expires {new Date(data.token_expires_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => copy('token', data.emergency_token)}
                    className="w-9 h-9 rounded-xl bg-white border border-rose-100 flex items-center justify-center hover:bg-rose-50 transition-colors shrink-0"
                  >
                    {copied.token
                      ? <Check size={15} className="text-emerald-500" />
                      : <Copy size={15} className="text-rose-400" />}
                  </button>
                </div>

                {data.family_notifications_queued > 0 && (
                  <div className="border-t border-rose-100 pt-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <p className="text-xs text-slate-500">
                      <span className="font-bold text-rose-600">{data.family_notifications_queued}</span>{' '}
                      emergency contact{data.family_notifications_queued !== 1 ? 's' : ''} notified
                    </p>
                  </div>
                )}
              </div>

              {/* QR Payload */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hospital QR Payload</p>
                  <button
                    onClick={() => copy('qr', data.qr_payload)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copied.qr ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
                <pre className="text-xs font-mono text-slate-500 whitespace-pre-wrap break-all leading-relaxed">
                  {parseQR(data.qr_payload)}
                </pre>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-2xl transition-all text-sm tracking-wide"
              >
                Close
              </button>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                <p className="text-rose-700 text-sm font-medium leading-relaxed">{error}</p>
              </div>

              <a
                href="tel:112"
                className="flex items-center justify-center gap-3 w-full bg-rose-600 hover:bg-rose-700 text-white font-black py-4 rounded-2xl transition-all text-lg tracking-wide"
              >
                <Phone size={22} /> Call 112
              </a>

              <button
                onClick={() => { setStep('idle'); setError(''); }}
                className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-3 rounded-2xl transition-all text-sm"
              >
                Try Again
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
