import React, { useState } from "react";
import { ClipboardMinus, CalendarCheck2, BriefcaseMedical, UserSearch, Search, ArrowRight } from "lucide-react";
import Navbar from "./Navbar";
import { useNavigate } from "react-router";

/* ── Type Definitions ── */
interface QuickAction {
  id: number;
  title: string;
  icon: React.ReactNode;
  description: string;
  style: string;
  view: string;
  accent: string;
}

/* ── Data Source ── */
const quickActions: QuickAction[] = [
  {
    id: 1,
    title: "Upload Medical Reports",
    icon: <ClipboardMinus size={28} />,
    description: "Securely upload, encrypt, and manage your health records in the vault.",
    style: "bg-purple-50 text-purple-600 ring-purple-100",
    view: "/upload",
    accent: "purple"
  },
  {
    id: 2,
    title: "Book Appointment",
    icon: <CalendarCheck2 size={28} />,
    description: "Schedule consultations with specialized practitioners in your area.",
    style: "bg-blue-50 text-blue-600 ring-blue-100",
    view: "/appointment",
    accent: "blue"
  },
  {
    id: 3,
    title: "Doctor Availability",
    icon: <UserSearch size={28} />,
    description: "Check live shift timings and availability of your preferred doctors.",
    style: "bg-indigo-50 text-indigo-600 ring-indigo-100",
    view: "/doctoravailability",
    accent: "indigo"
  },
  {
    id: 4,
    title: "Get a Doctor",
    icon: <BriefcaseMedical size={28} />, 
    description: "Discover experts across 40+ specialties based on reviews and distance.",
    style: "bg-rose-50 text-rose-600 ring-rose-100",
    view: "/adddoctor",
    accent: "rose"
  }
];



export default function Service() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const navigate = useNavigate();

  // Handler for testing interactivity without active routing
  const handleCardClick = (viewPath: string, title: string): void => {
    navigate(viewPath);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <Navbar />
      {/* --- PAGE HEADER --- */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-800 tracking-tight">Medical Services</h1>
              <p className="text-slate-500 mt-2 text-lg">Centralized access to all MediRaksha health tools.</p>
            </div>
            
            {/* Search Bar */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                placeholder="Search for a service..." 
                className="w-full pl-12 pr-4 py-3 bg-slate-100 border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <main className="grow max-w-7xl mx-auto w-full px-6 py-12">
        {/* --- SERVICE GRID --- */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {quickActions
              .filter((action) => action.title.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((action) => (
                <div
                  key={action.id}
                  onClick={() => handleCardClick(action.view, action.title)}
                  className="group relative bg-white rounded-4xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col h-full cursor-pointer"
                >
                  {/* Icon Container */}
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ring-4 transition-transform group-hover:scale-110 duration-300 ${action.style}`}>
                    {action.icon}
                  </div>

                  {/* Content */}
                  <div className="grow">
                    <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight group-hover:text-indigo-600 transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-slate-500 leading-relaxed mb-6 text-sm">
                      {action.description}
                    </p>
                  </div>

                  {/* Footer Action */}
                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
                    <span className={`text-xs font-bold tracking-widest uppercase transition-opacity group-hover:opacity-100 opacity-0 flex items-center gap-2 ${action.style.split(' ')[1]}`}>
                      Go Now <ArrowRight size={16} />
                    </span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <ArrowRight size={16} />
                    </div>
                  </div>

                  {/* Decorative background element */}
                  <div className="absolute top-4 right-4 text-slate-100 opacity-0 group-hover:opacity-10 scale-[2] pointer-events-none transition-all duration-300 transform group-hover:rotate-12">
                      {action.icon}
                  </div>
                </div>
            ))}
          </div>
        </section>

        {/* --- HELP / CONTACT SECTION --- */}
        <section className="mt-20 p-10 rounded-[2.5rem] bg-indigo-900 text-white flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Can't find a specific service?</h2>
            <p className="text-indigo-200">Our medical assistance team is available 24/7 for support.</p>
          </div>
          <button 
            onClick={() => alert("Support ticket opened.")}
            className="bg-white text-indigo-900 hover:bg-indigo-50 px-10 py-4 rounded-2xl font-bold transition-colors whitespace-nowrap shadow-md text-sm"
          >
            Contact Support
          </button>
        </section>
      </main>

    </div>
  );
}