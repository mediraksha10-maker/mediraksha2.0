import React, { useState } from "react";
import { 
  Stethoscope, ShieldAlert, HeartPulse, Search, 
  ArrowLeft, Pill, AlertTriangle, FileText, Activity
} from "lucide-react";
import { useNavigate } from "react-router";
/* ── Type Definitions ── */
interface DiseaseData {
  id: number;
  name: string;
  common_name: string;
  category: "Infectious" | "Chronic" | "Genetic" | "Lifestyle";
  risk_level: "Low" | "Medium" | "High";
  transmission: string;
  symptoms: string[];
  precautions: string[];
  description: string;
}

/* ── Dummy Data (Simulating database response rows) ── */
const MOCK_DISEASES: DiseaseData[] = [
  {
    id: 1,
    name: "Diabetes Mellitus Type 2",
    common_name: "Type 2 Diabetes",
    category: "Chronic",
    risk_level: "Medium",
    transmission: "Non-communicable (Genetic & Lifestyle factors)",
    description: "A long-term medical condition in which your body doesn't use insulin properly, resulting in high blood sugar levels over a sustained period.",
    symptoms: ["Increased thirst", "Frequent urination", "Unexplained weight loss", "Fatigue"],
    precautions: ["Maintain a balanced low-glycemic diet", "Regular physical activity", "Monitor blood glucose levels regularly"]
  },
  {
    id: 2,
    name: "Influenza Virus A/B",
    common_name: "Seasonal Flu",
    category: "Infectious",
    risk_level: "Low",
    transmission: "Airborne droplets (Coughing and sneezing)",
    description: "An acute, highly contagious viral infection of the respiratory tract that spreads rapidly in seasonal waves worldwide.",
    symptoms: ["High fever", "Dry cough", "Severe body aches", "Chills and sweating"],
    precautions: ["Annual flu vaccination", "Frequent handwashing with soap", "Avoid close contact with infected individuals"]
  },
  {
    id: 3,
    name: "Hypertensive Heart Disease",
    common_name: "High Blood Pressure",
    category: "Chronic",
    risk_level: "High",
    transmission: "Non-communicable (Dietary and cardiovascular wear)",
    description: "A cluster of medical complications including heart failure and ischemic heart disease caused by chronically elevated systemic blood pressure.",
    symptoms: ["Headaches (especially in the morning)", "Shortness of breath", "Dizziness", "Chest pain"],
    precautions: ["Reduce sodium (salt) dietary intake", "Manage emotional stress levels", "Take prescribed antihypertensive medications daily"]
  }
];

const RISK_THEMES = {
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  High: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function Disease() {
  // --- UI State Management ---
  const [diseases] = useState<DiseaseData[]>(MOCK_DISEASES);
  const [selectedDisease, setSelectedDisease] = useState<DiseaseData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Search filter across disease names, categories, and symptoms
  const filteredDiseases = diseases.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.common_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.symptoms.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8 font-sans">
       <button 
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ArrowLeft size={20} />
        </button>
      <div className="max-w-5xl mx-auto">
        
        {/* ── CASE 1: DISEASE ENCYCLOPEDIA DETAIL VIEW ── */}
        {selectedDisease ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <button 
              onClick={() => setSelectedDisease(null)}
              className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <ArrowLeft size={16} /> Back to Medical Index
            </button>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 md:p-10 space-y-8">
              {/* Header Title Area */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <span className="text-xs font-black tracking-widest text-indigo-600 uppercase bg-indigo-50 px-3 py-1 rounded-md">
                    {selectedDisease.category} Condition
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mt-2">
                    {selectedDisease.name}
                  </h2>
                  <p className="text-slate-400 font-medium text-sm mt-0.5">Commonly known as: {selectedDisease.common_name}</p>
                </div>

                <div className={`border rounded-xl px-4 py-2 text-center shrink-0 ${RISK_THEMES[selectedDisease.risk_level]}`}>
                  <span className="text-[10px] font-black uppercase tracking-wider block opacity-70">Clinical Severity</span>
                  <span className="text-base font-extrabold">{selectedDisease.risk_level} Risk</span>
                </div>
              </div>

              {/* Medical Summary Description */}
              <div className="space-y-2">
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" /> Pathological Description
                </h4>
                <p className="text-slate-600 text-sm leading-relaxed bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
                  {selectedDisease.description}
                </p>
              </div>

              {/* Transmission Matrix */}
              <div className="text-sm">
                <span className="font-bold text-slate-700">Method of Spread / Development:</span>
                <span className="text-slate-500 ml-2 font-medium">{selectedDisease.transmission}</span>
              </div>

              {/* Side-by-Side Symptoms & Precautions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Symptoms Block */}
                <div className="bg-amber-50/40 border border-amber-100/70 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-2">
                    <HeartPulse size={16} /> Diagnostic Symptoms
                  </h4>
                  <ul className="space-y-2">
                    {selectedDisease.symptoms.map((symptom, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                        {symptom}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Precautions Block */}
                <div className="bg-indigo-50/40 border border-indigo-100/70 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-black text-indigo-800 uppercase tracking-wider flex items-center gap-2">
                    <Pill size={16} /> Preventive Measures
                  </h4>
                  <ul className="space-y-2">
                    {selectedDisease.precautions.map((precaution, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                        {precaution}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          </div>
        ) : (
          
          /* ── CASE 2: SEARCHABLE INDEX DIRECTORY VIEW ── */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header / Search Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
              <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Stethoscope className="text-indigo-600" size={24} /> Medical Conditions Glossary
                </h1>
                <p className="text-slate-500 text-sm">Browse clinical profiles, symptom matrices, and preventive directives</p>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search diseases or symptoms..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            {/* List Array Loop Grid */}
            {filteredDiseases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDiseases.map((disease) => (
                  <div 
                    key={disease.id}
                    onClick={() => setSelectedDisease(disease)}
                    className="group bg-white rounded-2xl border border-slate-100 p-5 shadow-2xs hover:shadow-lg hover:border-indigo-100 transition-all duration-200 flex flex-col justify-between cursor-pointer"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <span>{disease.category}</span>
                        <span className={`px-2 py-0.5 rounded border ${
                          disease.risk_level === "High" ? "text-rose-600 border-rose-100 bg-rose-50/50" : 
                          disease.risk_level === "Medium" ? "text-amber-600 border-amber-100 bg-amber-50/50" : 
                          "text-emerald-600 border-emerald-100 bg-emerald-50/50"
                        }`}>
                          {disease.risk_level} Risk
                        </span>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {disease.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">AKA: {disease.common_name}</p>
                      </div>

                      {/* Snippet preview of symptoms list */}
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 pt-1">
                        <span className="font-bold text-slate-600">Symptoms:</span> {disease.symptoms.join(", ")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-50 mt-4 pt-3 text-[11px] font-bold text-indigo-600">
                      <span>View Symptoms & Care</span>
                      <Activity size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback Blank Screen State */
              <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center text-slate-300">
                <ShieldAlert size={48} className="mx-auto mb-3 opacity-30 text-slate-400" />
                <p className="text-slate-700 font-bold text-base">No Matching Diagnoses Found</p>
                <p className="text-slate-400 text-xs mt-0.5">Try altering search keywords or checking spelling configurations.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}