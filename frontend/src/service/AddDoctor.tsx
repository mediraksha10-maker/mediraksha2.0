import { useState, useEffect, type ChangeEvent } from "react";
import {
  ArrowLeft, Search, UserCheck, UserMinus, Stethoscope,
  Building2, Phone, Mail, Star, AlertCircle, CheckCircle2,
  Loader2, X, ShieldCheck
} from "lucide-react";
import { useNavigate } from "react-router";
import api from "../api/Api";

/* ── Types ── */
interface Doctor {
  id: string;
  name: string;
  email: string;
  number: string;
  age: number;
  gender: string;
  hospital: string;
  speciality: string;
  created_at: string;
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

/* ── Specialty color map ── */
const SPECIALITY_COLORS: Record<string, string> = {
  Cardiologist:    "bg-rose-50 text-rose-600 border-rose-200",
  Dermatologist:   "bg-amber-50 text-amber-600 border-amber-200",
  Pediatrician:    "bg-sky-50 text-sky-600 border-sky-200",
  Neurologist:     "bg-violet-50 text-violet-600 border-violet-200",
  Orthopedic:      "bg-emerald-50 text-emerald-600 border-emerald-200",
  default:         "bg-indigo-50 text-indigo-600 border-indigo-200",
};

const specialityStyle = (s: string) =>
  SPECIALITY_COLORS[s] || SPECIALITY_COLORS.default;

export default function AddDoctor() {
  /* ── State ── */
  const [myDoctor,       setMyDoctor]       = useState<Doctor | null>(null);
  const [searchQuery,    setSearchQuery]    = useState<string>("");
  const [searchResults,  setSearchResults]  = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const [loadingMy,      setLoadingMy]      = useState<boolean>(true);
  const [loadingSearch,  setLoadingSearch]  = useState<boolean>(false);
  const [loadingAction,  setLoadingAction]  = useState<boolean>(false);
  const [toast,          setToast]          = useState<ToastState | null>(null);

  const navigate = useNavigate();

  /* ── Toast helper ── */
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── Fetch registered doctor on mount ── */
  useEffect(() => {
    const fetchMyDoctor = async () => {
      try {
        setLoadingMy(true);
        const res = await api.get("/user/doctor/my");
        if (res.data?.success) setMyDoctor(res.data.data);
      } catch (err: any) {
        if (err.response?.status === 401) navigate("/auth");
        // 404 = no doctor registered yet — that's fine, show search UI
      } finally {
        setLoadingMy(false);
      }
    };
    fetchMyDoctor();
  }, [navigate]);

  /* ── Debounced search ── */
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }

    const delay = setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const res = await api.get(`/user/doctor/search/${encodeURIComponent(searchQuery.trim())}`);
        if (res.data?.success) setSearchResults(res.data.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [searchQuery]);

  /* ── Register doctor (GET /:doctorId auto-registers if none set) ── */
  const handleRegister = async (doctor: Doctor) => {
    setLoadingAction(true);
    try {
      const res = await api.get(`/user/doctor/${doctor.id}`);
      if (res.data?.success) {
        setMyDoctor(doctor);
        setSelectedDoctor(null);
        setSearchQuery("");
        setSearchResults([]);
        showToast(res.data.message || "Doctor registered successfully!", "success");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to register doctor.";
      if (err.response?.status === 401) navigate("/auth");
      else showToast(msg, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  /* ── Remove registered doctor ── */
  const handleRemove = async () => {
    if (!myDoctor) return;
    if (!window.confirm(`Remove Dr. ${myDoctor.name} from your profile?`)) return;

    setLoadingAction(true);
    try {
      const res = await api.delete(`/user/doctor/${myDoctor.id}`);
      if (res.data?.success) {
        setMyDoctor(null);
        showToast("Doctor removed from your profile.", "success");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to remove doctor.";
      if (err.response?.status === 401) navigate("/auth");
      else showToast(msg, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  /* ── Doctor card (reused in search results + detail panel) ── */
  const DoctorCard = ({ doctor, compact = false }: { doctor: Doctor; compact?: boolean }) => (
    <div
      className={`bg-white border border-slate-100 rounded-2xl p-4 transition-all hover:shadow-md hover:border-indigo-200 cursor-pointer ${compact ? "" : "shadow-sm"}`}
      onClick={() => !compact && setSelectedDoctor(doctor)}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm">
          {doctor.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">Dr. {doctor.name}</p>
          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mt-0.5 ${specialityStyle(doctor.speciality)}`}>
            {doctor.speciality}
          </span>
        </div>
        {compact && (
          <button
            onClick={(e) => { e.stopPropagation(); setSelectedDoctor(doctor); }}
            className="text-indigo-400 hover:text-indigo-600 transition-colors"
          >
            <Search size={14} />
          </button>
        )}
      </div>
      {!compact && (
        <div className="mt-3 space-y-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-2"><Building2 size={12} className="shrink-0 text-slate-400" />{doctor.hospital}</div>
          <div className="flex items-center gap-2"><Phone size={12} className="shrink-0 text-slate-400" />{doctor.number}</div>
          <div className="flex items-center gap-2"><Mail size={12} className="shrink-0 text-slate-400" />{doctor.email}</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Toast ── */}
        {toast && (
          <div className={`fixed top-6 right-6 z-200 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border text-sm font-semibold transition-all
            ${toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"}`}>
            {toast.type === "success"
              ? <CheckCircle2 size={18} className="shrink-0" />
              : <AlertCircle size={18} className="shrink-0" />}
            {toast.message}
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <button
            onClick={() => navigate("/services")}
            className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">My Doctor</h1>
            <p className="text-sm text-slate-500">Find and manage your registered healthcare provider</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── LEFT: Registered Doctor Panel ── */}
          <div className="lg:col-span-5 space-y-4">

            {/* Registered Doctor Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                <h2 className="font-bold text-slate-800">Registered Doctor</h2>
              </div>

              <div className="p-6">
                {loadingMy ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={28} className="text-indigo-500 animate-spin" />
                  </div>
                ) : myDoctor ? (
                  <div className="space-y-4">
                    {/* Doctor Hero */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                        {myDoctor.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-lg leading-tight">Dr. {myDoctor.name}</h3>
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border mt-1 ${specialityStyle(myDoctor.speciality)}`}>
                          {myDoctor.speciality}
                        </span>
                      </div>
                    </div>

                    {/* Info rows */}
                    <div className="space-y-2.5 bg-slate-50 rounded-xl p-4">
                      {[
                        { icon: <Building2 size={14} />, value: myDoctor.hospital },
                        { icon: <Phone size={14} />,     value: myDoctor.number   },
                        { icon: <Mail size={14} />,      value: myDoctor.email    },
                        { icon: <Star size={14} />,      value: `${myDoctor.speciality} · ${myDoctor.gender}, ${myDoctor.age} yrs` },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                          <span className="text-slate-400 shrink-0">{row.icon}</span>
                          <span className="truncate">{row.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Member since */}
                    <p className="text-[11px] text-slate-400 text-right">
                      Registered since {new Date(myDoctor.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                    </p>

                    {/* Remove */}
                    <button
                      onClick={handleRemove}
                      disabled={loadingAction}
                      className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-600 font-bold py-2.5 rounded-xl border border-rose-200 transition-all text-sm"
                    >
                      {loadingAction
                        ? <Loader2 size={16} className="animate-spin" />
                        : <UserMinus size={16} />}
                      {loadingAction ? "Removing..." : "Remove Doctor"}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Stethoscope size={32} className="text-slate-300" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">No doctor registered</p>
                      <p className="text-sm text-slate-400 mt-0.5">Search and select a doctor from the panel →</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Search + Results + Detail ── */}
          <div className="lg:col-span-7 space-y-4">

            {/* Search Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="relative">
                {loadingSearch
                  ? <Loader2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" />
                  : <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />}
                <input
                  type="text"
                  placeholder="Search doctors by name or specialty..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  value={searchQuery}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); setSearchResults([]); setSelectedDoctor(null); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                <p className="text-xs text-slate-400 mt-2 pl-1">Type at least 2 characters to search</p>
              )}
            </div>

            {/* ── Doctor Detail Panel (after clicking a result) ── */}
            {selectedDoctor && (
              <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
                <div className="bg-linear-to-r from-indigo-600 to-violet-600 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-lg">
                        {selectedDoctor.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-black text-lg leading-tight">Dr. {selectedDoctor.name}</p>
                        <p className="text-indigo-200 text-sm font-semibold">{selectedDoctor.speciality}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedDoctor(null)}
                      className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Hospital",    value: selectedDoctor.hospital,   icon: <Building2 size={14} /> },
                      { label: "Phone",       value: selectedDoctor.number,     icon: <Phone size={14} />     },
                      { label: "Email",       value: selectedDoctor.email,      icon: <Mail size={14} />      },
                      { label: "Gender/Age",  value: `${selectedDoctor.gender}, ${selectedDoctor.age} yrs`, icon: <Star size={14} /> },
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          {item.icon}
                          <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                        </div>
                        <p className="text-slate-800 text-sm font-semibold truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Register CTA */}
                  {myDoctor?.id === selectedDoctor.id ? (
                    <div className="flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold py-3 rounded-xl text-sm">
                      <UserCheck size={16} /> Already your registered doctor
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRegister(selectedDoctor)}
                      disabled={loadingAction || !!myDoctor}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md"
                    >
                      {loadingAction
                        ? <Loader2 size={16} className="animate-spin" />
                        : <UserCheck size={16} />}
                      {loadingAction
                        ? "Registering..."
                        : myDoctor
                          ? "Remove current doctor first"
                          : "Register This Doctor"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Search Results Grid ── */}
            {!selectedDoctor && searchResults.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                  {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {searchResults.map(doctor => (
                    <DoctorCard key={doctor.id} doctor={doctor} />
                  ))}
                </div>
              </div>
            )}

            {/* No results state */}
            {!selectedDoctor && searchQuery.trim().length >= 2 && !loadingSearch && searchResults.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Search size={24} className="text-slate-300" />
                </div>
                <div>
                  <p className="font-bold text-slate-700">No doctors found</p>
                  <p className="text-sm text-slate-400 mt-0.5">Try a different name or specialty</p>
                </div>
              </div>
            )}

            {/* Default empty state (no query) */}
            {!selectedDoctor && searchQuery.trim().length < 2 && (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center">
                  <Stethoscope size={28} className="text-indigo-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-lg">Find your doctor</p>
                  <p className="text-sm text-slate-400 mt-1 max-w-xs">
                    Search by name or specialty to find and register your primary healthcare provider.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}