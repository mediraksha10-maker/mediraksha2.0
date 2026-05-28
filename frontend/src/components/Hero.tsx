import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import {
  Brain, MapPin, ArrowRight,
  ChevronLeft, ChevronRight, Stethoscope, FileText
} from "lucide-react";

/* ─────────────────────────────────────────────
   CAROUSEL SLIDES  (SVG inline — no external images)
───────────────────────────────────────────────*/
const slides = [
  {
    id: 0,
    label: "Emergency Ready",
    heading: "Find a hospital\nbefore you need one.",
    sub: "Real-time GPS tracking of verified clinics and trauma centres near you — available 24 / 7.",
    cta: { label: "Locate Now", to: "/map" },
    accent: "#6366f1",
    bg: "from-slate-900 via-indigo-950 to-slate-900",
    illustration: (
      <svg viewBox="0 0 420 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* city skyline */}
        <rect x="0" y="200" width="420" height="120" fill="#1e1b4b" opacity="0.6"/>
        {/* buildings */}
        <rect x="20"  y="140" width="40" height="80"  fill="#312e81" rx="4"/>
        <rect x="70"  y="110" width="30" height="110" fill="#3730a3" rx="4"/>
        <rect x="110" y="155" width="50" height="65"  fill="#312e81" rx="4"/>
        <rect x="170" y="120" width="35" height="100" fill="#4338ca" rx="4"/>
        <rect x="215" y="145" width="45" height="75"  fill="#3730a3" rx="4"/>
        <rect x="270" y="100" width="55" height="120" fill="#4338ca" rx="4"/>
        <rect x="335" y="130" width="40" height="90"  fill="#312e81" rx="4"/>
        <rect x="385" y="160" width="35" height="60"  fill="#3730a3" rx="4"/>
        {/* hospital building highlight */}
        <rect x="170" y="120" width="35" height="100" fill="#6366f1" rx="4" opacity="0.9"/>
        <rect x="182" y="134" width="5"  height="14"  fill="white"/>
        <rect x="178" y="138" width="13" height="6"   fill="white"/>
        {/* pin */}
        <circle cx="188" cy="110" r="16" fill="#6366f1"/>
        <circle cx="188" cy="110" r="8"  fill="white"/>
        <line x1="188" y1="126" x2="188" y2="138" stroke="#6366f1" strokeWidth="3"/>
        {/* pulse rings */}
        <circle cx="188" cy="110" r="24" stroke="#818cf8" strokeWidth="1.5" opacity="0.5"/>
        <circle cx="188" cy="110" r="34" stroke="#818cf8" strokeWidth="1"   opacity="0.3"/>
        {/* grid dots */}
        {[40,80,120,160,200,240,280,320,360,400].map(x =>
          [230,260,290].map(y => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="#6366f1" opacity="0.3"/>
          ))
        )}
      </svg>
    ),
  },
  {
    id: 1,
    label: "AI-Powered",
    heading: "Symptoms decoded\nin seconds.",
    sub: "Our LLM engine analyses your vitals and medical history to surface actionable insights instantly.",
    cta: { label: "Try AI Scan", to: "/chat" },
    accent: "#10b981",
    bg: "from-slate-900 via-emerald-950 to-slate-900",
    illustration: (
      <svg viewBox="0 0 420 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* brain outline */}
        <ellipse cx="210" cy="150" rx="90" ry="80" fill="#064e3b" opacity="0.6"/>
        <ellipse cx="210" cy="150" rx="90" ry="80" stroke="#10b981" strokeWidth="1.5" opacity="0.5"/>
        {/* neural network lines */}
        {[[140,100],[180,80],[240,75],[280,100],[310,140],[295,185],[260,210],[210,220],[160,210],[130,180],[120,140]].map(([x,y], i, arr) => {
          const next = arr[(i+1) % arr.length];
          return <line key={i} x1={x} y1={y} x2={next[0]} y2={next[1]} stroke="#10b981" strokeWidth="1" opacity="0.4"/>;
        })}
        {/* nodes */}
        {[[140,100],[180,80],[240,75],[280,100],[310,140],[295,185],[260,210],[210,220],[160,210],[130,180],[120,140],[210,150]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r={i===11?10:5} fill="#10b981" opacity={i===11?1:0.7}/>
        ))}
        {/* center pulse */}
        <circle cx="210" cy="150" r="20" stroke="#34d399" strokeWidth="1.5" opacity="0.4"/>
        <circle cx="210" cy="150" r="32" stroke="#34d399" strokeWidth="1"   opacity="0.2"/>
        {/* ECG line */}
        <polyline points="60,270 90,270 105,240 120,300 135,255 150,270 420,270" stroke="#10b981" strokeWidth="2" fill="none" opacity="0.7"/>
      </svg>
    ),
  },
  {
    id: 2,
    label: "Health Records",
    heading: "Your entire health\nhistory, one tap away.",
    sub: "Encrypted, structured, and always accessible. Share records with any doctor in seconds.",
    cta: { label: "View Records", to: "/hospital" },
    accent: "#f59e0b",
    bg: "from-slate-900 via-amber-950 to-slate-900",
    illustration: (
      <svg viewBox="0 0 420 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* clipboard */}
        <rect x="130" y="60" width="160" height="210" rx="12" fill="#292524" stroke="#f59e0b" strokeWidth="1.5" opacity="0.9"/>
        <rect x="170" y="48" width="80" height="24" rx="12" fill="#1c1917" stroke="#f59e0b" strokeWidth="1.5"/>
        {/* lines */}
        {[100,124,148,172,196,220].map((y, i) => (
          <rect key={i} x="150" y={y} width={i%3===0?80:100} height="8" rx="4" fill="#f59e0b" opacity={0.15 + i*0.05}/>
        ))}
        {/* checkmarks */}
        <circle cx="158" cy="104" r="8" fill="#f59e0b" opacity="0.8"/>
        <polyline points="154,104 157,108 163,100" stroke="white" strokeWidth="2" fill="none"/>
        <circle cx="158" cy="128" r="8" fill="#f59e0b" opacity="0.5"/>
        <circle cx="158" cy="152" r="8" fill="#78716c" opacity="0.3"/>
        {/* shield */}
        <path d="M290 180 L290 220 Q290 240 310 250 Q330 240 330 220 L330 180 L310 172 Z" fill="#f59e0b" opacity="0.2" stroke="#f59e0b" strokeWidth="1.5"/>
        <path d="M302 212 L308 218 L320 202" stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      </svg>
    ),
  },
];

/* ─────────────────────────────────────────────
   SERVICE CARDS
───────────────────────────────────────────────*/
const services = [
  {
    icon: <MapPin size={26} />,
    title: "Nearby Care",
    desc: "Locate certified hospitals and clinics using real-time GPS tracking.",
    to: "/map",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-100",
    hover: "group-hover:bg-indigo-600",
  },
  {
    icon: <Brain size={26} />,
    title: "AI Medical Assistant",
    desc: "Get instant health insights and symptom analysis powered by AI.",
    to: "/chat",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    hover: "group-hover:bg-emerald-600",
  },
  {
    icon: <FileText size={26} />,
    title: "Hospital",
    desc: "Get hospital resource(bed, room & more..) details at one place.",
    to: "/hospital",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    hover: "group-hover:bg-amber-600",
  },
  {
    icon: <Stethoscope size={26} />,
    title: "Disease solution",
    desc: "Symtoms and solutions map for 1000+ disease get details now.",
    to: "/disease",
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-100",
    hover: "group-hover:bg-rose-600",
  }
];

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────*/
export default function Dashboard() {
  const [current, setCurrent] = useState<number>(0);
  const [animating, setAnimating] = useState<boolean>(false);

  const go = useCallback((next: number) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent((next + slides.length) % slides.length);
      setAnimating(false);
    }, 300);
  }, [animating]);

  // Auto-advance
  useEffect(() => {
    const t = setInterval(() => go(current + 1), 5000);
    return () => clearInterval(t);
  }, [current, go]);

  const slide = slides[current];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">


      <main className="grow w-full px-4 sm:px-6 lg:px-8 py-8 space-y-12 max-w-7xl mx-auto">

        {/* ── HERO CAROUSEL ── */}
        <section className="relative overflow-hidden rounded-3xl shadow-2xl">
          {/* slide background */}
          <div className={`bg-linear-to-br ${slide.bg} transition-all duration-700`}>
            <div className={`flex flex-col md:flex-row items-center min-h-105 transition-opacity duration-300 ${animating ? "opacity-0" : "opacity-100"}`}>

              {/* text */}
              <div className="flex-1 p-8 md:p-14 flex flex-col justify-center">
                <span
                  className="inline-block text-[11px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-5 w-fit border"
                  style={{ color: slide.accent, borderColor: slide.accent + "55", background: slide.accent + "18" }}
                >
                  {slide.label}
                </span>
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4 whitespace-pre-line tracking-tight">
                  {slide.heading}
                </h1>
                <p className="text-slate-300 text-base md:text-lg leading-relaxed mb-8 max-w-md">
                  {slide.sub}
                </p>
                <Link
                  to={slide.cta.to}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm text-white w-fit transition-all hover:gap-4 hover:opacity-90"
                  style={{ background: slide.accent }}
                >
                  {slide.cta.label} <ArrowRight size={16} />
                </Link>
              </div>

              {/* illustration */}
              <div className="shrink-0 w-full md:w-95 h-55 md:h-80 p-4 md:p-8">
                {slide.illustration}
              </div>
            </div>
          </div>

          {/* nav arrows */}
          <button
            onClick={() => go(current - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center text-white transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => go(current + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center text-white transition-all"
          >
            <ChevronRight size={20} />
          </button>

          {/* dots */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => go(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === current ? "28px" : "8px",
                  background: i === current ? slide.accent : "rgba(255,255,255,0.35)",
                }}
              />
            ))}
          </div>
        </section>

        {/* ── SERVICES GRID ── */}
        <section>
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Quick Services</h2>
            <p className="text-slate-500 mt-1">Everything you need for your healthcare journey</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <Link
                key={s.title}
                to={s.to}
                className={`group relative bg-white border ${s.border} rounded-3xl p-7 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col gap-4`}
              >
                {/* icon */}
                <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.color} ${s.hover} group-hover:text-white flex items-center justify-center transition-all duration-300 shrink-0`}>
                  {s.icon}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>

                <span className={`mt-auto flex items-center gap-1.5 text-sm font-bold ${s.color} group-hover:gap-3 transition-all duration-300`}>
                  Explore <ArrowRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </section>

      </main>


    </div>
  );
}