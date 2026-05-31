import { useState, useEffect } from "react";
import { User, LayoutDashboard, Calendar, Users, LogOut, Menu, X, CalendarPlus, Trash2, RefreshCw, Clock } from "lucide-react";
import { useNavigate } from "react-router";
import api from "../api/Api";

// Core Folder Component Imports
import DoctorProfile from "./DoctorProfile";
import DoctorPatients from "./DoctorPatient";
import DoctorMeetings from "./DoctorMeeting"; // Assuming your appointment/slot management is handled here

// Define union type for explicit state type-safety
type DashboardTab = "dashboard" | "slots" | "meetings" | "patients" | "profile";

export default function DoctorPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        const response = await api.get("/doctor/info/detail");

        if (response.data && response.data.success) {
          const data = response.data.data;
          if(!data) {
            navigate('/auth')
          }
        }
      } catch (error: any) {
        console.error("Error retrieving doctor profile:", error);

        const errorMessage = error.response?.data?.message || "";
        if (error.response?.status === 401 || errorMessage.toLowerCase().includes("token")) {
          alert("Session expired or missing credentials. Redirecting to login...");
          navigate("/auth");
        }
      }
    };

    fetchDoctorProfile();
  }, [navigate]);

  const handleLogout = async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } catch (_) {
      // Fallback routing even if network drop occurs
    } finally {
      navigate("/auth");
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { id: "slots", label: "Slots", icon: <CalendarPlus size={18} /> },
    { id: "meetings", label: "Appointments", icon: <Calendar size={18} /> },
    { id: "patients", label: "My Patients", icon: <Users size={18} /> },
    { id: "profile", label: "My Profile", icon: <User size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      {/* ── SIDEBAR NAVIGATION ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6">
          {/* Logo Heading */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 font-black text-xl text-indigo-600 tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">+</div>
              <span>MediRaksha</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-slate-100 text-slate-500">
              <X size={18} />
            </button>
          </div>

          {/* Navigation Items Map */}
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as DashboardTab);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  activeTab === item.id
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom Exit Action Area */}
        <div className="p-6 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile backdrop shadow layer */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-xs lg:hidden" />
      )}

      {/* ── MAIN DISPLAY BOARD CANVAS ── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Navbar Row */}
        <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between lg:justify-end shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors">
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Welcome back</p>
              <p className="text-sm font-bold text-slate-800">Doctor Panel</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200">
              Dr
            </div>
          </div>
        </header>

        {/* Dynamic Mounting Window Pane */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-5xl mx-auto">
            
            {/* ── TAB ONE: MAIN METRICS INDEX ── */}
            {activeTab === "dashboard" && (
              <div className="animate-fade-in">
                <div className="mb-8">
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight">Overview Dashboard</h1>
                  <p className="text-sm text-slate-500">Track and manage your medical daily schedule cleanly.</p>
                </div>

                {/* Master quick access info banner */}
                <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center border-dashed">
                  <p className="text-slate-800 font-bold text-sm">Welcome to MediRaksha Clinical Portal</p>
                  <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">Use the sidebar navigation choices to balance user scheduling records or modify public profile data blocks instantly.</p>
                </div>
              </div>
            )}

            {/* ── TAB TWO: APPOINTMENTS AND SLOTS CONFIG ── */}
            {activeTab === "slots" && <DoctorSlots />}

            {/* ── TAB THREE: APPOINTMENTS ── */}
            {activeTab === "meetings" && <DoctorMeetings />}

            {/* ── TAB FOUR: SYSTEM PATIENTS DATA TRACKER ── */}
            {activeTab === "patients" && <DoctorPatients />}

            {/* ── TAB FIVE: PROFILE PREFERENCES SCREEN ── */}
            {activeTab === "profile" && (
              <div className="animate-fade-in flex justify-center">
                <div className="w-full max-w-md">
                  <DoctorProfile />
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

    </div>
  );
}

interface DoctorSlot {
  id: number;
  bookingDate: string;
  slotTime: string;
  status: "available" | "booked" | "blocked";
  created_at: string;
}

interface WeeklyRule {
  dayOfWeek: number;
  label: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

const DEFAULT_WEEKLY_RULES: WeeklyRule[] = [
  { dayOfWeek: 1, label: "Mon", enabled: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 2, label: "Tue", enabled: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 3, label: "Wed", enabled: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 4, label: "Thu", enabled: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 5, label: "Fri", enabled: true, startTime: "09:00", endTime: "17:00" },
  { dayOfWeek: 6, label: "Sat", enabled: false, startTime: "10:00", endTime: "13:00" },
  { dayOfWeek: 0, label: "Sun", enabled: false, startTime: "10:00", endTime: "13:00" },
];

function DoctorSlots() {
  const [slots, setSlots] = useState<DoctorSlot[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(60);
  const [weeklyRules, setWeeklyRules] = useState<WeeklyRule[]>(DEFAULT_WEEKLY_RULES);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;

      const response = await api.get("/doctor/slot/all", { params });
      if (response.data?.success) {
        setSlots(response.data.data || []);
      }
    } catch (error: any) {
      showMessage("error", error.response?.data?.message || "Failed to load slots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [statusFilter]);

  const updateRule = (dayOfWeek: number, changes: Partial<WeeklyRule>) => {
    setWeeklyRules((prev) => prev.map((rule) => (
      rule.dayOfWeek === dayOfWeek ? { ...rule, ...changes } : rule
    )));
  };

  const handlePublishSlot = async () => {
    const enabledRules = weeklyRules.filter((rule) => rule.enabled);

    if (!startDate || !endDate) {
      showMessage("error", "Select a start and end date before publishing.");
      return;
    }

    if (enabledRules.length === 0) {
      showMessage("error", "Enable at least one working day.");
      return;
    }

    setPublishing(true);
    try {
      const response = await api.post("/doctor/slot/publish", {
        startDate,
        endDate,
        slotDurationMinutes,
        weeklyRules: enabledRules.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })),
      });

      if (response.data?.success) {
        const created: DoctorSlot[] = response.data.data || [];
        setSlots((prev) => [...created, ...prev].sort((a, b) => (
          `${a.bookingDate} ${a.slotTime}`.localeCompare(`${b.bookingDate} ${b.slotTime}`)
        )));
        showMessage("success", response.data.message || "Slot published.");
      }
    } catch (error: any) {
      showMessage("error", error.response?.data?.message || "Failed to publish slot.");
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteSlot = async (slot: DoctorSlot) => {
    if (slot.status === "booked") {
      showMessage("error", "Booked slots cannot be deleted.");
      return;
    }

    if (!window.confirm("Delete this published slot?")) return;

    setDeletingId(slot.id);
    try {
      const response = await api.delete(`/doctor/slot/${slot.id}`);
      if (response.data?.success) {
        setSlots((prev) => prev.filter((item) => item.id !== slot.id));
        showMessage("success", response.data.message || "Slot deleted.");
      }
    } catch (error: any) {
      showMessage("error", error.response?.data?.message || "Failed to delete slot.");
    } finally {
      setDeletingId(null);
    }
  };

  const statusStyle = (status: DoctorSlot["status"]) => {
    const styles = {
      available: "bg-emerald-50 text-emerald-700 border-emerald-200",
      booked: "bg-indigo-50 text-indigo-700 border-indigo-200",
      blocked: "bg-slate-100 text-slate-600 border-slate-200"
    };
    return `px-2.5 py-1 rounded-md border text-[11px] font-bold uppercase tracking-wider ${styles[status]}`;
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Publish Slots</h1>
          <p className="text-xs text-slate-400">Open availability for patients and remove unused dates.</p>
        </div>

        {message && (
          <div className={`px-3 py-2 rounded-xl text-xs font-bold border ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs h-fit">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CalendarPlus size={18} />
            </div>
            <h2 className="font-black text-slate-800 text-sm">Weekly Availability</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Start Date</label>
              <input
                type="date"
                min={today}
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  if (!endDate || endDate < event.target.value) setEndDate(event.target.value);
                }}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">End Date</label>
              <input
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <label className="block text-xs font-bold text-slate-500 mt-4 mb-1.5">Meeting Length</label>
          <select
            value={slotDurationMinutes}
            onChange={(event) => setSlotDurationMinutes(Number(event.target.value))}
            className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>

          <div className="mt-4 space-y-2">
            {weeklyRules.map((rule) => (
              <div key={rule.dayOfWeek} className="grid grid-cols-[64px_1fr_1fr] gap-2 items-center">
                <label className="flex items-center gap-2 text-xs font-black text-slate-600">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(event) => updateRule(rule.dayOfWeek, { enabled: event.target.checked })}
                    className="accent-indigo-600"
                  />
                  {rule.label}
                </label>
                <input
                  type="time"
                  value={rule.startTime}
                  disabled={!rule.enabled}
                  onChange={(event) => updateRule(rule.dayOfWeek, { startTime: event.target.value })}
                  className="min-w-0 bg-slate-50 border border-slate-200 px-2 py-2 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="time"
                  value={rule.endTime}
                  disabled={!rule.enabled}
                  onChange={(event) => updateRule(rule.dayOfWeek, { endTime: event.target.value })}
                  className="min-w-0 bg-slate-50 border border-slate-200 px-2 py-2 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handlePublishSlot}
            disabled={publishing || !startDate || !endDate}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <CalendarPlus size={16} />
            {publishing ? "Publishing..." : "Generate Slots"}
          </button>
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-800 text-sm">Published Slots</h2>
              <p className="text-xs text-slate-400 mt-0.5">{slots.length} slot{slots.length === 1 ? "" : "s"} visible</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="">All</option>
                <option value="available">Available</option>
                <option value="booked">Booked</option>
                <option value="blocked">Blocked</option>
              </select>
              <button
                onClick={fetchSlots}
                className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600"
                title="Refresh slots"
              >
                <RefreshCw size={15} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <div className="py-20 text-center">
              <Calendar size={36} className="mx-auto text-slate-200 mb-3" />
              <p className="font-bold text-slate-700">No slots published</p>
              <p className="text-xs text-slate-400 mt-1">Choose a date and publish your first availability.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {slots.map((slot) => (
                <div key={slot.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-800 text-sm">
                        {new Date(slot.bookingDate).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 rounded-md px-2 py-1">
                        <Clock size={12} /> {slot.slotTime?.slice(0, 5) || "09:00"}
                      </span>
                      <span className={statusStyle(slot.status)}>{slot.status}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Slot ID #{slot.id}</p>
                  </div>

                  <button
                    onClick={() => handleDeleteSlot(slot)}
                    disabled={slot.status === "booked" || deletingId === slot.id}
                    className="p-2 text-rose-600 hover:bg-rose-50 disabled:text-slate-300 disabled:hover:bg-transparent rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title={slot.status === "booked" ? "Booked slots cannot be deleted" : "Delete slot"}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
