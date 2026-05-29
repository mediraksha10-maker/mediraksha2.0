import { useState, useEffect, type ChangeEvent } from "react";
import {
  ArrowLeft, X, Search, Calendar as CalIcon, Clock,
  User, Plus, Trash2, ChevronLeft, ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router";
import api from '../api/Api';

/* ── Type Definitions ── */
// FIX 2: Fields updated to match real backend response shape
interface Doctor {
  id: string;
  name: string;
  speciality: string;
  hospital: string;
}

interface Slot {
  id: string;
  bookingDate: string;    // "YYYY-MM-DD"
  status: string;
}

interface Appointment {
  id: string;
  doctorName: string;
  speciality: string;
  appointmentDate: string;
  slotTime: string;
  reasonOfAppointment?: string;
  status: "pending" | "confirmed" | "cancelled";
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  extendedProps: Appointment;
}

interface FormState {
  doctorId: string;
  doctorName: string;
  slotId: string;         // FIX 4: slotId is required by bookMeeting
  appointmentDate: string;
  startTime: string;
  reasonOfAppointment: string;
}

/* ── Status Theme Config ── */
const STATUS_CONFIG = {
  pending:   { class: "bg-amber-500 text-white",  dot: "bg-amber-500"  },
  confirmed: { class: "bg-emerald-500 text-white", dot: "bg-emerald-500" },
  cancelled: { class: "bg-rose-500 text-white",   dot: "bg-rose-500"   },
};

export default function AppointmentCalendar() {
  const [events,       setEvents]       = useState<CalendarEvent[]>([]);
  const [meetings,     setMeetings]     = useState<Appointment[]>([]);
  const [doctorSearch, setDoctorSearch] = useState<string>("");
  const [doctors,      setDoctors]      = useState<Doctor[]>([]);
  const [slots,        setSlots]        = useState<Slot[]>([]);   // FIX 4: available slots for selected doctor
  const [showModal,    setShowModal]    = useState<boolean>(false);
  const [loading,      setLoading]      = useState<boolean>(false);
  const [isFetching,   setIsFetching]   = useState<boolean>(true);
  const [error,        setError]        = useState<string>("");

  const [form, setForm] = useState<FormState>({
    doctorId: "",
    doctorName: "",
    slotId: "",
    appointmentDate: "",
    startTime: "",
    reasonOfAppointment: "",
  });

  const navigate = useNavigate();

  // FIX 2: Map backend field names to CalendarEvent shape
  const mapAppointmentsToEvents = (data: Appointment[]) => {
    setMeetings(data);
    const generated = data
      .filter(m => m.status !== "cancelled")
      .map(m => ({
        id: m.id,
        title: `Dr. ${m.doctorName}`,
        start: `${m.appointmentDate.split("T")[0]}T${m.slotTime || "00:00"}`,
        backgroundColor: m.status === "confirmed" ? "#dcfce7" : "#fef3c7",
        textColor:       m.status === "confirmed" ? "#166534" : "#92400e",
        borderColor:     m.status === "confirmed" ? "#22c55e" : "#f59e0b",
        extendedProps: { ...m },
      }));
    setEvents(generated);
  };

  // FIX 1: Replaced mock data load with real GET /api/user/meetings/all
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        setIsFetching(true);
        const response = await api.get('/user/meetings/all');
        if (response.data?.success) {
          mapAppointmentsToEvents(response.data.data);
        }
      } catch (err: any) {
        if (err.response?.status === 401) navigate('/auth');
        // Non-401 errors: just show empty state, don't block the page
      } finally {
        setIsFetching(false);
      }
    };
    fetchMeetings();
  }, [navigate]);

  // FIX 5: Doctor search now calls GET /api/user/doctor/search/:name (real endpoint)
  useEffect(() => {
    if (!doctorSearch.trim()) { setDoctors([]); return; }

    const delay = setTimeout(async () => {
      try {
        const response = await api.get(`/user/doctor/search/${encodeURIComponent(doctorSearch)}`);
        if (response.data?.success) setDoctors(response.data.data || []);
      } catch {
        setDoctors([]);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [doctorSearch]);

  // FIX 4: When a doctor is selected, fetch their available slots
  const handleDoctorSelect = async (doctor: Doctor) => {
    setForm(prev => ({ ...prev, doctorId: doctor.id, doctorName: doctor.name, slotId: "", appointmentDate: "" }));
    setDoctorSearch(`Dr. ${doctor.name} (${doctor.speciality})`);
    setDoctors([]);
    setSlots([]);

    try {
      const response = await api.get(`/user/meetings/slot/${doctor.id}`);
      if (response.data?.success) setSlots(response.data.availableSlots || []);
    } catch {
      setSlots([]);
    }
  };

  // FIX 1 & 4: handleSubmit now calls POST /api/user/meetings/book with all required fields
  const handleSubmit = async (): Promise<void> => {
    setError("");
    if (!form.doctorId || !form.slotId || !form.appointmentDate) {
      setError("Please select a doctor, a date, and an available slot.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/user/meetings/book', {
        doctorId:            form.doctorId,
        slotId:              form.slotId,
        appointmentDate:     form.appointmentDate,
        reasonOfAppointment: form.reasonOfAppointment || null,
      });

      if (response.data?.success) {
        // Refresh the full list from server so calendar reflects real state
        const refresh = await api.get('/user/meetings/all');
        if (refresh.data?.success) mapAppointmentsToEvents(refresh.data.data);

        setShowModal(false);
        resetForm();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Booking failed. Please try again.";
      if (err.response?.status === 401) navigate('/auth');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // FIX 3: handleCancel now calls DELETE /api/user/meetings/:id
  const handleCancel = async (id: string): Promise<void> => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const response = await api.delete(`/user/meetings/${id}`);
      if (response.data?.success) {
        // Optimistically update UI
        const updated = meetings.map(m =>
          m.id === id ? { ...m, status: "cancelled" as const } : m
        );
        mapAppointmentsToEvents(updated);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to cancel appointment.";
      if (err.response?.status === 401) navigate('/auth');
      else alert(msg);
    }
  };

  const resetForm = (): void => {
    setForm({ doctorId: "", doctorName: "", slotId: "", appointmentDate: "", startTime: "", reasonOfAppointment: "" });
    setDoctorSearch("");
    setSlots([]);
    setError("");
  };

  const closeModal = (): void => { setShowModal(false); resetForm(); };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/services')}
              className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Appointments</h2>
              <p className="text-slate-500 text-sm">Schedule and manage your consultations</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-3 rounded-xl transition-all shadow-md cursor-pointer whitespace-nowrap w-full sm:w-auto"
          >
            <Plus size={18} /> New Appointment
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Calendar Grid ── */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-155">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div className="flex gap-1">
                  <button className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"><ChevronLeft size={16} /></button>
                  <button className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"><ChevronRight size={16} /></button>
                  <button className="px-3 py-1 border border-slate-200 rounded-lg text-slate-600 font-semibold text-sm hover:bg-slate-50 ml-1">Today</button>
                </div>
                <h4 className="font-bold text-slate-800 text-lg">June 2026</h4>
                <div className="flex border border-slate-200 rounded-xl overflow-hidden p-0.5 bg-slate-50 text-xs font-bold">
                  <span className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg shadow-sm">Month</span>
                  <span className="text-slate-500 px-3 py-1.5 cursor-pointer hover:text-slate-800">Week</span>
                </div>
              </div>

              <div className="grid grid-cols-7 text-center text-xs font-black tracking-wider text-slate-400 uppercase mb-3">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
              </div>

              <div className="grid grid-cols-7 gap-2 bg-slate-50/50 p-2 rounded-2xl border border-slate-100 min-h-110">
                {Array.from({ length: 31 }).map((_, index) => {
                  const dayNum = index + 1;
                  const dayStr = `2026-06-${dayNum < 10 ? '0' + dayNum : dayNum}`;
                  const dayEvents = events.filter(e => e.start.startsWith(dayStr));

                  return (
                    <div key={index} className="bg-white border border-slate-100 rounded-xl p-1.5 flex flex-col justify-between min-h-19 shadow-2xs hover:border-indigo-200 transition-colors">
                      <span className="text-xs font-bold text-slate-400 self-start p-0.5">{dayNum}</span>
                      <div className="space-y-1 w-full">
                        {dayEvents.map(evt => (
                          <div
                            key={evt.id}
                            style={{ backgroundColor: evt.backgroundColor, color: evt.textColor, borderColor: evt.borderColor }}
                            className="text-[10px] font-bold p-1 rounded border-l-2 truncate cursor-pointer shadow-3xs"
                            onClick={() => alert(`${evt.title}\nTime: ${evt.extendedProps.slotTime}\nReason: ${evt.extendedProps.reasonOfAppointment || 'None'}`)}
                          >
                            {evt.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 italic text-right mt-4">FullCalendar standard plugin view placeholder container.</div>
          </div>

          {/* ── Agenda Sidebar ── */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-155">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CalIcon size={18} className="text-indigo-600" /> Upcoming Agenda
              </h3>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {isFetching ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : meetings.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-30 mt-12">
                    <CalIcon size={48} className="mb-2 text-slate-400" />
                    <p className="text-sm font-semibold">No appointments scheduled</p>
                  </div>
                ) : (
                  meetings.map((m) => (
                    // FIX 2: Use real backend field names
                    <div key={m.id} className="group relative bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-all hover:bg-white hover:shadow-md hover:border-indigo-500/20">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">Dr. {m.doctorName}</p>
                          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">{m.speciality}</p>
                        </div>
                        <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md ${STATUS_CONFIG[m.status].class}`}>
                          {m.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-3">
                        <div className="flex items-center gap-1">
                          <CalIcon size={13} /> {new Date(m.appointmentDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={13} /> {m.slotTime}
                        </div>
                      </div>

                      {m.status !== "cancelled" && (
                        <button
                          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          onClick={() => handleCancel(m.id)}
                          title="Cancel appointment"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Booking Modal ── */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">Schedule Consultation</h3>
                <button onClick={closeModal} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-semibold text-rose-800">{error}</div>
                )}

                {/* Doctor Search */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><User size={14}/> Select Doctor</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      placeholder="Search by name or specialty..."
                      value={doctorSearch}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setDoctorSearch(e.target.value)}
                    />
                  </div>

                  {doctors.length > 0 && (
                    <div className="absolute z-20 w-full bg-white border border-slate-200 shadow-xl rounded-xl mt-1 max-h-48 overflow-y-auto divide-y divide-slate-50">
                      {doctors.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          className="flex flex-col w-full px-4 py-2.5 hover:bg-slate-50 text-left"
                          onClick={() => handleDoctorSelect(d)}
                        >
                          <span className="font-bold text-slate-800 text-sm">Dr. {d.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{d.speciality} · {d.hospital}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* FIX 4: Slot selector — shown once a doctor is chosen */}
                {slots.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock size={14}/> Available Slot
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      value={form.slotId}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                        const chosen = slots.find(s => s.id === e.target.value);
                        setForm(prev => ({
                          ...prev,
                          slotId: e.target.value,
                          appointmentDate: chosen?.bookingDate || "",
                        }));
                      }}
                    >
                      <option value="" disabled>Select a slot</option>
                      {slots.map(s => (
                        <option key={s.id} value={s.id}>
                          {new Date(s.bookingDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {slots.length === 0 && form.doctorId && (
                  <p className="text-xs text-slate-400 italic text-center py-2">No available slots for this doctor.</p>
                )}

                {/* Reason */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Reason for Visit</label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-20 resize-none"
                    placeholder="A brief description of your health concern..."
                    value={form.reasonOfAppointment}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm(prev => ({ ...prev, reasonOfAppointment: e.target.value }))}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all text-sm" onClick={closeModal}>Discard</button>
                  <button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-md"
                    onClick={handleSubmit}
                    disabled={loading || !form.slotId}
                  >
                    {loading ? "Processing..." : "Confirm Booking"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}