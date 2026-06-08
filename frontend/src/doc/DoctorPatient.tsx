import { useState, useEffect } from "react";
import { Mail, Phone, Eye, Search, UserMinus, FileText, ArrowLeft, Calendar, HardDrive } from "lucide-react";
import api from "../api/Api";

interface Patient {
  id: string | number;
  name: string;
  email: string;
  number: string;
  age: number;
  gender: string;
  created_at: string;
}

// Added Report interface mapping to your backend schema
interface Report {
  id: number;
  userId: number;
  title: string;
  category: "lab" | "prescription" | "scan" | "other";
  fileSize: number;
  mimeType: string;
  created_at: string;
}

export default function DoctorPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [actionId, setActionId] = useState<string | number | null>(null);

  // --- New Report States ---
  const [activeReportPatient, setActiveReportPatient] = useState<Patient | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState<boolean>(false);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await api.get("/doctor/user/my");
      if (response.data && response.data.success) {
        setPatients(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching patients:", error);
      if (error.response?.status === 404) {
        setPatients([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- New Function: Fetch Patient Reports ---
  const handleViewReports = async (patient: Patient) => {
    setActiveReportPatient(patient);
    setLoadingReports(true);
    setReports([]);
    try {
      // Assuming route uses query params: /doctor/userreport?userId=id
      // Adjust endpoint string to `/doctor/userreport/${patient.id}` if using path variables
      const response = await api.get(`/doctor/userreport`, {
        params: { userId: patient.id }
      });
      
      if (response.data && response.data.success) {
        setReports(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching patient reports:", error);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleDropPatient = async (id: string | number) => {
    if (!window.confirm("Remove this user from your registered patient list? This will erase the relationship lock.")) {
      return;
    }

    setActionId(id);
    try {
      const response = await api.delete(`/doctor/user/${id}`);
      if (response.data && response.data.success) {
        alert(response.data.message);
        fetchPatients();
        if (selectedPatient?.id === id) setSelectedPatient(null);
        if (activeReportPatient?.id === id) setActiveReportPatient(null);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to complete operation.");
    } finally {
      setActionId(null);
    }
  };

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to cleanly format storage footprint units
  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // --- CONDITIONAL VIEW: Patient Reports Workspace ---
  if (activeReportPatient) {
    return (
      <div className="w-full space-y-6 animate-fade-in">
        <div className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <button 
            onClick={() => setActiveReportPatient(null)}
            className="p-2 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Medical Records</h1>
            <p className="text-xs text-slate-400">Viewing authorized clinical files for <span className="text-indigo-600 font-bold">{activeReportPatient.name}</span></p>
          </div>
        </div>

        {loadingReports ? (
          <div className="flex items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <FileText size={20} />
            </div>
            <p className="text-slate-800 font-bold text-base">No shared records found</p>
            <p className="text-slate-400 text-xs mt-1">This patient hasn't visibility-linked any medical reports to your timeline yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xs transition-all flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-slate-800 font-bold text-sm truncate" title={report.title}>{report.title}</h3>
                    <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0">
                      {report.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(report.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><HardDrive size={11} /> {formatBytes(report.fileSize)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- MAIN VIEW: Patients Registry Directory ---
  return (
    <div className="w-full space-y-6 animate-fade-in">
      
      {/* Search and Metadata Top bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">My Patients</h1>
          <p className="text-xs text-slate-400">Manage permanent user profiles linked to your clinical registration directory.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl max-w-xs w-full">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-slate-700 w-full focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
          <p className="text-slate-800 font-bold text-base">No patient profiles match</p>
          <p className="text-slate-400 text-xs mt-1">Check spelling or review your unlinked registry records.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <div key={patient.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    {patient.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-slate-800 font-black text-sm truncate">{patient.name}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">{patient.gender || "unspecified"} • Age {patient.age || "—"}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-50 pt-3">
                  <div className="flex items-center gap-2 text-slate-500"><Mail size={13}/> <span className="truncate">{patient.email}</span></div>
                  <div className="flex items-center gap-2 text-slate-500"><Phone size={13}/> <span>{patient.number || "—"}</span></div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex gap-2 mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedPatient(patient)}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  title="View Details"
                >
                  <Eye size={13} />
                </button>
                <button
                  onClick={() => handleViewReports(patient)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-xl border border-indigo-100 transition-colors cursor-pointer"
                >
                  <FileText size={13} /> Reports
                </button>
                <button
                  disabled={actionId === patient.id}
                  onClick={() => handleDropPatient(patient.id)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-600 rounded-xl transition-colors cursor-pointer border border-rose-100"
                  title="Drop Patient Connection"
                >
                  <UserMinus size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Profile Detail Pop-out Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden shadow-xl border border-slate-100 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xl mx-auto mb-3">
              {selectedPatient.name.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-slate-900 font-black text-lg">{selectedPatient.name}</h3>
            <p className="text-xs text-slate-400 font-medium mb-4">Patient Record: #{selectedPatient.id}</p>

            <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2.5 text-xs mb-6">
              <div className="flex justify-between border-b border-slate-200/50 pb-1.5"><span className="text-slate-400 font-bold">Email Address</span><span className="text-slate-700 font-medium">{selectedPatient.email}</span></div>
              <div className="flex justify-between border-b border-slate-200/50 pb-1.5"><span className="text-slate-400 font-bold">Phone Connection</span><span className="text-slate-700 font-medium">{selectedPatient.number || "—"}</span></div>
              <div className="flex justify-between border-b border-slate-200/50 pb-1.5"><span className="text-slate-400 font-bold">Demographics</span><span className="text-slate-700 font-medium">{selectedPatient.gender}, {selectedPatient.age} yrs</span></div>
              <div className="flex justify-between"><span className="text-slate-400 font-bold">Member Since</span><span className="text-slate-700 font-medium">{new Date(selectedPatient.created_at).toLocaleDateString()}</span></div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const target = selectedPatient;
                  setSelectedPatient(null);
                  handleViewReports(target);
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-xs"
              >
                View Patient Reports
              </button>
              <button
                onClick={() => setSelectedPatient(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-xs"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}