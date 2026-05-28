import React, { useState, useEffect } from "react";
import { 
  Building2, MapPin, ShieldCheck, 
  ArrowLeft, Search, Activity, UserCheck, BedDouble 
} from "lucide-react";
import { useNavigate } from "react-router";
import api from '../api/Api';

/* ── Type Definitions ── */
interface HospitalData {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  rating?: number | string;
  bed?: number; // From your actual DB payload
  room?: number;
  oxygenCylinder?: number;
  specialties?: string[] | string;
  image?: string;
}

export default function Hospital() {
  // --- Core UI State Management ---
  const [hospitals, setHospitals] = useState<HospitalData[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<HospitalData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  // --- Fetch Data From Backend ---
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        setLoading(true);
        const response = await api.get("/hospital/all");
        
        // Fix: Access response.data.data to get the literal array from Postman envelope
        if (response.data && Array.isArray(response.data.data)) {
          setHospitals(response.data.data);
        } else if (Array.isArray(response.data)) {
          setHospitals(response.data);
        } else {
          throw new Error("Unexpected API response structure.");
        }
        
        setError(null);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message || "Something went wrong while loading hospitals.");
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, []);

  // --- Helpers for Normalizing Missing Database Fields ---
  const getSpecialties = (hospital: HospitalData): string[] => {
    if (!hospital.specialties) return ["General Medicine", "Emergency Care"]; 
    if (Array.isArray(hospital.specialties)) return hospital.specialties;
    if (typeof hospital.specialties === "string") {
      return hospital.specialties.replace(/[{}" ]/g, "").split(",");
    }
    return [];
  };

  // --- Filtered lists for searching capabilities ---
  const filteredHospitals = (Array.isArray(hospitals) ? hospitals : []).filter(h => {
    const nameMatch = h.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const specs = getSpecialties(h).join(" ").toLowerCase();
    const specialtyMatch = specs.includes(searchQuery.toLowerCase());
    return nameMatch || specialtyMatch;
  });

  // --- Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-600 font-medium">Loading medical centers...</p>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-4">
        <div className="bg-white border border-rose-100 rounded-2xl p-8 max-w-md text-center shadow-sm">
          <p className="text-rose-600 font-bold text-lg mb-2">Connection Error</p>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8 font-sans">
      <button 
        onClick={() => navigate('/')}
        className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors mb-6"
      >
        <ArrowLeft size={20} />
      </button>
      <div className="max-w-6xl mx-auto">
        
        {/* ── CONDITIONAL RENDER: DETAILS VIEW ── */}
        {selectedHospital ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <button 
              onClick={() => setSelectedHospital(null)}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <ArrowLeft size={16} /> Back to Hospital Directory
            </button>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-5 h-64 md:h-auto relative">
                <img 
                  src={selectedHospital.image || "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800"} 
                  alt={selectedHospital.name} 
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-4 left-4 bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                  24/7 Emergency Available
                </span>
              </div>

              <div className="p-6 md:p-10 md:col-span-7 space-y-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-tight mb-2">
                    {selectedHospital.name}
                  </h2>
                  <p className="text-slate-500 text-sm flex items-center gap-1.5 font-medium">
                    <MapPin size={16} className="text-slate-400 shrink-0" /> {selectedHospital.address || "Medical District Campus"}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 border-y border-slate-100 py-6">
                  <div className="text-center md:text-left">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider mb-1">Rating</span>
                    <span className="text-xl font-black text-amber-500">★ {selectedHospital.rating || "4.5"}</span>
                  </div>
                  <div className="text-center md:text-left border-x border-slate-100 px-4">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider mb-1">Total Beds</span>
                    <span className="text-xl font-black text-emerald-600 flex items-center justify-center md:justify-start gap-1">
                      <BedDouble size={18} /> {selectedHospital.bed || 0}
                    </span>
                  </div>
                  <div className="text-center md:text-left pl-2">
                    <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider mb-1">O2 Cylinders</span>
                    <span className="text-sm font-bold text-slate-700 block truncate">{selectedHospital.oxygenCylinder || 0} Units</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Activity size={14} className="text-indigo-600" /> Specialized Medical Departments
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {getSpecialties(selectedHospital).map((spec, index) => (
                      <span 
                        key={index}
                        className="bg-indigo-50/50 border border-indigo-100 text-indigo-700 font-bold text-xs px-3 py-1.5 rounded-xl"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-t-slate-100">
                  <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                    <ShieldCheck size={18} /> Verified Medical Hub Partner
                  </div>
                  <button 
                    onClick={() => alert(`Connecting with admission desk at ${selectedHospital.name}`)}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Request Admission Info
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          
          /* ── CONDITIONAL RENDER: LIST VIEW ── */
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Building2 className="text-indigo-600" size={24} /> Empaneled Medical Centers
                </h1>
                <p className="text-slate-500 text-sm">Select an available institution for real-time facility metrics</p>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search name or specialties..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            {filteredHospitals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHospitals.map((hospital) => (
                  <div 
                    key={hospital.id}
                    onClick={() => setSelectedHospital(hospital)}
                    className="group bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer overflow-hidden"
                  >
                    <div className="h-44 relative bg-slate-100 shrink-0">
                      <img 
                        src={hospital.image || "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800"} 
                        alt={hospital.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="p-5 flex flex-col grow justify-between">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-800 text-base tracking-tight leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {hospital.name}
                          </h3>
                          <span className="text-xs font-bold text-amber-500 shrink-0">★ {hospital.rating || "4.5"}</span>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1 font-medium truncate">
                          <MapPin size={13} className="shrink-0" /> {hospital.address || "Medical District Campus"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-50 mt-4 pt-3 text-[11px] font-bold text-slate-500">
                        <span className="flex items-center gap-1 text-emerald-600">
                          <UserCheck size={14} /> {hospital.bed || 0} Total Beds
                        </span>
                        <span className="text-slate-400 font-semibold">
                          Rooms: {hospital.room || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center text-slate-300">
                <Building2 size={48} className="mx-auto mb-3 opacity-30 text-slate-400" />
                <p className="text-slate-700 font-bold text-base">No Matching Hospitals Found</p>
                <p className="text-slate-400 text-xs mt-0.5">Refine your active search filters or verify query spelling.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}