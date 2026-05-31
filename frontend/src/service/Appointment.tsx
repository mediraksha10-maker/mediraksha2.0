import { useState, useEffect, type ChangeEvent } from "react";
import {
  ArrowLeft, Search, Calendar as CalIcon, Clock,
  User, Trash2, CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router";
import api from '../api/Api';

/* ── Type Definitions ── */
interface Doctor {
  id: string;
  name: string;
  speciality: string;
  hospital: string;
}

interface Slot {
  id: string;
  bookingDate: string;    // "YYYY-MM-DD"
  slotTime: string;
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

interface FormState {
  doctorId: string;
  doctorName: string;
  slotId: string;         
  appointmentDate: string;
  startTime: string;
  reasonOfAppointment: string;
}

const STATUS_CONFIG = {
  pending:   { class: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { class: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function AppointmentCalendar() {
  const [meetings,     setMeetings]     = useState<Appointment[]>([]);
  const [doctorSearch, setDoctorSearch] = useState<string>("");
  const [doctors,      setDoctors]      = useState<Doctor[]>([]);
  const [slots,        setSlots]        = useState<Slot[]>([]);   
  const [loading,      setLoading]      = useState<boolean>(false);
  const [isFetching,   setIsFetching]   = useState<boolean>(true);
  const [error,        setError]        = useState<string>("");
  const [successMsg,   setSuccessMsg]   = useState<string>("");

  const [form, setForm] = useState<FormState>({
    doctorId: "",
    doctorName: "",
    slotId: "",
    appointmentDate: "",
    startTime: "",
    reasonOfAppointment: "",
  });

  const navigate = useNavigate();

  // Fetch all scheduled meetings
  const fetchMeetings = async () => {
    try {
      setIsFetching(true);
      const response = await api.get('/user/meetings/all');
      if (response.data?.success) {
        setMeetings(response.data.data || []);
      }
    } catch (err: any) {
      if (err.response?.status === 401) navigate('/auth');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [navigate]);

  // Handle Doctor Search debounce
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

  const handleDoctorSelect = (doctor: Doctor) => {
    setForm(prev => ({ 
      ...prev, 
      doctorId: doctor.id, 
      doctorName: doctor.name, 
      slotId: "", 
      appointmentDate: "" 
    }));
    setDoctorSearch(`Dr. ${doctor.name} (${doctor.speciality})`);
    setDoctors([]);
    setSlots([]);
  };

  // Fetch slots automatically when Doctor AND Date are set
  useEffect(() => {
    const fetchSlotsForDate = async () => {
      if (!form.doctorId || !form.appointmentDate) return;
      
      try {
        const response = await api.get(`/user/meetings/slot/${form.doctorId}?date=${form.appointmentDate}`);
        if (response.data?.success) {
          setSlots(response.data.availableSlots || []);
        }
      } catch {
        setSlots([]);
      }
    };

    fetchSlotsForDate();
  }, [form.doctorId, form.appointmentDate]);

  const handleSubmit = async (): Promise<void> => {
    setError("");
    setSuccessMsg("");
    if (!form.doctorId || !form.slotId || !form.appointmentDate) {
      setError("Please pick a doctor, a date, and an available time slot.");
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
        setSuccessMsg("Appointment scheduled successfully!");
        resetForm();
        fetchMeetings(); // Refresh list
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Booking failed. Please try again.";
      if (err.response?.status === 401) navigate('/auth');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string): Promise<void> => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const response = await api.delete(`/user/meetings/${id}`);
      if (response.data?.success) {
        fetchMeetings();
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
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <button
            onClick={() => navigate('/services')}
            className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Direct Booking Dashboard</h2>
            <p className="text-slate-500 text-sm">Select a provider, pick your slot, and confirm immediately</p>
          </div>
        </div>

        {/* ── Booking Assignment Form ── */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3">Assign a Slot</h3>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs font-semibold text-rose-800">{error}</div>
          )}
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle size={16} /> {successMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Doctor Search Field */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><User size={14}/> 1. Select Doctor</label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  placeholder="Type doctor's name or specialty..."
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

            {/* Date Picker Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CalIcon size={14}/> 2. Target Consultation Date
              </label>
              <input
                type="date"
                disabled={!form.doctorId}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                value={form.appointmentDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setForm(prev => ({ ...prev, appointmentDate: e.target.value, slotId: "", startTime: "" }));
                  setSlots([]);
                }}
              />
            </div>
          </div>

          {/* Time Slot Selector Row */}
          {form.appointmentDate && (
            <div className="space-y-2 pt-2 border-t border-dashed border-slate-200">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock size={14}/> 3. Assign Available Slot
              </label>
              
              {slots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {slots.map((s) => {
                    const isSelected = form.slotId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, slotId: s.id, startTime: s.slotTime }))}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center ${
                          isSelected 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                            : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/30"
                        }`}
                      >
                        {s.slotTime?.slice(0, 5) || '09:00'}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-amber-600 italic py-2 px-3 bg-amber-50/60 rounded-xl border border-amber-100">
                  No slots are set up or free for Dr. {form.doctorName.split('(')[0]} on this date.
                </p>
              )}
            </div>
          )}

          {/* Reason Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Reason for Appointment (Optional)</label>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-20 resize-none"
              placeholder="Provide a quick note regarding health requirements..."
              value={form.reasonOfAppointment}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm(prev => ({ ...prev, reasonOfAppointment: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl transition-all text-sm" 
              onClick={resetForm}
            >
              Clear Form
            </button>
            <button
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl transition-all text-sm shadow-md"
              onClick={handleSubmit}
              disabled={loading || !form.slotId}
            >
              {loading ? "Processing Assignment..." : "Assign & Confirm Booking"}
            </button>
          </div>
        </div>

        {/* ── Booked Appointments Grid ── */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Your Scheduled Bookings</h3>
          
          {isFetching ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400">
              <CalIcon size={40} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">No upcoming appointments found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {meetings.map((m) => (
                <div key={m.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs relative flex flex-col justify-between group">
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-slate-800">Dr. {m.doctorName}</h4>
                        <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">{m.speciality}</p>
                      </div>
                      <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded border ${STATUS_CONFIG[m.status]?.class || ''}`}>
                        {m.status}
                      </span>
                    </div>

                    {m.reasonOfAppointment && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg mt-2 italic">
                        "{m.reasonOfAppointment}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                    <div className="flex gap-4 text-xs font-semibold text-slate-500">
                      <span className="flex items-center gap-1"><CalIcon size={13} /> {new Date(m.appointmentDate).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock size={13} /> {m.slotTime}</span>
                    </div>

                    {m.status !== "cancelled" && (
                      <button
                        className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-all"
                        onClick={() => handleCancel(m.id)}
                        title="Cancel appointment"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}