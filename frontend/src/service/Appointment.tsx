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
  bookingDate: string;    // Raw from backend
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
  appointmentDate: string; // Strictly matches backend slot shape
  startTime: string;
  reasonOfAppointment: string;
}

const STATUS_CONFIG = {
  pending:   { class: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { class: "bg-rose-50 text-rose-700 border-rose-200" },
};

const APP_TIME_ZONE = "Asia/Kolkata";

export default function AppointmentCalendar() {
  const [meetings,     setMeetings]     = useState<Appointment[]>([]);
  const [doctorSearch, setDoctorSearch] = useState<string>("");
  const [doctors,      setDoctors]      = useState<Doctor[]>([]);
  const [allSlots,     setAllSlots]     = useState<Slot[]>([]); // Keeps all raw doctor slots
  const [uniqueDates,  setUniqueDates]  = useState<string[]>([]); // Dynamic array of open dates
  const [filteredSlots, setFilteredSlots] = useState<Slot[]>([]); // Slots for selected date
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

  const formatBackendDate = (dateStr: string): string => {
    if (!dateStr) return "";
    if (!dateStr.includes("T")) return dateStr;

    const parsedDate = new Date(dateStr);
    if (Number.isNaN(parsedDate.getTime())) return dateStr.split("T")[0];

    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(parsedDate);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    return year && month && day ? `${year}-${month}-${day}` : dateStr.split("T")[0];
  };

  const formatToFriendlyLocalDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const cleanDate = formatBackendDate(dateStr);
    const [year, month, day] = cleanDate.split('-');
    
    // Explicit month array matching human-readable index (1-12)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = months[parseInt(month, 10) - 1] || "";
    
    // Fallback if formatting breaks, otherwise outputs pure text: "Jun 9, 2026"
    return monthName ? `${monthName} ${parseInt(day, 10)}, ${year}` : cleanDate;
  };

  // 1. Fetching all open slots for selected doctor
  const handleDoctorSelect = async (doctor: Doctor) => {
    setForm({
      doctorId: doctor.id,
      doctorName: doctor.name,
      slotId: "",
      appointmentDate: "",
      startTime: "",
      reasonOfAppointment: "",
    });
    setDoctorSearch(`Dr. ${doctor.name} (${doctor.speciality})`);
    setDoctors([]);
    setAllSlots([]);
    setUniqueDates([]);
    setFilteredSlots([]);
    setError("");

    try {
      const response = await api.get(`/user/meetings/slot/${doctor.id}`);
      if (response.data?.success) {
        const fetchedSlots: Slot[] = response.data.availableSlots || [];
        setAllSlots(fetchedSlots);

        // Group dates sequentially based on real DB values
        const dates = fetchedSlots.map(s => formatBackendDate(s.bookingDate));
        const distinctDates = Array.from(new Set(dates));
        setUniqueDates(distinctDates);
      }
    } catch {
      setError("Failed to fetch available schedule for this doctor.");
    }
  };

  // 2. Filter available time blocks whenever selected target date shifts
  useEffect(() => {
    if (!form.appointmentDate) {
      setFilteredSlots([]);
      return;
    }
    const matching = allSlots.filter(
      s => formatBackendDate(s.bookingDate) === form.appointmentDate
    );
    setFilteredSlots(matching);
  }, [form.appointmentDate, allSlots]);

  const handleSubmit = async (): Promise<void> => {
    setError("");
    setSuccessMsg("");
    if (!form.doctorId || !form.slotId || !form.appointmentDate || !form.reasonOfAppointment) {
      setError("Please pick a doctor, date, and time slot and add the reason.");
      return;
    }

    setLoading(true);
    try {
      const normalizedSubmissionDate = formatBackendDate(form.appointmentDate);

      const response = await api.post('/user/meetings/book', {
        doctorId:            form.doctorId,
        slotId:              form.slotId,
        appointmentDate:     normalizedSubmissionDate, 
        reasonOfAppointment: form.reasonOfAppointment || null,
      });

      if (response.data?.success) {
        setSuccessMsg("Appointment scheduled successfully!");
        resetForm();
        fetchMeetings();
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
    setAllSlots([]);
    setUniqueDates([]);
    setFilteredSlots([]);
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
            <p className="text-slate-500 text-sm">Select a provider, assign a slot, and confirm immediately</p>
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

            {/* Dynamic Date Selector Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CalIcon size={14}/> 2. Available Dates
              </label>
              <select
                disabled={!form.doctorId || uniqueDates.length === 0}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                value={form.appointmentDate}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  setForm(prev => ({ ...prev, appointmentDate: e.target.value, slotId: "", startTime: "" }));
                }}
              >
                <option value="">{form.doctorId ? "Choose an available date" : "Select a doctor first"}</option>
                {uniqueDates.map(dateStr => (
                  <option key={dateStr} value={dateStr}>
                    {formatToFriendlyLocalDate(dateStr)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Slot Selection Row */}
          {form.appointmentDate && (
            <div className="space-y-2 pt-2 border-t border-dashed border-slate-200">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock size={14}/> 3. Choose Available Time
              </label>
              
              {filteredSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {filteredSlots.map((s) => {
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
                  No active time slots are available for this specific day.
                </p>
              )}
            </div>
          )}

          {/* Reason Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Reason for Appointment </label>
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
              {loading ? "Processing..." : "Confirm Booking"}
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
                      <span className="flex items-center gap-1">
                        <CalIcon size={13} /> 
                        {formatToFriendlyLocalDate(m.appointmentDate)}
                      </span>
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
