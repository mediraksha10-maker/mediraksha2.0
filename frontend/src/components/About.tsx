
import { MapPinned, GlobeLock, FileCog, HeartPulse } from 'lucide-react';

const pillars = [
  {
    icon: <MapPinned size={24} />,
    title: "Real-Time Accessibility",
    desc: "Live GPS tracking of verified hospitals and clinics — available 24/7, even in emergencies.",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    icon: <GlobeLock size={24} />,
    title: "Data Security",
    desc: "AES-256 encryption on all records. Your health data is yours — no third-party access, ever.",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    icon: <FileCog size={24} />,
    title: "Digital Efficiency",
    desc: "Paperless prescriptions and lab reports, instantly readable by any authorised provider.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
];

const stats = [
  { value: "24/7", label: "Availability" },
  { value: "100%", label: "Data Privacy" },
  { value: "Instant", label: "AI Diagnostics" },
];

const About = () => (
  <div className="flex flex-col min-h-screen bg-white">

    <main className="grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 space-y-16">

      {/* ── MISSION ── */}
      <section className="flex flex-col md:flex-row items-center gap-10 bg-slate-900 rounded-3xl p-10 md:p-14 overflow-hidden relative">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 md:w-2/3">
          <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 rounded-full mb-5">
            <HeartPulse size={13} /> Our Mission
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight mb-4">
            Bridging the gap between<br />
            <span className="bg-linear-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">care and patient.</span>
          </h1>
          <p className="text-slate-400 leading-relaxed max-w-xl">
            MediRaksha ensures life-saving data and professional care are never more than a tap away — in a crisis, every second counts.
          </p>
        </div>

        {/* stats */}
        <div className="relative z-10 md:w-1/3 grid grid-cols-3 md:grid-cols-1 gap-4 w-full">
          {stats.map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-center">
              <div className="text-2xl font-black text-white">{s.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PILLARS ── */}
      <section>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-8">What we stand for</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map(p => (
            <div key={p.title} className="bg-slate-50 border border-slate-100 rounded-3xl p-7 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className={`w-11 h-11 rounded-xl ${p.bg} ${p.color} flex items-center justify-center mb-5`}>
                {p.icon}
              </div>
              <h3 className="font-bold text-slate-800 mb-2">{p.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </main>

  </div>
);

export default About;