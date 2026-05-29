import { useState, useEffect } from "react";
import { Mail, Phone, Eye, Search, UserMinus } from "lucide-react";
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

export default function DoctorPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [actionId, setActionId] = useState<string | number | null>(null);

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
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to complete operation.");
    } finally {
      setActionId(null);
    }
  };

  // Client-side text filter pipeline
  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

              <div className="flex gap-2 mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedPatient(patient)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer"
                >
                  <Eye size={13} /> View
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
                onClick={() => handleDropPatient(selectedPatient.id)}
                className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-xs border border-rose-100"
              >
                Drop Patient Link
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