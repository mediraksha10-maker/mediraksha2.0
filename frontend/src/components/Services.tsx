import React, { useState } from "react";
import { ClipboardMinus, CalendarCheck2, BriefcaseMedical, Search, ArrowRight, ShieldAlert, Phone } from "lucide-react";
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
    view: "/records",
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
  const handleCardClick = (viewPath: string, _title: string): void => {
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

        {/* --- EMERGENCY FEATURED CARD --- */}
        <section className="mb-10">
          <div className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-rose-700 via-rose-600 to-rose-500 p-8 md:p-10">
            {/* decorative circles */}
            <div className="absolute -right-12 -bottom-12 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute -right-4 -bottom-4 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute top-6 right-28 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />

            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="flex items-start gap-5">
                {/* pulsing icon */}
                <div className="relative shrink-0 mt-1">
                  <div className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
                  <div className="relative w-14 h-14 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white">
                    <ShieldAlert size={26} />
                  </div>
                </div>

                <div>
                  <span className="inline-block text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-white/20 text-white/90 mb-3">
                    Critical Response
                  </span>
                  <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
                    Facing a Medical Emergency?
                  </h2>
                  <p className="text-rose-100 text-sm mt-2 max-w-md leading-relaxed">
                    One tap triggers SOS — we instantly capture your GPS, issue a secure hospital token,
                    and notify your emergency contacts.
                  </p>

                  <div className="flex flex-wrap gap-4 mt-4">
                    {[
                      'GPS location captured',
                      'Emergency contacts alerted',
                      'Hospital-ready access token',
                    ].map((label) => (
                      <span key={label} className="flex items-center gap-1.5 text-xs text-rose-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-200 shrink-0" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 shrink-0">
                <button
                  onClick={() => navigate('/emergency')}
                  className="bg-white text-rose-600 hover:bg-rose-50 active:scale-95 font-black px-10 py-4 rounded-2xl transition-all text-sm uppercase tracking-widest shadow-xl whitespace-nowrap"
                >
                  Trigger SOS
                </button>
                <a
                  href="tel:112"
                  className="flex items-center justify-center gap-2 border border-white/30 hover:bg-white/10 text-white font-semibold px-6 py-3 rounded-2xl transition-all text-sm"
                >
                  <Phone size={15} /> Call 112
                </a>
              </div>
            </div>
          </div>
        </section>

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
