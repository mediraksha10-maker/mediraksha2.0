import { useState, useEffect } from "react";
import { Calendar, Clock, User, FileText, XCircle, AlertCircle, Trash2, Filter, Eye, RefreshCw } from "lucide-react";
import api from "../api/Api"; // Your configured Axios instance

interface Appointment {
  Id: number;
  appointmentDate: string;
  slotTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  reasonOfAppointment: string;
  patientId: number;
  patientName: string;
  patientEmail: string;
  patientContact: string;
  patientAge: number;
  patientGender: string;
  slotStatus: string;
}

export default function DoctorMeetings() {
  const [meetings, setMeetings] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Appointment | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      
      // Construct query parameters dynamically matching backend filters
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;

      const response = await api.get("/doctor/meetings/all", { params });
      
      if (response.data && response.data.success) {
        setMeetings(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching doctor meetings:", error);
      // If 404 is returned, simply reset list rather than blowing up UI
      if (error.response?.status === 404) {
        setMeetings([]);
      } else {
        alert(error.response?.data?.message || "Failed to retrieve meetings.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [statusFilter, dateFilter]);

  // --- Fetch detailed context for single modal view ---
  const handleViewDetails = async (id: number) => {
    try {
      const response = await api.get(`/doctor/meetings/${id}`);
      if (response.data && response.data.success) {
        setSelectedMeeting(response.data.data);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Could not retrieve appointment details.");
    }
  };

  // --- Soft Delete / Cancel Appointment ---
  const handleCancelMeeting = async (id: number) => {
    if (!window.confirm("Are you sure you want to deny/cancel this appointment? This will release the slot back to available.")) {
      return;
    }

    setCancellingId(id);
    try {
      const response = await api.delete(`/doctor/meetings/${id}`);
      if (response.data && response.data.success) {
        alert(response.data.message || "Appointment successfully cancelled.");
        // Refresh structural board state
        fetchMeetings();
        if (selectedMeeting?.Id === id) setSelectedMeeting(null);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to cancel appointment.");
    } finally {
      setCancellingId(null);
    }
  };

  // Helper Badge Colors for Meeting Status
  const getStatusBadge = (status: Appointment['status']) => {
    const styles = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      confirmed: "bg-indigo-50 text-indigo-700 border-indigo-200",
      completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
      cancelled: "bg-rose-50 text-rose-700 border-rose-200"
    };
    return `px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md border ${styles[status] || styles.pending}`;
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      
      {/* ── HEADER PANEL & FILTER STRIP ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Manage Appointments</h1>
          <p className="text-xs text-slate-400">Review patient reservations, check symptoms, or release slots.</p>
        </div>
        
        {/* Dynamic Parameter Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <Filter size={14} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          />

          <button
            onClick={fetchMeetings}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── MAIN APPOINTMENTS CONTAINER ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
          <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Calendar size={20} />
          </div>
          <p className="text-slate-800 font-bold text-base">No appointments found</p>
          <p className="text-slate-400 text-xs mt-1">Try relaxing your filter parameters or checking another date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {meetings.map((meeting) => (
            <div
              key={meeting.Id}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              {/* Left Side: Patient Basic Meta & Date */}
              <div className="space-y-2.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={getStatusBadge(meeting.status)}>{meeting.status}</span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Calendar size={13} />
                    <span>{new Date(meeting.appointmentDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Clock size={13} />
                    <span>{meeting.slotTime}</span>
                  </div>
                </div>

                <div className="min-w-0">
                  <h3 className="text-slate-800 font-black text-base truncate">{meeting.patientName}</h3>
                  <p className="text-xs text-slate-400 font-medium truncate">ID: #{meeting.patientId} • {meeting.patientGender}, {meeting.patientAge} years old</p>
                </div>

                {meeting.reasonOfAppointment && (
                  <div className="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600 flex items-start gap-2 max-w-xl">
                    <FileText size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <p className="italic truncate">"{meeting.reasonOfAppointment}"</p>
                  </div>
                )}
              </div>

              {/* Right Side: Interactive Board Actions */}
              <div className="flex items-center gap-2 self-end md:self-auto shrink-0 w-full md:w-auto justify-end">
                <button
                  onClick={() => handleViewDetails(meeting.Id)}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer"
                  title="View Profile Details"
                >
                  <Eye size={15} />
                </button>

                {meeting.status !== 'completed' && meeting.status !== 'cancelled' && (
                  <button
                    disabled={cancellingId === meeting.Id}
                    onClick={() => handleCancelMeeting(meeting.Id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer border border-rose-100"
                    title="Cancel Appointment"
                  >
                    <Trash2 size={14} />
                    <span>{cancellingId === meeting.Id ? "Denying..." : "Deny"}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EXPANDED DETAILS OVERLAY MODAL ── */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-xl border border-slate-100">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Appointment Case Details</span>
                <h3 className="font-black text-lg">#{selectedMeeting.Id} Details</h3>
              </div>
              <button onClick={() => setSelectedMeeting(null)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer">
                <XCircle size={18} />
              </button>
            </div>

            {/* Modal Body Info Block */}
            <div className="p-6 space-y-4 text-sm max-h-[75vh] overflow-y-auto">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Patient Profile</p>
                <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800"><User size={14}/> {selectedMeeting.patientName}</div>
                  <div className="text-xs text-slate-500 pl-6">Contact: {selectedMeeting.patientContact || "—"}</div>
                  <div className="text-xs text-slate-500 pl-6">Email: {selectedMeeting.patientEmail}</div>
                  <div className="text-xs text-slate-500 pl-6">Demographics: {selectedMeeting.patientGender}, Age {selectedMeeting.patientAge}</div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Schedule Snapshot</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] uppercase text-slate-400 font-bold">Date</p>
                    <p className="font-bold text-slate-800 mt-0.5">{new Date(selectedMeeting.appointmentDate).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] uppercase text-slate-400 font-bold">Time Window</p>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedMeeting.slotTime}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Reason for Appointment</p>
                <p className="text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3 italic leading-relaxed">
                  {selectedMeeting.reasonOfAppointment || "No detailed context provided by the patient."}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Current Status</span>
                  <div className="mt-1"><span className={getStatusBadge(selectedMeeting.status)}>{selectedMeeting.status}</span></div>
                </div>
                
                {selectedMeeting.status !== 'completed' && selectedMeeting.status !== 'cancelled' && (
                  <button
                    onClick={() => handleCancelMeeting(selectedMeeting.Id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <AlertCircle size={14} /> Deny Appointment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}