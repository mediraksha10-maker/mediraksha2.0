import React, { useState, useEffect, ChangeEvent } from "react";
import { ArrowLeft, X, Search, Calendar as CalIcon, Clock, User, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";

/* ── Type Definitions ── */
interface Doctor {
  _id: string;
  name: string;
  specialization: string;
}

interface Appointment {
  _id: string;
  doctor: {
    name: string;
    specialization: string;
  };
  date: string;
  startTime: string;
  reason?: string;
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
  date: string;
  startTime: string;
  reason: string;
}

/* ── Tailored Theme Configurations ── */
const STATUS_CONFIG = {
  pending: { class: "bg-amber-500 text-white", dot: "bg-amber-500" },
  confirmed: { class: "bg-emerald-500 text-white", dot: "bg-emerald-500" },
  cancelled: { class: "bg-rose-500 text-white", dot: "bg-rose-500" },
};

/* ── Sandbox Mock Database ── */
const MOCK_DOCTORS: Doctor[] = [
  { _id: "doc_1", name: "Sarah Jenkins", specialization: "Cardiologist" },
  { _id: "doc_2", name: "Michael Chang", specialization: "Dermatologist" },
  { _id: "doc_3", name: "Amina Patel", specialization: "Pediatrician" },
  { _id: "doc_4", name: "Robert Vance", specialization: "Neurologist" }
];

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    _id: "apt_1",
    doctor: { name: "Sarah Jenkins", specialization: "Cardiologist" },
    date: "2026-06-02T00:00:00.000Z",
    startTime: "10:30",
    reason: "Routine cardiovascular screening",
    status: "confirmed"
  },
  {
    _id: "apt_2",
    doctor: { name: "Amina Patel", specialization: "Pediatrician" },
    date: "2026-06-14T00:00:00.000Z",
    startTime: "14:15",
    reason: "Childhood allergy consultation follow-up",
    status: "pending"
  }
];

export default function AppointmentCalendar() {
  // --- Core State Management ---
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [meetings, setMeetings] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorSearch, setDoctorSearch] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [form, setForm] = useState<FormState>({
    doctorId: "",
    doctorName: "",
    date: "",
    startTime: "",
    reason: "",
  });

  // --- Initialize Sandbox Dataset ---
  useEffect(() => {
    mapAppointmentsToEvents(MOCK_APPOINTMENTS);
  }, []);

  const mapAppointmentsToEvents = (data: Appointment[]) => {
    setMeetings(data);
    const generatedEvents = data
      .filter((m) => m.status !== "cancelled")
      .map((m) => ({
        id: m._id,
        title: `Dr. ${m.doctor?.name}`,
        start: `${m.date.split("T")[0]}T${m.startTime}`,
        backgroundColor: m.status === "confirmed" ? "#dcfce7" : "#fef3c7",
        textColor: m.status === "confirmed" ? "#166534" : "#92400e",
        borderColor: m.status === "confirmed" ? "#22c55e" : "#f59e0b",
        extendedProps: { ...m },
      }));
    setEvents(generatedEvents);
  };

  // --- Real-Time Debounced Query Filter ---
  useEffect(() => {
    if (!doctorSearch.trim()) { setDoctors([]); return; }
    
    const delay = setTimeout(() => {
      const filtered = MOCK_DOCTORS.filter(
        d => d.name.toLowerCase().includes(doctorSearch.toLowerCase()) || 
             d.specialization.toLowerCase().includes(doctorSearch.toLowerCase())
      );
      setDoctors(filtered);
    }, 250);

    return () => clearTimeout(delay);
  }, [doctorSearch]);

  // --- Event Handling Interactions ---
  const handleSubmit = (): void => {
    setError("");
    if (!form.doctorId || !form.date || !form.startTime) {
      setError("Please fill in all required fields.");
      return;
    }
    
    setLoading(true);

    setTimeout(() => {
      const selectedDoc = MOCK_DOCTORS.find(d => d._id === form.doctorId);
      const newAppointment: Appointment = {
        _id: `apt_${Date.now()}`,
        doctor: {
          name: selectedDoc?.name || form.doctorName,
          specialization: selectedDoc?.specialization || "General Medicine"
        },
        date: new Date(form.date).toISOString(),
        startTime: form.startTime,
        reason: form.reason,
        status: "pending"
      };

      const updatedMeetings = [newAppointment, ...meetings];
      mapAppointmentsToEvents(updatedMeetings);
      
      setLoading(false);
      setShowModal(false);
      resetForm();
    }, 700);
  };

  const handleCancel = (id: string): void => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    
    const modifiedList = meetings.map((m) => 
      m._id === id ? { ...m, status: "cancelled" as const } : m
    );
    mapAppointmentsToEvents(modifiedList);
  };

  const resetForm = (): void => {
    setForm({ doctorId: "", doctorName: "", date: "", startTime: "", reason: "" });
    setDoctorSearch("");
  };

  const closeModal = (): void => { setShowModal(false); resetForm(); setError(""); };
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ── Header Area ── */}
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
          
          {/* ── Main Canvas View Placeholder Calendar ── */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[620px]">
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

              {/* Weekday Grid Labeling Header */}
              <div className="grid grid-cols-7 text-center text-xs font-black tracking-wider text-slate-400 uppercase mb-3">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
              </div>

              {/* Dynamic Simulated Interactive Grid Blocks */}
              <div className="grid grid-cols-7 gap-2 bg-slate-50/50 p-2 rounded-2xl border border-slate-100 min-h-[440px]">
                {Array.from({ length: 31 }).map((_, index) => {
                  const dayNum = index + 1;
                  // Map specific mock events to visual blocks inside the calendar grid view
                  const dayEvents = events.filter(e => e.start.startsWith(`2026-06-${dayNum < 10 ? '0' + dayNum : dayNum}`));
                  
                  return (
                    <div key={index} className="bg-white border border-slate-100 rounded-xl p-1.5 flex flex-col justify-between min-h-[76px] shadow-2xs hover:border-indigo-200 transition-colors">
                      <span className="text-xs font-bold text-slate-400 self-start p-0.5">{dayNum}</span>
                      <div className="space-y-1 w-full">
                        {dayEvents.map(evt => (
                          <div 
                            key={evt.id}
                            style={{ backgroundColor: evt.backgroundColor, color: evt.textColor, borderColor: evt.borderColor }}
                            className="text-[10px] font-bold p-1 rounded border-l-2 truncate cursor-pointer shadow-3xs"
                            onClick={() => alert(`Details:\n${evt.title}\nTime: ${evt.extendedProps.startTime}\nReason: ${evt.extendedProps.reason || 'None provided'}`)}
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

          {/* ── Side Appointments Agenda List ── */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[620px]">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CalIcon size={18} className="text-indigo-600" /> Upcoming Agenda
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {meetings.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-30 mt-12">
                    <CalIcon size={48} className="mb-2 text-slate-400" />
                    <p className="text-sm font-semibold">No appointments scheduled</p>
                  </div>
                ) : (
                  meetings.map((m) => (
                    <div key={m._id} className="group relative bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-all hover:bg-white hover:shadow-md hover:border-indigo-500/20">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">Dr. {m.doctor?.name}</p>
                          <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">{m.doctor?.specialization}</p>
                        </div>
                        <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md border-none ${STATUS_CONFIG[m.status].class}`}>
                          {m.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-3">
                        <div className="flex items-center gap-1">
                          <CalIcon size={13} /> {new Date(m.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={13} /> {m.startTime}
                        </div>
                      </div>

                      {m.status !== "cancelled" && (
                        <button 
                          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          onClick={() => handleCancel(m._id)}
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

        {/* ── Booking Modal Sandbox UI ── */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-slate-100">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">Schedule Consultation</h3>
                <button onClick={closeModal} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-4">
                {error && <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-semibold text-rose-800 shadow-sm">{error}</div>}

                {/* Search Box Trigger */}
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><User size={14}/> Select Doctor</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      placeholder="Type name (e.g. Sarah, Amina)..."
                      value={doctorSearch}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setDoctorSearch(e.target.value)}
                    />
                  </div>
                  
                  {/* Dropdown Options */}
                  {doctors.length > 0 && (
                    <div className="absolute z-20 w-full bg-white border border-slate-200 shadow-xl rounded-xl mt-1 max-h-48 overflow-y-auto divide-y divide-slate-50">
                      {doctors.map((d) => (
                        <button 
                          key={d._id} 
                          type="button"
                          className="flex flex-col w-full px-4 py-2.5 hover:bg-slate-50 text-left"
                          onClick={() => {
                            setForm({ ...form, doctorId: d._id, doctorName: d.name });
                            setDoctorSearch(`Dr. ${d.name} (${d.specialization})`);
                            setDoctors([]);
                          }}
                        >
                          <span className="font-bold text-slate-800 text-sm">Dr. {d.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{d.specialization}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date & Time Setup Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Preferred Date</label>
                    <input 
                      type="date" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                      min="2026-01-01"
                      value={form.date} 
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, date: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Preferred Time</label>
                    <input 
                      type="time" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                      value={form.startTime} 
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, startTime: e.target.value })} 
                    />
                  </div>
                </div>

                {/* Reason description input block */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Reason for Visit</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-20 resize-none" 
                    placeholder="A brief description of your health concern..." 
                    value={form.reason} 
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, reason: e.target.value })} 
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all text-sm" onClick={closeModal}>Discard</button>
                  <button 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-md" 
                    onClick={handleSubmit} 
                    disabled={loading}
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