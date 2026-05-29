import { useState, useEffect } from "react";
import { User, LayoutDashboard, Calendar, Users, LogOut, Menu, X, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router";
import api from "../api/Api";

// Core Folder Component Imports
import DoctorProfile from "./DoctorProfile";
import DoctorPatients from "./DoctorPatient";
import DoctorMeetings from "./DoctorMeeting"; // Assuming your appointment/slot management is handled here

// Define union type for explicit state type-safety
type DashboardTab = "dashboard" | "meetings" | "patients" | "profile";

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

                {/* Quick Metric Snapshot Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <StatCard icon={<Calendar className="text-indigo-600" />} title="Today's Slots" count="12 Slots" color="bg-indigo-50" />
                  <StatCard icon={<Users className="text-emerald-600" />} title="Total Patients" count="48 Users" color="bg-emerald-50" />
                  <StatCard icon={<CheckCircle className="text-amber-600" />} title="Completed" count="8 Done" color="bg-amber-50" />
                </div>

                {/* Master quick access info banner */}
                <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center border-dashed">
                  <p className="text-slate-800 font-bold text-sm">Welcome to MediRaksha Clinical Portal</p>
                  <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">Use the sidebar navigation choices to balance user scheduling records or modify public profile data blocks instantly.</p>
                </div>
              </div>
            )}

            {/* ── TAB TWO: APPOINTMENTS AND SLOTS CONFIG ── */}
            {activeTab === "meetings" && <DoctorMeetings />}

            {/* ── TAB THREE: SYSTEM PATIENTS DATA TRACKER ── */}
            {activeTab === "patients" && <DoctorPatients />}

            {/* ── TAB FOUR: PROFILE PREFERENCES SCREEN ── */}
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

/* ── Metrics Grid Layout Card Helper ── */
function StatCard({ icon, title, count, color }: { icon: React.ReactNode; title: string; count: string; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
        <p className="text-slate-800 font-black text-xl tracking-tight mt-0.5">{count}</p>
      </div>
    </div>
  );
}