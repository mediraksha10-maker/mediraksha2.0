import React, { useState, useEffect } from "react";
import {
  Building2, MapPin, ShieldCheck,
  ArrowLeft, Search, Activity, BedDouble,
  Phone, Star, Wind, Calendar, ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router";
import api from "../api/Api";

/* ── Types ── */
interface HospitalData {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  rating?: number | string;
  bed?: number;
  room?: number;
  oxygenCylinder?: number;
  specialties?: string[] | string;
  image?: string;
}

interface BedBooking {
  id: number;
  hospitalName: string;
  bedsRequested: number;
  status: "active" | "cancelled";
  created_at: string;
}

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800";

export default function Hospital() {
  const [hospitals, setHospitals]           = useState<HospitalData[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<HospitalData | null>(null);
  const [searchQuery, setSearchQuery]       = useState<string>("");
  const [loading, setLoading]               = useState<boolean>(true);
  const [error, setError]                   = useState<string | null>(null);
  const [bedBookings, setBedBookings]       = useState<BedBooking[]>([]);
  const [bookingHospitalId, setBookingHospitalId] = useState<number | null>(null);
  const [notice, setNotice]                 = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/hospital/all");
        const data = res.data?.data ?? res.data;
        if (Array.isArray(data)) setHospitals(data);
        else throw new Error("Unexpected API response structure.");
        setError(null);
      } catch (err: any) {
        setError(err.message || "Something went wrong while loading hospitals.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchBedBookings = async () => {
    try {
      const res = await api.get("/hospital/bed-bookings/my");
      if (res.data?.success) setBedBookings(res.data.data || []);
    } catch (err: any) {
      if (err.response?.status !== 401) console.error(err);
    }
  };

  useEffect(() => { fetchBedBookings(); }, []);

  const getSpecialties = (h: HospitalData): string[] => {
    if (!h.specialties) return ["General Medicine", "Emergency Care"];
    if (Array.isArray(h.specialties)) return h.specialties;
    if (typeof h.specialties === "string")
      return h.specialties.replace(/[{}" ]/g, "").split(",");
    return [];
  };

  const filteredHospitals = (Array.isArray(hospitals) ? hospitals : []).filter(h => {
    const nm = h.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const sp = getSpecialties(h).join(" ").toLowerCase().includes(searchQuery.toLowerCase());
    return nm || sp;
  });

  const requestBed = async (hospital: HospitalData) => {
    setBookingHospitalId(hospital.id);
    setNotice("");
    try {
      const res = await api.post(`/hospital/${hospital.id}/bed-bookings`, {
        bedsRequested: 1,
        hospitalName: hospital.name,
      });
      if (res.data?.success) {
        setNotice(`Bed request created for ${hospital.name}.`);
        setHospitals(prev =>
          prev.map(item =>
            item.id === hospital.id
              ? { ...item, bed: Math.max((item.bed || 0) - 1, 0) }
              : item
          )
        );
        fetchBedBookings();
      }
    } catch (err: any) {
      if (err.response?.status === 401) { navigate("/auth"); return; }
      setNotice(err.response?.data?.message || "Could not create bed request.");
    } finally {
      setBookingHospitalId(null);
    }
  };

  const cancelBedBooking = async (booking: BedBooking) => {
    if (!window.confirm("Cancel this bed booking request?")) return;
    try {
      const res = await api.delete(`/hospital/bed-bookings/${booking.id}`);
      if (res.data?.success) {
        setNotice("Bed booking cancelled.");
        fetchBedBookings();
        const refreshed = await api.get("/hospital/all");
        if (refreshed.data?.success && Array.isArray(refreshed.data.data)) {
          setHospitals(refreshed.data.data);
          const updated = refreshed.data.data.find((i: HospitalData) => i.id === selectedHospital?.id);
          if (updated) setSelectedHospital(updated);
        }
      }
    } catch (err: any) {
      setNotice(err.response?.data?.message || "Could not cancel bed booking.");
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-11 h-11 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading medical centers…</p>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-rose-100 rounded-2xl p-8 max-w-md text-center shadow-sm">
          <p className="text-rose-600 font-bold text-lg mb-2">Connection Error</p>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  /* ── Spec chip colors (cycling) ── */
  const chipColors = [
    "bg-indigo-50 border-indigo-100 text-indigo-700",
    "bg-violet-50 border-violet-100 text-violet-700",
    "bg-blue-50 border-blue-100 text-blue-700",
    "bg-emerald-50 border-emerald-100 text-emerald-700",
    "bg-amber-50 border-amber-100 text-amber-700",
    "bg-rose-50 border-rose-100 text-rose-600",
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 via-blue-50 to-indigo-100 py-8 px-4 md:px-8 font-sans">
      <button
        onClick={() => navigate("/")}
        className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs transition-all"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="max-w-6xl mx-auto">
        {notice && (
          <div className="mb-4 bg-white border-l-4 border-indigo-500 text-slate-700 rounded-xl px-4 py-3 text-sm font-semibold shadow-xs">
            {notice}
          </div>
        )}

        {/* ════════════════════════════════════════
            DETAIL VIEW
        ════════════════════════════════════════ */}
        {selectedHospital ? (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">

            <button
              onClick={() => setSelectedHospital(null)}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft size={16} /> Hospital Directory
            </button>

            {/* Hero card */}
            <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-200/30 overflow-hidden">

              {/* Hero image with gradient overlay */}
              <div className="relative h-64 md:h-80 overflow-hidden">
                <img
                  src={selectedHospital.image || FALLBACK_IMG}
                  alt={selectedHospital.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-900/30 to-transparent" />

                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="flex items-center gap-1 bg-rose-600/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg">
                    ⚡ 24/7 Emergency
                  </span>
                  <span className="flex items-center gap-1 bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg">
                    <ShieldCheck size={10} /> Verified
                  </span>
                </div>

                {/* Name + address overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight drop-shadow mb-1">
                    {selectedHospital.name}
                  </h2>
                  <p className="text-slate-300 text-sm flex items-center gap-1.5 font-medium">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    {selectedHospital.address || "Medical District Campus"}
                  </p>
                </div>
              </div>

              {/* Floating stats strip */}
              <div className="grid grid-cols-4 divide-x divide-slate-100 bg-white border-b border-slate-100">
                {[
                  { icon: <Star size={15} className="fill-amber-400 text-amber-400" />, label: "Rating",      value: String(selectedHospital.rating || "4.5"), color: "text-amber-600",  bg: "bg-amber-50"   },
                  { icon: <BedDouble size={15} className="text-indigo-500" />,          label: "Total Beds",  value: String(selectedHospital.bed ?? 0),         color: "text-indigo-700", bg: "bg-indigo-50"  },
                  { icon: <Wind size={15} className="text-sky-500" />,                  label: "O₂ Cylinders",value: String(selectedHospital.oxygenCylinder ?? 0), color: "text-sky-700", bg: "bg-sky-50"    },
                  { icon: <Building2 size={15} className="text-violet-500" />,          label: "Rooms",       value: String(selectedHospital.room ?? "—"),      color: "text-violet-700", bg: "bg-violet-50"  },
                ].map(({ icon, label, value, color, bg }) => (
                  <div key={label} className="py-4 flex flex-col items-center gap-1.5">
                    <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
                    <p className={`text-lg font-black ${color} leading-none`}>{value}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                  </div>
                ))}
              </div>

              {/* Body */}
              <div className="p-6 md:p-8 space-y-6">

                {/* Specialties */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Activity size={13} className="text-indigo-600" /> Specialised Departments
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {getSpecialties(selectedHospital).map((spec, i) => (
                      <span
                        key={i}
                        className={`border font-bold text-xs px-3 py-1.5 rounded-xl ${chipColors[i % chipColors.length]}`}
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Contact */}
                {selectedHospital.phone && (
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Phone size={15} className="text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                      <p className="text-sm font-bold text-slate-700">{selectedHospital.phone}</p>
                    </div>
                    <a
                      href={`tel:${selectedHospital.phone}`}
                      className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-all"
                    >
                      Call
                    </a>
                  </div>
                )}

                {/* CTA row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl">
                    <ShieldCheck size={16} /> Verified Mediraksha Partner
                  </div>
                  <button
                    onClick={() => requestBed(selectedHospital)}
                    disabled={!selectedHospital.bed || bookingHospitalId === selectedHospital.id}
                    className="w-full sm:w-auto bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-bold text-sm px-8 py-3.5 rounded-xl shadow-md shadow-indigo-400/30 transition-all cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {bookingHospitalId === selectedHospital.id ? "Requesting…" : "Book 1 Bed"}
                  </button>
                </div>
              </div>
            </div>

            {/* My Bed Bookings */}
            {bedBookings.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <BedDouble size={15} className="text-indigo-600" />
                  </div>
                  <h3 className="font-black text-slate-800">My Bed Requests</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {bedBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${booking.status !== "cancelled" ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{booking.hospitalName}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar size={10} />
                            {booking.bedsRequested} bed · {new Date(booking.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {booking.status !== "cancelled" ? (
                        <button
                          onClick={() => cancelBedBooking(booking)}
                          className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl px-3 py-1.5 shrink-0 border border-rose-100 transition-all"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">Cancelled</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        ) : (
          /* ════════════════════════════════════════
              LIST VIEW
          ════════════════════════════════════════ */
          <div className="space-y-6 animate-in fade-in duration-200">

            {/* Header bar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="bg-linear-to-r from-indigo-600 to-violet-600 px-6 py-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                        <Building2 size={15} className="text-white" />
                      </div>
                      <h1 className="text-xl font-black text-white tracking-tight">Empaneled Medical Centers</h1>
                    </div>
                    <p className="text-indigo-200 text-xs font-medium">Real-time facility metrics · Verified hospitals</p>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search hospital or specialty…"
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-white/20 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="px-6 py-2.5 bg-indigo-50/50 border-t border-indigo-100/50">
                <p className="text-[11px] font-bold text-indigo-600">{filteredHospitals.length} hospital{filteredHospitals.length !== 1 ? "s" : ""} found</p>
              </div>
            </div>

            {filteredHospitals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredHospitals.map((hospital) => (
                  <div
                    key={hospital.id}
                    onClick={() => setSelectedHospital(hospital)}
                    className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer overflow-hidden"
                  >
                    {/* Card image */}
                    <div className="h-48 relative bg-slate-100 shrink-0 overflow-hidden">
                      <img
                        src={hospital.image || FALLBACK_IMG}
                        alt={hospital.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-slate-900/70 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3">
                        <span className="text-[10px] font-black text-white bg-rose-500/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow">24/7</span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="font-black text-white text-sm leading-snug drop-shadow line-clamp-1 group-hover:text-indigo-200 transition-colors">
                          {hospital.name}
                        </h3>
                        <p className="text-white/70 text-[10px] flex items-center gap-1 mt-0.5 truncate">
                          <MapPin size={9} className="shrink-0" />{hospital.address || "Medical District"}
                        </p>
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
                        <Star size={10} className="fill-amber-400 text-amber-400" />
                        <span className="text-[10px] font-black text-white">{hospital.rating || "4.5"}</span>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-4 flex flex-col grow">
                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { label: "Beds",    value: hospital.bed ?? 0,               color: "text-indigo-600", bg: "bg-indigo-50" },
                          { label: "Rooms",   value: hospital.room ?? "—",             color: "text-violet-600", bg: "bg-violet-50" },
                          { label: "O₂",      value: hospital.oxygenCylinder ?? 0,     color: "text-sky-600",    bg: "bg-sky-50"    },
                        ].map(({ label, value, color, bg }) => (
                          <div key={label} className={`${bg} rounded-xl py-2 text-center`}>
                            <p className={`text-sm font-black ${color}`}>{value}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Specialties */}
                      <div className="flex flex-wrap gap-1 mb-3 grow">
                        {getSpecialties(hospital).slice(0, 2).map((spec, i) => (
                          <span key={i} className={`border font-bold text-[10px] px-2 py-0.5 rounded-lg ${chipColors[i % chipColors.length]}`}>
                            {spec}
                          </span>
                        ))}
                        {getSpecialties(hospital).length > 2 && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                            +{getSpecialties(hospital).length - 2} more
                          </span>
                        )}
                      </div>

                      {/* Footer actions */}
                      <div className="flex items-center justify-between gap-2 border-t border-slate-50 pt-3 mt-auto">
                        <button
                          onClick={(e) => { e.stopPropagation(); requestBed(hospital); }}
                          disabled={!hospital.bed || bookingHospitalId === hospital.id}
                          className="text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:text-slate-400 disabled:bg-slate-50 px-3 py-1.5 rounded-xl border border-indigo-100 disabled:border-slate-100 transition-all"
                        >
                          {bookingHospitalId === hospital.id ? "Booking…" : "Book Bed"}
                        </button>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">
                          View Details <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center">
                <Building2 size={48} className="mx-auto mb-3 text-slate-200" />
                <p className="text-slate-700 font-bold text-base">No Matching Hospitals Found</p>
                <p className="text-slate-400 text-xs mt-1">Refine your search or verify the query spelling.</p>
              </div>
            )}

            {/* Bed bookings */}
            {bedBookings.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <BedDouble size={15} className="text-indigo-600" />
                  </div>
                  <h3 className="font-black text-slate-800">My Bed Requests</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {bedBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${booking.status !== "cancelled" ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{booking.hospitalName}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar size={10} />
                            {booking.bedsRequested} bed · {new Date(booking.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {booking.status !== "cancelled" ? (
                        <button
                          onClick={() => cancelBedBooking(booking)}
                          className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl px-3 py-1.5 shrink-0 border border-rose-100 transition-all"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">Cancelled</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
