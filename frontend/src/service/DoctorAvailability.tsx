import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Calendar, Clock, Stethoscope, Building2,
  CheckCircle2, AlertCircle, Loader2, RefreshCw,
  ChevronLeft, ChevronRight, CalendarDays, Info
} from "lucide-react";
import { useNavigate } from "react-router";
import api from "../api/Api";

/* ── Types ── */
interface Doctor {
  id: string;
  name: string;
  speciality: string;
  hospital: string;
}

interface Slot {
  id: string;
  bookingDate: string;  // "YYYY-MM-DD"
  status: string;
}

interface GroupedSlots {
  [date: string]: Slot[];
}

interface ToastState {
  message: string;
  type: "success" | "error" | "info";
}

/* ── Helpers ── */
const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric"
  });

const formatShortDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric"
  });

const isToday = (dateStr: string): boolean =>
  new Date(dateStr).toDateString() === new Date().toDateString();

const isTomorrow = (dateStr: string): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Date(dateStr).toDateString() === tomorrow.toDateString();
};

const getDayLabel = (dateStr: string): string => {
  if (isToday(dateStr)) return "Today";
  if (isTomorrow(dateStr)) return "Tomorrow";
  return formatShortDate(dateStr);
};

// Group flat slot array by bookingDate
const groupSlotsByDate = (slots: Slot[]): GroupedSlots => {
  return slots.reduce<GroupedSlots>((acc, slot) => {
    const day = slot.bookingDate.split("T")[0];
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {});
};

/* ── Specialty color badge ── */
const SPECIALITY_COLORS: Record<string, string> = {
  Cardiologist:  "bg-rose-50 text-rose-600 border-rose-200",
  Dermatologist: "bg-amber-50 text-amber-600 border-amber-200",
  Pediatrician:  "bg-sky-50 text-sky-600 border-sky-200",
  Neurologist:   "bg-violet-50 text-violet-600 border-violet-200",
  Orthopedic:    "bg-emerald-50 text-emerald-600 border-emerald-200",
  default:       "bg-indigo-50 text-indigo-600 border-indigo-200",
};

const specialityStyle = (s: string) =>
  SPECIALITY_COLORS[s] || SPECIALITY_COLORS.default;

/* ── Week date strip helpers ── */
const getWeekDates = (anchor: Date): Date[] => {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay()); // Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

const toYMD = (d: Date): string => d.toISOString().split("T")[0];

export default function DoctorAvailability() {
  const [doctor,        setDoctor]        = useState<Doctor | null>(null);
  const [slots,         setSlots]         = useState<Slot[]>([]);
  const [grouped,       setGrouped]       = useState<GroupedSlots>({});
  const [selectedDate,  setSelectedDate]  = useState<string>("");
  const [selectedSlot,  setSelectedSlot]  = useState<string>("");
  const [weekAnchor,    setWeekAnchor]    = useState<Date>(new Date());
  const [filterDate,    setFilterDate]    = useState<string>("");

  const [loadingDoc,    setLoadingDoc]    = useState<boolean>(true);
  const [loadingSlots,  setLoadingSlots]  = useState<boolean>(false);
  const [booking,       setBooking]       = useState<boolean>(false);
  const [toast,         setToast]         = useState<ToastState | null>(null);

  const navigate = useNavigate();

  const showToast = (message: string, type: ToastState["type"], ms = 4000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), ms);
  };

  /* ── 1. Load registered doctor ── */
  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        setLoadingDoc(true);
        const res = await api.get("/user/doctor/my");
        if (res.data?.success) setDoctor(res.data.data);
      } catch (err: any) {
        if (err.response?.status === 401) navigate("/auth");
        else if (err.response?.status === 404) {
          showToast("No doctor registered yet. Add one from My Doctor.", "info");
        }
      } finally {
        setLoadingDoc(false);
      }
    };
    fetchDoctor();
  }, [navigate]);

  /* ── 2. Fetch slots whenever doctor or filterDate changes ── */
  const fetchSlots = useCallback(async (doc: Doctor, date?: string) => {
    try {
      setLoadingSlots(true);
      setSelectedSlot("");
      const params = date ? `?date=${date}` : "";
      const res = await api.get(`/user/meetings/slot/${doc.id}${params}`);

      if (res.data?.success) {
        const fetched: Slot[] = res.data.availableSlots || [];
        setSlots(fetched);
        setGrouped(groupSlotsByDate(fetched));

        // Auto-select the first date that has slots
        const dates = Object.keys(groupSlotsByDate(fetched)).sort();
        if (dates.length > 0 && !selectedDate) {
          setSelectedDate(dates[0]);
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401) navigate("/auth");
      else showToast("Failed to load available slots.", "error");
      setSlots([]);
      setGrouped({});
    } finally {
      setLoadingSlots(false);
    }
  }, [navigate, selectedDate]);

  useEffect(() => {
    if (doctor) fetchSlots(doctor, filterDate || undefined);
  }, [doctor, filterDate]);

  /* ── 3. Book selected slot ── */
  const handleBook = async () => {
    if (!doctor || !selectedSlot || !selectedDate) return;

    setBooking(true);
    try {
      const res = await api.post("/user/meetings/book", {
        doctorId:        doctor.id,
        slotId:          selectedSlot,
        appointmentDate: selectedDate,
      });

      if (res.data?.success) {
        showToast("Appointment booked successfully!", "success");
        setSelectedSlot("");
        // Refresh slots to remove the now-booked one
        await fetchSlots(doctor, filterDate || undefined);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Booking failed. Try again.";
      if (err.response?.status === 401) navigate("/auth");
      else showToast(msg, "error");
    } finally {
      setBooking(false);
    }
  };

  /* ── Week strip dates ── */
  const weekDates   = getWeekDates(weekAnchor);
  const prevWeek    = () => { const d = new Date(weekAnchor); d.setDate(d.getDate() - 7); setWeekAnchor(d); };
  const nextWeek    = () => { const d = new Date(weekAnchor); d.setDate(d.getDate() + 7); setWeekAnchor(d); };
  const sortedDates = Object.keys(grouped).sort();

  /* ── Slots visible for the active date tab ── */
  const visibleSlots = selectedDate ? (grouped[selectedDate] || []) : [];

  /* ── Loading: doctor fetch ── */
  if (loadingDoc) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-indigo-500 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading doctor info...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Toast ── */}
        {toast && (
          <div className={`fixed top-6 right-6 z-200 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border text-sm font-semibold
            ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : toast.type === "error"   ? "bg-rose-50 border-rose-200 text-rose-800"
            :                            "bg-sky-50 border-sky-100 text-sky-800"}`}>
            {toast.type === "success" ? <CheckCircle2 size={18} />
            : toast.type === "error"  ? <AlertCircle size={18} />
            :                           <Info size={18} />}
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Doctor Availability</h1>
            <p className="text-sm text-slate-500">Browse and book open slots with your doctor</p>
          </div>
          {doctor && (
            <button
              onClick={() => fetchSlots(doctor, filterDate || undefined)}
              disabled={loadingSlots}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 transition-colors disabled:opacity-50"
              title="Refresh slots"
            >
              <RefreshCw size={16} className={loadingSlots ? "animate-spin" : ""} />
            </button>
          )}
        </div>

        {/* ── No doctor state ── */}
        {!doctor ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Stethoscope size={28} className="text-slate-300" />
            </div>
            <div>
              <p className="font-bold text-slate-700 text-lg">No doctor registered</p>
              <p className="text-sm text-slate-400 mt-1">Register a doctor first to view their availability.</p>
            </div>
            <button
              onClick={() => navigate("/adddoctor")}
              className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md"
            >
              Find a Doctor
            </button>
          </div>
        ) : (
          <>
            {/* ── Doctor Info Banner ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                  {doctor.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-black text-slate-800 text-lg leading-tight">Dr. {doctor.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${specialityStyle(doctor.speciality)}`}>
                      {doctor.speciality}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Building2 size={11} /> {doctor.hospital}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-black text-indigo-600">{slots.length}</p>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide">Open Slots</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* ── LEFT: Week strip + Date filter ── */}
              <div className="lg:col-span-4 space-y-4">

                {/* Week navigator */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                      <CalendarDays size={15} className="text-indigo-500" /> Browse Week
                    </h3>
                    <div className="flex gap-1">
                      <button onClick={prevWeek} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                        <ChevronLeft size={14} />
                      </button>
                      <button onClick={nextWeek} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* 7-day strip */}
                  <div className="grid grid-cols-7 gap-1">
                    {weekDates.map((d) => {
                      const ymd      = toYMD(d);
                      const hasSlots = !!grouped[ymd]?.length;
                      const isActive = selectedDate === ymd;
                      const todayDay = isToday(ymd);

                      return (
                        <button
                          key={ymd}
                          onClick={() => { if (hasSlots) { setSelectedDate(ymd); setSelectedSlot(""); } }}
                          disabled={!hasSlots}
                          className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all text-center
                            ${isActive
                              ? "bg-indigo-600 text-white shadow-md"
                              : hasSlots
                                ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                                : "text-slate-300 cursor-not-allowed"}`}
                        >
                          <span className="text-[9px] font-bold uppercase">
                            {d.toLocaleDateString(undefined, { weekday: "short" })}
                          </span>
                          <span className={`text-sm font-black mt-0.5 ${todayDay && !isActive ? "text-indigo-600" : ""}`}>
                            {d.getDate()}
                          </span>
                          {hasSlots && (
                            <span className={`w-1 h-1 rounded-full mt-1 ${isActive ? "bg-white" : "bg-indigo-400"}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Month label */}
                  <p className="text-center text-[11px] text-slate-400 font-semibold mt-3">
                    {weekDates[0].toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </p>
                </div>

                {/* Date filter (optional manual override) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <label className="block text-xs font-bold text-slate-600 mb-2 items-center gap-1.5">
                    <Calendar size={13} /> Filter from date
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={filterDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={e => { setFilterDate(e.target.value); setSelectedDate(""); setSelectedSlot(""); }}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    {filterDate && (
                      <button
                        onClick={() => { setFilterDate(""); setSelectedDate(""); setSelectedSlot(""); }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* All available dates list */}
                {sortedDates.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                    <h3 className="font-bold text-slate-700 text-sm mb-3">All Available Dates</h3>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {sortedDates.map(date => (
                        <button
                          key={date}
                          onClick={() => { setSelectedDate(date); setSelectedSlot(""); }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all
                            ${selectedDate === date
                              ? "bg-indigo-600 text-white font-bold shadow-sm"
                              : "bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700"}`}
                        >
                          <span className="font-semibold">{getDayLabel(date)}</span>
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full
                            ${selectedDate === date ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"}`}>
                            {grouped[date].length}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── RIGHT: Slots for selected date ── */}
              <div className="lg:col-span-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-125 flex flex-col">

                  {/* Panel header */}
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">
                          {selectedDate ? formatDate(selectedDate) : "Select a date"}
                        </h3>
                        {selectedDate && (
                          <p className="text-sm text-slate-500 mt-0.5">
                            {visibleSlots.length} slot{visibleSlots.length !== 1 ? "s" : ""} available
                            {isToday(selectedDate) && (
                              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Today</span>
                            )}
                          </p>
                        )}
                      </div>
                      {selectedSlot && (
                        <button
                          onClick={handleBook}
                          disabled={booking}
                          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all"
                        >
                          {booking ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                          {booking ? "Booking..." : "Confirm Booking"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 p-6">
                    {loadingSlots ? (
                      <div className="flex flex-col items-center justify-center h-64 gap-3">
                        <Loader2 size={28} className="text-indigo-500 animate-spin" />
                        <p className="text-sm text-slate-400">Loading available slots...</p>
                      </div>

                    ) : !selectedDate ? (
                      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                          <Clock size={24} className="text-slate-300" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-600">Pick a date</p>
                          <p className="text-sm text-slate-400 mt-0.5">
                            {sortedDates.length > 0
                              ? "Select a highlighted date from the calendar or list"
                              : "No slots available. Try a different date range."}
                          </p>
                        </div>
                      </div>

                    ) : visibleSlots.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                          <CalendarDays size={24} className="text-slate-300" />
                        </div>
                        <p className="font-bold text-slate-600">No slots on this day</p>
                        <p className="text-sm text-slate-400">Choose another date from the list</p>
                      </div>

                    ) : (
                      <>
                        {/* Selection hint */}
                        {!selectedSlot && (
                          <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
                            <Info size={12} /> Click a slot to select it, then confirm your booking
                          </p>
                        )}

                        {/* Slot grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {visibleSlots.map((slot) => {
                            const isSelected = selectedSlot === slot.id;
                            // Display time from bookingDate if it contains time, else show date only
                            const timeStr = slot.bookingDate.includes("T")
                              ? new Date(slot.bookingDate).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                              : "All day";

                            return (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot(isSelected ? "" : slot.id)}
                                className={`relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2 transition-all font-bold text-sm
                                  ${isSelected
                                    ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-[1.02]"
                                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"}`}
                              >
                                {/* Checkmark when selected */}
                                {isSelected && (
                                  <span className="absolute top-2 right-2">
                                    <CheckCircle2 size={14} className="text-white" />
                                  </span>
                                )}
                                <Clock size={18} className={isSelected ? "text-white/80" : "text-slate-400"} />
                                <span>{timeStr}</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider
                                  ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                                  Available
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Sticky bottom confirm bar when a slot is picked */}
                        {selectedSlot && (
                          <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={18} className="text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-indigo-800">Slot selected</p>
                                <p className="text-xs text-indigo-600">{formatDate(selectedDate)} · Dr. {doctor.name}</p>
                              </div>
                            </div>
                            <button
                              onClick={handleBook}
                              disabled={booking}
                              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all whitespace-nowrap"
                            >
                              {booking ? <Loader2 size={15} className="animate-spin" /> : null}
                              {booking ? "Booking..." : "Confirm →"}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}