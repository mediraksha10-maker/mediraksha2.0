import { useEffect, useState, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  ArrowLeft, BedDouble, MapPin, Navigation, LocateFixed, Search, Building2,
  Stethoscope, Phone, Filter, X, Star, Clock, ChevronRight, FlaskConical,
  Pill, Package, Users, Scale, CheckCircle, SlidersHorizontal, Activity,
  ShieldCheck, Heart, Globe, Award, Briefcase, LayoutGrid, List as ListIcon,
  Zap, ArrowUpDown,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import api from "../api/Api";
import { HOSPITALS, DOCTORS, LABS, PHARMACIES, PACKAGES } from "./nearbyCareData";
import type { HospitalFull, DoctorFull, LabCenter, PharmacyStore } from "./nearbyCareData";

interface GpsHospital {
  id: number | string; lat: number; lon: number; name: string;
  distance: number; address?: string; placeId?: string;
}

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41],
});

const makeIcon = (bg: string, emoji: string) => new L.DivIcon({
  html: `<div style="background:${bg};padding:5px 7px;border-radius:10px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);font-size:13px;line-height:1;white-space:nowrap">${emoji}</div>`,
  className: "", iconSize: [32, 26], iconAnchor: [16, 13],
});

const hospitalMapIcon = makeIcon("#6366f1", "🏥");
const labMapIcon      = makeIcon("#7c3aed", "🧪");
const pharmMapIcon    = makeIcon("#f43f5e", "💊");
const packageMapIcon  = makeIcon("#f59e0b", "📦");

function FlyTo({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (pos) map.flyTo(pos, 15, { duration: 1.2 }); }, [pos, map]);
  return null;
}

const haversine = (la1: number, lo1: number, la2: number, lo2: number) => {
  const R = 6371, dLat = ((la2 - la1) * Math.PI) / 180, dLon = ((lo2 - lo1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

function sortItems<T extends { distance: number; rating: number; name: string; isOpen?: boolean }>(
  items: T[], by: string
): T[] {
  return [...items].sort((a, b) =>
    by === "distance" ? a.distance - b.distance :
    by === "rating"   ? b.rating - a.rating :
    by === "open"     ? (b.isOpen ? 1 : 0) - (a.isOpen ? 1 : 0) :
    a.name.localeCompare(b.name)
  );
}

function Stars({ r, onDark = false }: { r: number; onDark?: boolean }) {
  const filled = Math.round(r);
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={10}
          className={i <= filled
            ? "fill-amber-400 text-amber-400"
            : onDark ? "fill-white/20 text-white/20" : "fill-slate-200 text-slate-200"} />
      ))}
      <span className={`text-[10px] font-bold ml-0.5 ${onDark ? "text-amber-300" : "text-amber-600"}`}>{r.toFixed(1)}</span>
    </span>
  );
}

function RatingBadge({ r }: { r: number }) {
  return (
    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg shadow-sm shrink-0">
      <Star size={11} className="fill-amber-400 text-amber-400" />
      <span className="text-[11px] font-black text-amber-700">{r.toFixed(1)}</span>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: "slate"|"indigo"|"emerald"|"rose"|"violet"|"amber" }) {
  const cls = {
    slate:   "bg-slate-100 text-slate-600",
    indigo:  "bg-indigo-50 text-indigo-700 border border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    rose:    "bg-rose-50 text-rose-600 border border-rose-100",
    violet:  "bg-violet-50 text-violet-700 border border-violet-100",
    amber:   "bg-amber-50 text-amber-700 border border-amber-100",
  }[color];
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${cls}`}>{label}</span>;
}

/* ── Review helpers (localStorage) ── */
type LocalReview = { id: string; rating: number; text: string; author: string; date: string; };
const REVIEWS_KEY = "mediraksha_reviews_v2";
const getLocalReviews = (type: "hospital"|"doctor", id: number): LocalReview[] => {
  try { const raw = localStorage.getItem(REVIEWS_KEY); if (!raw) return []; return (JSON.parse(raw) as any[]).filter(r => r.entityType === type && r.entityId === id); } catch { return []; }
};
const saveLocalReview = (type: "hospital"|"doctor", id: number, review: LocalReview) => {
  try { const all: any[] = JSON.parse(localStorage.getItem(REVIEWS_KEY) || "[]"); all.push({ ...review, entityType: type, entityId: id }); localStorage.setItem(REVIEWS_KEY, JSON.stringify(all)); } catch {}
};

function ReviewModal({ entityType, entityId, entityName, onClose, onDone }: {
  entityType: "hospital"|"doctor"; entityId: number; entityName: string;
  onClose: () => void; onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const submit = () => {
    if (!rating) return;
    saveLocalReview(entityType, entityId, { id: Date.now().toString(), rating, text, author: author || "Anonymous", date: new Date().toLocaleDateString("en-IN") });
    onDone(); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-800 text-lg">Rate & Review</h2>
            <p className="text-slate-400 text-xs mt-0.5 font-medium truncate max-w-xs">{entityName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-center gap-2">
            {[1,2,3,4,5].map(i => (
              <button key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(0)} onClick={() => setRating(i)} className="transition-all hover:scale-125 active:scale-95">
                <Star size={38} className={i <= (hovered || rating) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"} />
              </button>
            ))}
          </div>
          {(hovered || rating) > 0 && <p className="text-center text-sm font-black text-amber-600">{["","Poor","Fair","Good","Very Good","Excellent"][(hovered || rating)]}</p>}
          <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Your name (optional)"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700" />
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Share your experience (optional)…"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700" />
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={submit} disabled={!rating} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-sm rounded-xl transition-all shadow-lg">Submit Review</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortViewBar({
  count, label, sortBy, onSort, viewMode, onView, showRange, selectedRange, onRangeChange,
}: {
  count: number; label: string; sortBy: string; onSort: (s: string) => void;
  viewMode: "list"|"map"; onView: (v: "list"|"map") => void;
  showRange?: boolean; selectedRange?: number; onRangeChange?: (r: number) => void;
}) {
  const sorts = [
    { key: "distance", icon: <Navigation size={11}/>, text: "Nearest" },
    { key: "rating",   icon: <Star size={11}/>,       text: "Top Rated" },
    { key: "open",     icon: <Clock size={11}/>,       text: "Open Now" },
    { key: "name",     icon: <ArrowUpDown size={11}/>, text: "A – Z" },
  ];
  return (
    <div className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-2.5 shadow-sm">
      <span className="text-xs font-bold text-slate-500 shrink-0 bg-slate-100 px-2.5 py-1 rounded-lg">{count} <span className="text-slate-400">{label}</span></span>
      <div className="flex gap-1.5 overflow-x-auto flex-1 hide-scrollbar">
        {sorts.map(s => (
          <button key={s.key} onClick={() => onSort(s.key)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all flex items-center gap-1.5
              ${sortBy === s.key
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600"}`}>
            {s.icon} {s.text}
          </button>
        ))}
      </div>
      {showRange && onRangeChange && (
        <div className="flex bg-slate-100 p-0.5 rounded-xl shrink-0 gap-0.5">
          {([2,5,10] as const).map(km => (
            <button key={km} onClick={() => onRangeChange(km)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${selectedRange === km ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {km}km
            </button>
          ))}
        </div>
      )}
      <div className="flex bg-indigo-50 border border-indigo-100 p-0.5 rounded-xl shrink-0 gap-0.5">
        <button onClick={() => onView("list")}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-[11px] font-bold ${viewMode === "list" ? "bg-white text-indigo-600 shadow-sm border border-indigo-200" : "text-indigo-400 hover:text-indigo-600"}`}>
          <LayoutGrid size={12} /><span>List</span>
        </button>
        <button onClick={() => onView("map")}
          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-[11px] font-bold ${viewMode === "map" ? "bg-white text-indigo-600 shadow-sm border border-indigo-200" : "text-indigo-400 hover:text-indigo-600"}`}>
          <MapPin size={12} /><span>Map</span>
        </button>
      </div>
    </div>
  );
}

function HospitalCard({ h, onSelect, onDirections, compareList, onToggleCompare, compact = false }: {
  h: HospitalFull; onSelect: (h: HospitalFull) => void;
  onDirections: (lat: number, lon: number, name: string) => void;
  compareList: HospitalFull[]; onToggleCompare: (h: HospitalFull) => void;
  compact?: boolean;
}) {
  const inCompare = compareList.some(c => c.id === h.id);

  if (compact) {
    return (
      <div onClick={() => onSelect(h)}
        className="p-3 border-b border-slate-50 hover:bg-indigo-50 cursor-pointer transition-colors group">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="font-bold text-slate-800 text-xs leading-tight group-hover:text-indigo-700 transition-colors line-clamp-2">{h.name}</p>
          <Stars r={h.rating} />
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-indigo-600"><Navigation size={9} />{h.distance.toFixed(1)} km</span>
          <span className={`flex items-center gap-0.5 text-[9px] font-black ${h.isOpen ? "text-emerald-600" : "text-slate-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${h.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />{h.isOpen ? "Open" : "Closed"}
          </span>
          {h.emergency && <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5"><Zap size={8} />Emg</span>}
          {h.is24x7 && <Chip label="24/7" color="emerald" />}
        </div>
        <div className="flex gap-1.5">
          <a href={`tel:${h.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[10px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-all"><Phone size={9} />Call</a>
          <button onClick={e => { e.stopPropagation(); onDirections(h.lat, h.lon, h.name); }} className="flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-all"><Navigation size={9} />Go</button>
          <button onClick={() => onSelect(h)} className="ml-auto text-[10px] font-black text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-lg transition-all flex items-center gap-0.5">Details <ChevronRight size={9} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group border border-slate-100">
      {/* Image header */}
      <div className="relative h-44 overflow-hidden">
        <img src={h.image} alt={h.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/30 to-transparent" />
        {/* Top row badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {h.emergency && (
            <span className="flex items-center gap-1 text-[10px] font-black text-white bg-rose-500 px-2 py-1 rounded-lg shadow-lg">
              <Zap size={9} />Emergency
            </span>
          )}
          {h.is24x7 && (
            <span className="text-[10px] font-black text-white bg-emerald-500/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg">24/7</span>
          )}
        </div>
        {/* Compare toggle */}
        <button onClick={e => { e.stopPropagation(); onToggleCompare(h); }}
          className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black transition-all shadow-md backdrop-blur-sm ${inCompare ? "bg-indigo-600 text-white border border-indigo-500" : "bg-white/90 text-slate-700 border border-white/60 hover:bg-indigo-50 hover:text-indigo-700"}`}
          title={inCompare ? "Remove from compare" : "Add to compare"}>
          <Scale size={10} />{inCompare ? "Added ✓" : "Compare"}
        </button>
        {/* Bottom overlay: name + address + rating */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-white text-sm leading-snug mb-0.5 drop-shadow">{h.name}</h3>
              <p className="text-white/70 text-[10px] flex items-center gap-1 truncate"><MapPin size={9} className="shrink-0" />{h.address}</p>
            </div>
            <RatingBadge r={h.rating} />
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        {/* Status row */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
            <Navigation size={10} />{h.distance.toFixed(1)} km
          </span>
          <span className={`flex items-center gap-1 text-[10px] font-black ${h.isOpen ? "text-emerald-600" : "text-slate-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${h.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
            {h.isOpen ? "Open Now" : "Closed"}
          </span>
        </div>

        {/* Specializations */}
        <div className="flex flex-wrap gap-1 mb-3">
          {h.specializations.slice(0, 3).map(s => <Chip key={s} label={s} color="slate" />)}
          {h.specializations.length > 3 && (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">+{h.specializations.length - 3} more</span>
          )}
        </div>

        {/* Services strip */}
        <div className="flex items-center gap-3 py-2.5 border-y border-slate-50 mb-3">
          {h.diagnosticsAvailable && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-violet-600"><FlaskConical size={11} />Diagnostics</span>
          )}
          {h.pharmacyAvailable && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500"><Pill size={11} />Pharmacy</span>
          )}
          <span className="ml-auto text-[10px] text-slate-400 font-bold flex items-center gap-1"><BedDouble size={10} />{h.beds} beds</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <a href={`tel:${h.phone}`} onClick={e => e.stopPropagation()}
            className="flex items-center justify-center gap-1.5 flex-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 py-2 rounded-xl transition-all">
            <Phone size={12} />Call
          </a>
          <button onClick={e => { e.stopPropagation(); onDirections(h.lat, h.lon, h.name); }}
            className="flex items-center justify-center gap-1.5 flex-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 py-2 rounded-xl transition-all">
            <Navigation size={12} />Directions
          </button>
          <button onClick={() => onSelect(h)}
            className="flex items-center justify-center gap-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-xl transition-all shrink-0">
            Details <ChevronRight size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

function LabCard({ l, onDirections, compact = false }: {
  l: LabCenter; onDirections: (lat: number, lon: number, name: string) => void; compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="p-3 border-b border-slate-50 hover:bg-violet-50 cursor-pointer transition-colors group">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="font-bold text-slate-800 text-xs leading-tight group-hover:text-violet-700 transition-colors line-clamp-2">{l.name}</p>
          <Stars r={l.rating} />
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-violet-600"><Navigation size={9} />{l.distance.toFixed(1)} km</span>
          <span className={`flex items-center gap-0.5 text-[9px] font-black ${l.isOpen ? "text-emerald-600" : "text-slate-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${l.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />{l.isOpen ? "Open" : "Closed"}
          </span>
          {l.homeCollection && <span className="text-[9px] font-black text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-md">🏠 Home</span>}
        </div>
        <div className="flex gap-1.5">
          <a href={`tel:${l.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[10px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-all"><Phone size={9} />Call</a>
          <button onClick={e => { e.stopPropagation(); onDirections(l.lat, l.lon, l.name); }} className="flex items-center gap-1 text-[10px] font-black text-violet-600 bg-violet-50 hover:bg-violet-100 px-2 py-1 rounded-lg transition-all"><Navigation size={9} />Go</button>
          <span className="ml-auto text-[11px] font-black text-violet-700">₹{l.startingPrice}+</span>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border border-slate-100">
      {/* Gradient header band */}
      <div className="relative bg-gradient-to-br from-violet-600 to-violet-800 px-5 py-4 overflow-hidden flex items-center gap-4">
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-10 bottom-0 w-12 h-12 rounded-full bg-white/10 pointer-events-none" />
        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
          <FlaskConical className="text-white" size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-white text-sm leading-tight">{l.name}</h3>
          <p className="text-violet-200 text-[11px] truncate flex items-center gap-1 mt-0.5"><MapPin size={9} className="shrink-0" />{l.address}</p>
        </div>
        <Stars r={l.rating} onDark />
      </div>
      {/* Body */}
      <div className="p-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="flex items-center gap-1 text-[11px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-lg"><Navigation size={10} />{l.distance.toFixed(1)} km</span>
          <span className={`flex items-center gap-1 text-[10px] font-black ${l.isOpen ? "text-emerald-600" : "text-slate-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${l.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />{l.isOpen ? "Open Now" : "Closed"}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold"><Clock size={10} />{l.timings}</span>
          {l.homeCollection && <Chip label="🏠 Home Collection" color="violet" />}
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {l.tests.slice(0, 4).map(t => <Chip key={t} label={t} color="slate" />)}
          {l.tests.length > 4 && <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">+{l.tests.length - 4} more</span>}
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
          <span className="text-lg font-black text-violet-700 mr-auto">₹{l.startingPrice}<span className="text-xs font-bold text-slate-400"> onwards</span></span>
          <a href={`tel:${l.phone}`} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-all"><Phone size={12} />Call</a>
          <button onClick={() => onDirections(l.lat, l.lon, l.name)} className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-xl transition-all"><Navigation size={12} />Directions</button>
          <button className="flex items-center gap-1 text-[11px] font-bold text-white bg-violet-600 hover:bg-violet-700 px-3 py-2 rounded-xl transition-all">Book</button>
        </div>
      </div>
    </div>
  );
}

function PharmacyCard({ p, onDirections, compact = false }: {
  p: PharmacyStore; onDirections: (lat: number, lon: number, name: string) => void; compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="p-3 border-b border-slate-50 hover:bg-rose-50 cursor-pointer transition-colors group">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="font-bold text-slate-800 text-xs leading-tight group-hover:text-rose-700 transition-colors line-clamp-2">{p.name}</p>
          <Stars r={p.rating} />
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-600"><Navigation size={9} />{p.distance.toFixed(1)} km</span>
          <span className={`flex items-center gap-0.5 text-[9px] font-black ${p.isOpen ? "text-emerald-600" : "text-slate-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${p.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />{p.isOpen ? "Open" : "Closed"}
          </span>
          {p.is24x7 && <Chip label="24/7" color="emerald" />}
          {p.delivery && <Chip label="Delivery" color="indigo" />}
        </div>
        <div className="flex gap-1.5">
          <a href={`tel:${p.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[10px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-all"><Phone size={9} />Call</a>
          <button onClick={e => { e.stopPropagation(); onDirections(p.lat, p.lon, p.name); }} className="flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg transition-all"><Navigation size={9} />Go</button>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border border-slate-100">
      {/* Gradient header band */}
      <div className="relative bg-gradient-to-br from-rose-500 to-rose-700 px-5 py-4 overflow-hidden flex items-center gap-4">
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-8 bottom-0 w-14 h-14 rounded-full bg-white/10 pointer-events-none" />
        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
          <Pill className="text-white" size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-white text-sm leading-tight">{p.name}</h3>
          <p className="text-rose-200 text-[11px] truncate flex items-center gap-1 mt-0.5"><MapPin size={9} className="shrink-0" />{p.address}</p>
        </div>
        <Stars r={p.rating} />
      </div>
      {/* Body */}
      <div className="p-4">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg"><Navigation size={10} />{p.distance.toFixed(1)} km</span>
          <span className={`flex items-center gap-1 text-[10px] font-black ${p.isOpen ? "text-emerald-600" : "text-slate-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${p.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />{p.isOpen ? "Open Now" : "Closed"}
          </span>
          {p.is24x7 && <Chip label="24/7" color="emerald" />}
          {p.delivery && <Chip label="🚚 Home Delivery" color="indigo" />}
        </div>
        <div className="flex gap-2 pt-3 border-t border-slate-50">
          <a href={`tel:${p.phone}`} className="flex items-center justify-center gap-1.5 flex-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 py-2 rounded-xl transition-all"><Phone size={12} />Call</a>
          <button onClick={() => onDirections(p.lat, p.lon, p.name)} className="flex items-center justify-center gap-1.5 flex-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 py-2 rounded-xl transition-all"><Navigation size={12} />Directions</button>
        </div>
      </div>
    </div>
  );
}

function HospitalDetail({ h, onBack }: { h: HospitalFull; onBack: () => void }) {
  const doctors = DOCTORS.filter(d => d.hospitalId === h.id);
  const [tab, setTab] = useState("overview");
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);
  const [selectedDocFromDept, setSelectedDocFromDept] = useState<DoctorFull | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviews, setReviews] = useState<LocalReview[]>([]);
  const refreshReviews = () => setReviews(getLocalReviews("hospital", h.id));
  useEffect(() => { refreshReviews(); }, [h.id]);
  const openDir = () => window.open(`https://www.google.com/maps/search/${encodeURIComponent(h.name + " " + h.address)}`, "_blank");

  const tabs = [
    { key: "overview",    label: "Overview"    },
    { key: "departments", label: "Departments" },
    { key: "services",    label: "Services"    },
    { key: "insurance",   label: "Insurance"   },
    { key: "doctors",     label: "Doctors"     },
    { key: "reviews",     label: "Reviews"     },
    { key: "contact",     label: "Contact"     },
  ];

  /* dept icon colours cycling */
  const deptColors = [
    { bg: "from-indigo-500 to-indigo-700",   ring: "ring-indigo-200"  },
    { bg: "from-violet-500 to-violet-700",   ring: "ring-violet-200"  },
    { bg: "from-blue-500 to-blue-700",       ring: "ring-blue-200"    },
    { bg: "from-emerald-500 to-emerald-700", ring: "ring-emerald-200" },
    { bg: "from-rose-500 to-rose-700",       ring: "ring-rose-200"    },
    { bg: "from-amber-500 to-amber-700",     ring: "ring-amber-200"   },
  ];

  if (selectedDocFromDept) return <DoctorProfile d={selectedDocFromDept} onBack={() => setSelectedDocFromDept(null)} />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 font-sans pb-8">

      {/* ── Rich Hero ── */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img src={h.image} alt={h.name} className="w-full h-full object-cover" />
        {/* Multi-layer gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-slate-900/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/30 to-transparent" />

        {/* Decorative light orbs */}
        <div className="absolute top-8 right-12 w-32 h-32 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-16 right-6 w-20 h-20 rounded-full bg-violet-500/15 blur-xl pointer-events-none" />

        {/* Back button — glassmorphism */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/20 transition-all shadow-lg text-sm font-bold"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Status badges top-right */}
        <div className="absolute top-4 right-4 flex flex-col gap-1.5 items-end">
          {h.emergency && (
            <span className="flex items-center gap-1 bg-rose-600/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl shadow-lg">
              ⚡ Emergency
            </span>
          )}
          {h.is24x7 && (
            <span className="bg-emerald-600/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl shadow-lg">
              24 / 7
            </span>
          )}
        </div>

        {/* Bottom overlay — name, address, rating */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-8">
          <div className="flex items-end justify-between gap-3">
            <div className="flex-1 min-w-0">
              {h.type && (
                <span className="inline-block text-[10px] font-black uppercase tracking-widest text-indigo-200 bg-indigo-900/50 border border-indigo-500/30 px-2.5 py-1 rounded-lg mb-2 backdrop-blur-sm">
                  {h.type}
                </span>
              )}
              <h1 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow">{h.name}</h1>
              <p className="text-slate-300 text-sm mt-1 flex items-center gap-1.5 font-medium">
                <MapPin size={13} className="text-slate-400 shrink-0" />{h.address}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-center gap-1 bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl px-3 py-2.5">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={11} className={i <= Math.round(h.rating) ? "fill-amber-400 text-amber-400" : "fill-white/20 text-white/20"} />
                ))}
              </div>
              <span className="text-amber-300 font-black text-base leading-none">{h.rating.toFixed(1)}</span>
              <span className="text-white/50 text-[9px] font-bold">Rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="max-w-4xl mx-auto px-4 -mt-5 relative z-10 mb-3">
        <div className="bg-white rounded-2xl shadow-xl shadow-indigo-200/30 border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-slate-100">
            {[
              { icon: <BedDouble size={16} className="text-indigo-500" />,   label: "Beds",      value: String(h.beds),              color: "text-indigo-700", bg: "bg-indigo-50"   },
              { icon: <Activity size={16} className="text-violet-500" />,    label: "Depts",     value: String(h.specializations.length), color: "text-violet-700", bg: "bg-violet-50" },
              { icon: <Users size={16} className="text-emerald-500" />,      label: "Doctors",   value: `${doctors.length}+`,         color: "text-emerald-700",bg: "bg-emerald-50"  },
              { icon: <Navigation size={16} className="text-blue-500" />,    label: "Distance",  value: `${h.distance.toFixed(1)} km`,color: "text-blue-700",   bg: "bg-blue-50"     },
            ].map(({ icon, label, value, color, bg }) => (
              <div key={label} className="py-4 flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
                <p className={`text-base font-black ${color} leading-none`}>{value}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab navigation ── */}
      <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-3 flex gap-0.5 overflow-x-auto hide-scrollbar py-2">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelectedSpec(null); }}
              className={`px-4 py-2 text-[11px] font-black uppercase tracking-wider shrink-0 rounded-xl transition-all ${
                tab === t.key
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-400/30"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Building2 size={17} className="text-white" />
                  </div>
                  <div>
                    <h2 className="font-black text-white text-base">About {h.name.split(" ").slice(0, 3).join(" ")}</h2>
                    <p className="text-indigo-200 text-[11px] font-medium">Est. {h.established}</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <p className="text-slate-600 text-sm leading-relaxed">{h.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Type",            value: h.type,                        icon: <Building2 size={15} />,  bg: "bg-indigo-50",  iconC: "text-indigo-500",  textC: "text-indigo-700"  },
                { label: "Departments",     value: String(h.specializations.length), icon: <Activity size={15} />,  bg: "bg-violet-50",  iconC: "text-violet-500",  textC: "text-violet-700"  },
                { label: "Insurance Plans", value: `${h.insurance.length}+`,      icon: <ShieldCheck size={15} />,bg: "bg-emerald-50", iconC: "text-emerald-500", textC: "text-emerald-700" },
                { label: "Doctors",         value: `${doctors.length}+`,          icon: <Users size={15} />,      bg: "bg-blue-50",    iconC: "text-blue-500",    textC: "text-blue-700"    },
              ].map(({ label, value, icon, bg, iconC, textC }) => (
                <div key={label} className={`${bg} rounded-2xl p-4 flex flex-col gap-2 border border-white`}>
                  <div className={`w-8 h-8 rounded-xl bg-white flex items-center justify-center ${iconC} shadow-sm`}>{icon}</div>
                  <p className={`text-lg font-black ${textC} leading-none capitalize`}>{value}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                </div>
              ))}
            </div>

            {/* Quick specializations preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center"><Stethoscope size={13} className="text-indigo-600" /></div>
                Specializations
              </h3>
              <div className="flex flex-wrap gap-2">
                {h.specializations.map((s, i) => {
                  const cols = ["bg-indigo-50 text-indigo-700 border-indigo-100","bg-violet-50 text-violet-700 border-violet-100","bg-blue-50 text-blue-700 border-blue-100","bg-emerald-50 text-emerald-700 border-emerald-100","bg-amber-50 text-amber-700 border-amber-100","bg-rose-50 text-rose-600 border-rose-100"];
                  return <span key={s} className={`text-[11px] font-bold border px-3 py-1.5 rounded-xl ${cols[i % cols.length]}`}>{s}</span>;
                })}
              </div>
            </div>
          </>
        )}

        {/* ── DEPARTMENTS ── */}
        {tab === "departments" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {!selectedSpec ? (
              <>
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <Activity size={17} className="text-white" />
                    </div>
                    <div>
                      <h2 className="font-black text-white text-base">Specialised Departments</h2>
                      <p className="text-violet-200 text-[11px] font-medium">Tap a department to see its doctors</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {h.specializations.map((s, i) => {
                    const docCount = doctors.filter(d => d.specialization === s).length;
                    const c = deptColors[i % deptColors.length];
                    return (
                      <button
                        key={s}
                        onClick={() => setSelectedSpec(s)}
                        className="group flex items-center gap-3.5 p-4 bg-slate-50 hover:bg-indigo-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all text-left shadow-xs hover:shadow-md"
                      >
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.bg} flex items-center justify-center shrink-0 shadow-md ring-2 ${c.ring}`}>
                          <Stethoscope size={17} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-800 text-sm block group-hover:text-indigo-700 transition-colors">{s}</span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {docCount > 0 ? `${docCount} doctor${docCount !== 1 ? "s" : ""}` : "No doctors on record"}
                          </span>
                        </div>
                        <ChevronRight size={15} className="text-slate-300 group-hover:text-indigo-500 shrink-0 transition-all group-hover:translate-x-0.5" />
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-indigo-50/60">
                  <button
                    onClick={() => setSelectedSpec(null)}
                    className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-200 hover:bg-indigo-50 flex items-center justify-center text-slate-600 transition-all shrink-0"
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <div>
                    <h2 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                      <Stethoscope size={14} className="text-indigo-600" />{selectedSpec}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {doctors.filter(d => d.specialization === selectedSpec).length} doctor(s) · {h.name.split(" ").slice(0, 2).join(" ")}
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-slate-50">
                  {doctors.filter(d => d.specialization === selectedSpec).length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                        <Users size={24} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-500">No doctor records for this specialty</p>
                    </div>
                  ) : (
                    doctors.filter(d => d.specialization === selectedSpec).map(d => (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDocFromDept(d)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-indigo-50/50 transition-colors text-left group"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={d.photo} alt={d.name}
                            className="w-13 h-13 w-[52px] h-[52px] rounded-2xl object-cover border-2 border-indigo-100 shadow-sm"
                            onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=6366f1&color=fff&size=52`; }}
                          />
                          <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${d.available ? "bg-emerald-500" : "bg-slate-300"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{d.name}</p>
                          <p className="text-xs text-indigo-600 font-semibold">{d.specialization}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{d.qualification} · {d.experience} yrs exp</p>
                        </div>
                        <div className="text-right shrink-0 space-y-1.5">
                          <Stars r={d.rating} />
                          <p className="text-sm font-black text-emerald-600">₹{d.consultationFee}</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 shrink-0 transition-all" />
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SERVICES ── */}
        {tab === "services" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <ShieldCheck size={17} className="text-white" />
                </div>
                <div>
                  <h2 className="font-black text-white text-base">Facilities & Services</h2>
                  <p className="text-emerald-100 text-[11px] font-medium">Available amenities at this hospital</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-2.5">
              {[
                { label: "24/7 Emergency",     ok: h.emergency,              desc: "Round-the-clock emergency trauma care",    icon: "⚡" },
                { label: "Open 24 Hours",      ok: h.is24x7,                 desc: "OPD and all services available anytime",   icon: "🕐" },
                { label: "Diagnostics",        ok: h.diagnosticsAvailable,   desc: "MRI, CT, X-Ray, blood tests on-site",      icon: "🔬" },
                { label: "In-house Pharmacy",  ok: h.pharmacyAvailable,      desc: "Medicines dispensed within the hospital",  icon: "💊" },
                { label: "ICU & Critical Care",ok: h.beds > 200,             desc: "Dedicated intensive care unit",            icon: "🏥" },
                { label: "Blood Bank",         ok: h.beds > 100,             desc: "24/7 blood bank facility",                 icon: "🩸" },
              ].map(({ label, ok, desc, icon }) => (
                <div
                  key={label}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    ok ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-lg shadow-sm ${ok ? "bg-emerald-100" : "bg-slate-100"}`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${ok ? "text-emerald-900" : "text-slate-400"}`}>{label}</p>
                    <p className={`text-[11px] mt-0.5 ${ok ? "text-emerald-600" : "text-slate-400"}`}>{desc}</p>
                  </div>
                  <div className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${ok ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-200 text-slate-400"}`}>
                    {ok ? "Active" : "N/A"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── INSURANCE ── */}
        {tab === "insurance" && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Heart size={17} className="text-white" />
                </div>
                <div>
                  <h2 className="font-black text-white text-base">Accepted Insurance</h2>
                  <p className="text-rose-100 text-[11px] font-medium">{h.insurance.length} plans accepted</p>
                </div>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {h.insurance.map((ins, i) => {
                const insColors = ["bg-rose-50 border-rose-100 text-rose-700","bg-indigo-50 border-indigo-100 text-indigo-700","bg-violet-50 border-violet-100 text-violet-700","bg-amber-50 border-amber-100 text-amber-700","bg-blue-50 border-blue-100 text-blue-700","bg-emerald-50 border-emerald-100 text-emerald-700"];
                const c = insColors[i % insColors.length];
                return (
                  <div key={ins} className={`flex items-center gap-3 p-4 rounded-2xl border ${c}`}>
                    <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                      <ShieldCheck size={15} className="text-rose-500" />
                    </div>
                    <span className="text-sm font-bold truncate">{ins}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── DOCTORS ── */}
        {tab === "doctors" && (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Users size={17} className="text-white" />
              </div>
              <div>
                <h2 className="font-black text-white text-base">Our Doctors</h2>
                <p className="text-blue-100 text-[11px] font-medium">{doctors.length} specialist{doctors.length !== 1 ? "s" : ""} at {h.name.split(" ").slice(0, 2).join(" ")}</p>
              </div>
            </div>

            {doctors.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Users size={24} className="text-slate-300" />
                </div>
                <p className="font-bold text-slate-500">No doctor records available yet</p>
              </div>
            ) : (
              doctors.map(d => (
                <div key={d.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative shrink-0">
                      <div className="w-[60px] h-[60px] rounded-2xl overflow-hidden border-2 border-indigo-100 shadow-md">
                        <img
                          src={d.photo} alt={d.name}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=6366f1&color=fff&size=60`; }}
                        />
                      </div>
                      <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${d.available ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 text-sm">{d.name}</p>
                      <p className="text-xs text-indigo-600 font-bold">{d.specialization}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{d.qualification} · {d.experience} yrs exp</p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <Stars r={d.rating} />
                      <p className="text-sm font-black text-emerald-600">₹{d.consultationFee}</p>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full block ${d.available ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                        {d.available ? "Available" : "Busy"}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${d.phone}`}
                      className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 py-2 rounded-xl transition-all"
                    >
                      <Phone size={12} /> Call
                    </a>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 py-2 rounded-xl shadow-sm">
                      <Stethoscope size={12} /> Consult
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── REVIEWS ── */}
        {tab === "reviews" && (
          <>
            {showReview && (
              <ReviewModal entityType="hospital" entityId={h.id} entityName={h.name} onClose={() => setShowReview(false)} onDone={refreshReviews} />
            )}

            {reviews.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-black text-slate-800 flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center"><Star size={15} className="fill-amber-400 text-amber-400" /></div>
                  Rating Overview
                </h3>
                <div className="flex items-center gap-5">
                  <div className="text-center shrink-0">
                    <p className="text-5xl font-black text-slate-800 leading-none">
                      {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
                    </p>
                    <div className="flex justify-center gap-0.5 mt-2">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={13} className={i <= Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"} />
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 font-bold mt-1.5">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5,4,3,2,1].map(star => {
                      const count = reviews.filter(r => Math.round(r.rating) === star).length;
                      const max = Math.max(...[5,4,3,2,1].map(s => reviews.filter(r => Math.round(r.rating) === s).length), 1);
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-500 w-3 text-right shrink-0">{star}</span>
                          <Star size={9} className="fill-amber-400 text-amber-400 shrink-0" />
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-500" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 w-4 text-right shrink-0">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowReview(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 text-indigo-600 font-black text-sm hover:bg-indigo-50 transition-all"
            >
              <Star size={15} className="text-indigo-400" />
              Write a Review for {h.name.split(" ").slice(0, 2).join(" ")}
            </button>

            {reviews.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Star size={24} className="text-slate-300" />
                </div>
                <p className="font-bold text-slate-500">No reviews yet</p>
                <p className="text-sm text-slate-400 mt-0.5">Be the first to review {h.name}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(rv => (
                  <div key={rv.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white font-black text-base shrink-0 shadow-md">
                        {rv.author.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-black text-slate-800 text-sm">{rv.author}</p>
                            <div className="flex items-center gap-1 mt-1">
                              {[1,2,3,4,5].map(i => (
                                <Star key={i} size={11} className={i <= rv.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"} />
                              ))}
                              <span className="text-[10px] font-black text-amber-600 ml-0.5">{rv.rating}.0</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0 mt-0.5">{rv.date}</span>
                        </div>
                        {rv.text && (
                          <p className="text-sm text-slate-500 leading-relaxed mt-2 pt-2 border-t border-slate-50">{rv.text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── CONTACT ── */}
        {tab === "contact" && (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                <Phone size={17} className="text-white" />
              </div>
              <div>
                <h2 className="font-black text-white text-base">Contact & Directions</h2>
                <p className="text-slate-400 text-[11px] font-medium">Reach us or get directions</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-5 border-b border-slate-50">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <Phone size={17} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                  <p className="text-sm font-bold text-slate-700">{h.phone}</p>
                </div>
                <a
                  href={`tel:${h.phone}`}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all"
                >
                  <Phone size={12} /> Call Now
                </a>
              </div>

              <div className="flex items-start gap-4 p-5">
                <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={17} className="text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Address</p>
                  <p className="text-sm font-bold text-slate-700 leading-snug">{h.address}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Est. {h.established} · {h.type}</p>
                </div>
              </div>
            </div>

            <button
              onClick={openDir}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-400/30 text-sm"
            >
              <Navigation size={16} /> Open in Google Maps
            </button>

            {/* Quick stats summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Summary</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Beds Available",   value: String(h.beds),                     icon: "🛏️" },
                  { label: "Departments",       value: String(h.specializations.length),   icon: "🏥" },
                  { label: "Insurance Plans",   value: `${h.insurance.length} accepted`,   icon: "🛡️" },
                  { label: "Diagnostics",       value: h.diagnosticsAvailable ? "Yes" : "No", icon: "🔬" },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="flex items-center gap-2.5 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-lg">{icon}</span>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-bold text-slate-700">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function DoctorProfile({ d, onBack }: { d: DoctorFull; onBack: () => void }) {
  const [reviews, setReviews]   = useState<LocalReview[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [tab, setTab]           = useState<"about" | "reviews">("about");
  const refresh = () => setReviews(getLocalReviews("doctor", d.id));
  useEffect(() => { refresh(); }, [d.id]);

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : d.rating;
  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => Math.round(r.rating) === star).length,
  }));
  const maxDist = Math.max(...ratingDist.map(r => r.count), 1);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-28">
      {showReview && (
        <ReviewModal
          entityType="doctor" entityId={d.id} entityName={d.name}
          onClose={() => setShowReview(false)} onDone={refresh}
        />
      )}

      {/* ── Short decorative hero banner (nav only, no identity content) ── */}
      <div className="relative h-44 bg-gradient-to-br from-indigo-900 via-blue-800 to-violet-900 overflow-hidden shrink-0">
        {/* Decorative orbs */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-violet-500/25 blur-2xl pointer-events-none" />
        <div className="absolute top-6 left-1/3 w-24 h-24 rounded-full bg-indigo-400/15 blur-xl pointer-events-none" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        />
        {/* Nav bar */}
        <div className="relative z-10 flex items-center justify-between px-5 pt-5">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/20 text-sm font-bold transition-all shadow-md"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 backdrop-blur-sm">
            <Stethoscope size={12} className="text-indigo-200" />
            <span className="text-white/80 text-[11px] font-bold">Doctor Profile</span>
          </div>
          <a
            href={`tel:${d.phone}`}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/20 text-sm font-bold transition-all shadow-md"
          >
            <Phone size={14} /> Call
          </a>
        </div>
      </div>

      {/* ── Identity card — overlaps hero at top, white below ── */}
      <div className="max-w-2xl mx-auto px-4 -mt-12 relative z-20">
        <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-200/40 border border-slate-100 overflow-hidden">

          {/* Photo + name + meta */}
          <div className="flex flex-col items-center pt-4 pb-5 px-6">
            {/* Avatar with gradient ring */}
            <div className="relative mb-4">
              <div className="p-[3px] rounded-[22px] bg-gradient-to-br from-blue-400 via-indigo-500 to-violet-500 shadow-2xl shadow-indigo-400/35">
                <div className="w-24 h-24 rounded-[18px] overflow-hidden bg-white">
                  <img
                    src={d.photo} alt={d.name}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).src =
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=6366f1&color=fff&size=96`;
                    }}
                  />
                </div>
              </div>
              {/* Availability dot */}
              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-white shadow-md ${d.available ? "bg-emerald-500" : "bg-slate-400"}`} />
            </div>

            {/* Name */}
            <h1 className="text-[1.45rem] font-black text-slate-800 text-center leading-tight tracking-tight">
              {d.name}
            </h1>

            {/* Specialization pill */}
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3.5 py-1.5 mt-2.5">
              <Stethoscope size={12} className="text-indigo-500" />
              <span className="text-indigo-700 text-xs font-bold">{d.specialization}</span>
            </div>

            {/* Qualification */}
            <p className="text-slate-500 text-sm font-medium mt-2">{d.qualification}</p>

            {/* Hospital */}
            <p className="text-slate-400 text-xs mt-1 flex items-center gap-1 font-medium">
              <Building2 size={11} className="text-slate-400" />
              {d.hospital.split(" ").slice(0, 4).join(" ")}
            </p>

            {/* Star rating row */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} size={14} className={i <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"} />
                ))}
              </div>
              <span className="text-amber-600 font-black text-sm">{avgRating.toFixed(1)}</span>
              <span className="text-slate-400 text-xs font-medium">
                {reviews.length > 0 ? `(${reviews.length} review${reviews.length > 1 ? "s" : ""})` : "· Be first to review"}
              </span>
            </div>

            {/* Availability badge */}
            <div className={`mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border ${
              d.available
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}>
              <span className={`w-2 h-2 rounded-full ${d.available ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {d.available ? "Available for Consultation" : "Currently Busy"}
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
            {[
              { icon: <Briefcase size={16} className="text-indigo-500" />,              label: "Experience",  value: `${d.experience}`, unit: "yrs",  color: "text-indigo-700", bg: "bg-indigo-50"  },
              { icon: <Star size={16} className="fill-amber-400 text-amber-400" />,     label: "Rating",      value: avgRating.toFixed(1), unit: "/5", color: "text-amber-600", bg: "bg-amber-50"   },
              { icon: <Heart size={16} className="text-emerald-500" />,                 label: "Consult Fee", value: `₹${d.consultationFee}`, unit: "",color: "text-emerald-700", bg: "bg-emerald-50"},
            ].map(({ icon, label, value, unit, color, bg }) => (
              <div key={label} className="py-4 flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shadow-sm`}>{icon}</div>
                <p className={`text-lg font-black ${color} leading-none`}>
                  {value}<span className="text-[11px] font-bold opacity-60 ml-0.5">{unit}</span>
                </p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="max-w-2xl mx-auto px-4 mt-4 mb-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-1 flex gap-1 shadow-sm">
          {(["about", "reviews"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
                tab === t ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              {t === "about" ? "About" : `Reviews${reviews.length > 0 ? ` (${reviews.length})` : ""}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-2xl mx-auto px-4 space-y-3">

        {/* ───── ABOUT TAB ───── */}
        {tab === "about" && (
          <>
            {/* Bio */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <Stethoscope size={15} className="text-indigo-600" />
                </div>
                <h3 className="font-black text-slate-800">About {d.name.split(" ")[0]}</h3>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed px-5 py-4">
                {d.name} is a highly experienced{" "}
                <span className="font-semibold text-slate-700">{d.specialization}</span> specialist with over{" "}
                <span className="font-semibold text-slate-700">{d.experience} years</span> of clinical practice.
                Holding a <span className="font-semibold text-slate-700">{d.qualification}</span>, they are known
                for patient-first care and evidence-based treatment. Currently practicing at{" "}
                {d.hospital.split(" ").slice(0, 4).join(" ")}.
              </p>
            </div>

            {/* Professional details */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
                <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Award size={15} className="text-violet-600" />
                </div>
                <h3 className="font-black text-slate-800">Professional Details</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {[
                  { icon: <Award size={15} className="text-violet-500" />,    bg: "bg-violet-50",  label: "Qualification",  value: d.qualification,                        extra: null },
                  { icon: <Building2 size={15} className="text-blue-500" />,  bg: "bg-blue-50",    label: "Hospital",       value: d.hospital,                             extra: null },
                  { icon: <Briefcase size={15} className="text-amber-500" />, bg: "bg-amber-50",   label: "Experience",     value: `${d.experience} years of practice`,     extra: null },
                  { icon: <Globe size={15} className="text-emerald-500" />,   bg: "bg-emerald-50", label: "Languages",      value: d.languages.join(", "),                 extra: null },
                  { icon: <Phone size={15} className="text-indigo-500" />,    bg: "bg-indigo-50",  label: "Contact",        value: d.phone,
                    extra: (
                      <a href={`tel:${d.phone}`} className="shrink-0 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition-all">
                        Call
                      </a>
                    )
                  },
                  { icon: <Clock size={15} className="text-rose-400" />,      bg: "bg-rose-50",    label: "Availability",   value: d.available ? "Available for Consultation" : "Currently Busy",
                    extra: (
                      <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full border ${
                        d.available ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {d.available ? "● Active" : "● Busy"}
                      </span>
                    )
                  },
                ].map(({ icon, bg, label, value, extra }) => (
                  <div key={label} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-bold text-slate-700 truncate">{value}</p>
                    </div>
                    {extra}
                  </div>
                ))}
              </div>
            </div>

            {/* Languages chips */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Globe size={15} className="text-emerald-600" />
                </div>
                <h3 className="font-black text-slate-800">Languages Spoken</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {d.languages.map(lang => (
                  <span
                    key={lang}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-3 py-2 rounded-xl shadow-sm"
                  >
                    <Globe size={11} />{lang}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ───── REVIEWS TAB ───── */}
        {tab === "reviews" && (
          <>
            {/* Rating overview */}
            {reviews.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Star size={15} className="fill-amber-400 text-amber-400" />
                  </div>
                  <h3 className="font-black text-slate-800">Rating Overview</h3>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center shrink-0">
                    <p className="text-5xl font-black text-slate-800 leading-none">{avgRating.toFixed(1)}</p>
                    <div className="flex justify-center gap-0.5 mt-2">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={13} className={i <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"} />
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 font-bold mt-1.5">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {ratingDist.map(({ star, count }) => (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 w-3 text-right shrink-0">{star}</span>
                        <Star size={9} className="fill-amber-400 text-amber-400 shrink-0" />
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-500"
                            style={{ width: `${(count / maxDist) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 w-4 text-right shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Write review CTA */}
            <button
              onClick={() => setShowReview(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 text-indigo-600 font-black text-sm hover:bg-indigo-50 transition-all"
            >
              <Star size={15} className="text-indigo-400" />
              Write a Review for {d.name.split(" ").slice(0, 2).join(" ")}
            </button>

            {/* Reviews list */}
            {reviews.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Star size={24} className="text-slate-300" />
                </div>
                <p className="font-bold text-slate-600">No reviews yet</p>
                <p className="text-sm text-slate-400 mt-0.5">Be the first to share your experience</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(rv => (
                  <div key={rv.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white font-black text-base shrink-0 shadow-md">
                        {rv.author.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-black text-slate-800 text-sm leading-tight">{rv.author}</p>
                            <div className="flex items-center gap-1 mt-1">
                              {[1,2,3,4,5].map(i => (
                                <Star key={i} size={11} className={i <= rv.rating ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"} />
                              ))}
                              <span className="text-[10px] font-black text-amber-600 ml-0.5">{rv.rating}.0</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium shrink-0 mt-0.5">{rv.date}</span>
                        </div>
                        {rv.text && (
                          <p className="text-sm text-slate-500 leading-relaxed mt-2 pt-2 border-t border-slate-50">{rv.text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Sticky bottom CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-4 py-3 shadow-2xl">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="shrink-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Consult Fee</p>
            <p className="text-xl font-black text-indigo-700 leading-tight">₹{d.consultationFee}</p>
          </div>
          <div className="w-px h-10 bg-slate-100 shrink-0" />
          <a
            href={`tel:${d.phone}`}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] text-white font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-300/40 text-sm"
          >
            <Phone size={16} /> Book Consultation
          </a>
        </div>
      </div>
    </div>
  );
}

function CompareModal({ list, onClose, onRemove, onAdd }: {
  list: HospitalFull[]; onClose: () => void; onRemove: (id: number) => void; onAdd: (h: HospitalFull) => void;
}) {
  const [q, setQ] = useState("");
  const searchMatches = q.trim()
    ? HOSPITALS.filter(h => h.name.toLowerCase().includes(q.toLowerCase()) && !list.some(c => c.id === h.id)).slice(0, 5)
    : [];
  const rows = [
    { label:"Rating",          fn: (h: HospitalFull) => h.rating.toFixed(1),  highlight: true  },
    { label:"Beds",            fn: (h: HospitalFull) => String(h.beds),        highlight: true  },
    { label:"Distance",        fn: (h: HospitalFull) => `${h.distance.toFixed(1)} km`, highlight: false },
    { label:"Emergency",       fn: (h: HospitalFull) => h.emergency ? "✅" : "❌",     highlight: false },
    { label:"24/7 Open",       fn: (h: HospitalFull) => h.is24x7 ? "✅" : "❌",        highlight: false },
    { label:"Diagnostics",     fn: (h: HospitalFull) => h.diagnosticsAvailable ? "✅" : "❌", highlight: false },
    { label:"Pharmacy",        fn: (h: HospitalFull) => h.pharmacyAvailable ? "✅" : "❌",    highlight: false },
    { label:"Insurance Plans", fn: (h: HospitalFull) => `${h.insurance.length}`,        highlight: true  },
    { label:"Departments",     fn: (h: HospitalFull) => `${h.specializations.length}`,  highlight: true  },
    { label:"Established",     fn: (h: HospitalFull) => String(h.established),          highlight: false },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Scale size={18} className="text-indigo-600" />Hospital Comparison</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"><X size={16} /></button>
        </div>
        {/* Search to add */}
        {list.length < 3 && (
          <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-100 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={14} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search a hospital to add to comparison…"
                className="w-full pl-8 pr-4 py-2 text-sm bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-800" />
            </div>
            {searchMatches.length > 0 && (
              <div className="mt-2 bg-white rounded-xl border border-indigo-100 shadow-lg overflow-hidden">
                {searchMatches.map(h => (
                  <button key={h.id} onClick={() => { onAdd(h); setQ(""); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-indigo-50 text-left transition-colors border-b border-slate-50 last:border-0">
                    <img src={h.image} alt={h.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    <span className="text-sm font-bold text-slate-700 flex-1 truncate">{h.name}</span>
                    <span className="text-[10px] text-indigo-600 font-bold">{h.distance.toFixed(1)} km</span>
                    <span className="text-[10px] text-indigo-600 font-black bg-indigo-100 px-2 py-0.5 rounded-lg">+ Add</span>
                  </button>
                ))}
              </div>
            )}
            {!searchMatches.length && !q && <p className="text-[11px] text-indigo-500 mt-1.5 font-medium">You can compare up to 3 hospitals · {3 - list.length} slot{list.length === 2 ? "" : "s"} remaining</p>}
          </div>
        )}
        {/* Comparison table */}
        <div className="overflow-auto flex-1 p-6">
          {list.length < 2 ? (
            <div className="text-center py-12 text-slate-400">
              <Scale size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">Add at least 2 hospitals to compare</p>
              <p className="text-xs mt-1">Use the search above to add hospitals</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `140px repeat(${list.length}, 1fr)` }}>
                <div />
                {list.map(h => (
                  <div key={h.id} className="text-center">
                    <div className="relative inline-block">
                      <img src={h.image} alt={h.name} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-2 border-2 border-indigo-100 shadow-sm" />
                      <button onClick={() => onRemove(h.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow transition-all"><X size={9} /></button>
                    </div>
                    <p className="text-[11px] font-black text-slate-800 leading-tight">{h.name.split(" ").slice(0,3).join(" ")}</p>
                    <div className="flex justify-center mt-1"><Stars r={h.rating} /></div>
                  </div>
                ))}
              </div>
              <div className="space-y-0.5">
                {rows.map(({ label, fn, highlight }) => (
                  <div key={label} className="grid gap-4 py-2.5 border-b border-slate-50" style={{ gridTemplateColumns: `140px repeat(${list.length}, 1fr)` }}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider self-center">{label}</p>
                    {list.map(h => (
                      <p key={h.id} className={`text-sm font-bold text-center ${highlight ? "text-indigo-700" : "text-slate-600"}`}>{fn(h)}</p>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DoctorCompareModal({ list, onClose, onRemove, onAdd }: {
  list: DoctorFull[]; onClose: () => void; onRemove: (id: number) => void; onAdd: (d: DoctorFull) => void;
}) {
  const [q, setQ] = useState("");
  const searchMatches = q.trim()
    ? DOCTORS.filter(d => d.name.toLowerCase().includes(q.toLowerCase()) && !list.some(c => c.id === d.id)).slice(0, 5)
    : [];
  const rows = [
    { label: "Rating",         fn: (d: DoctorFull) => d.rating.toFixed(1) },
    { label: "Experience",     fn: (d: DoctorFull) => `${d.experience} yrs` },
    { label: "Fee",            fn: (d: DoctorFull) => `₹${d.consultationFee}` },
    { label: "Specialization", fn: (d: DoctorFull) => d.specialization },
    { label: "Qualification",  fn: (d: DoctorFull) => d.qualification },
    { label: "Hospital",       fn: (d: DoctorFull) => d.hospital.split(" ").slice(0,3).join(" ") },
    { label: "Available",      fn: (d: DoctorFull) => d.available ? "✅ Yes" : "❌ No" },
    { label: "Languages",      fn: (d: DoctorFull) => d.languages.join(", ") },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Scale size={18} className="text-emerald-600" />Doctor Comparison</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"><X size={16} /></button>
        </div>
        {list.length < 3 && (
          <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={14} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search a doctor to add to comparison…"
                className="w-full pl-8 pr-4 py-2 text-sm bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-800" />
            </div>
            {searchMatches.length > 0 && (
              <div className="mt-2 bg-white rounded-xl border border-emerald-100 shadow-lg overflow-hidden">
                {searchMatches.map(d => (
                  <button key={d.id} onClick={() => { onAdd(d); setQ(""); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-emerald-50 text-left transition-colors border-b border-slate-50 last:border-0">
                    <img src={d.photo} alt={d.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-indigo-100"
                      onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=6366f1&color=fff&size=32`; }} />
                    <span className="text-sm font-bold text-slate-700 flex-1 truncate">{d.name}</span>
                    <span className="text-[10px] text-emerald-600 font-bold">{d.specialization}</span>
                    <span className="text-[10px] text-emerald-700 font-black bg-emerald-100 px-2 py-0.5 rounded-lg">+ Add</span>
                  </button>
                ))}
              </div>
            )}
            {!searchMatches.length && !q && <p className="text-[11px] text-emerald-600 mt-1.5 font-medium">{3 - list.length} slot{list.length === 2 ? "" : "s"} remaining · compare up to 3 doctors</p>}
          </div>
        )}
        <div className="overflow-auto flex-1 p-6">
          {list.length < 2 ? (
            <div className="text-center py-12 text-slate-400">
              <Scale size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">Add at least 2 doctors to compare</p>
              <p className="text-xs mt-1">Use the search above</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: `140px repeat(${list.length}, 1fr)` }}>
                <div />
                {list.map(d => (
                  <div key={d.id} className="text-center">
                    <div className="relative inline-block">
                      <img src={d.photo} alt={d.name} className="w-14 h-14 rounded-full object-cover mx-auto mb-2 border-2 border-indigo-200 shadow"
                        onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=6366f1&color=fff&size=56`; }} />
                      <button onClick={() => onRemove(d.id)} className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow"><X size={9} /></button>
                    </div>
                    <p className="text-[11px] font-black text-slate-800 leading-tight">{d.name}</p>
                    <div className="flex justify-center mt-1"><Stars r={d.rating} /></div>
                  </div>
                ))}
              </div>
              <div className="space-y-0.5">
                {rows.map(({ label, fn }) => (
                  <div key={label} className="grid gap-4 py-2.5 border-b border-slate-50" style={{ gridTemplateColumns: `140px repeat(${list.length}, 1fr)` }}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider self-center">{label}</p>
                    {list.map(d => <p key={d.id} className="text-sm font-bold text-slate-700 text-center truncate">{fn(d)}</p>)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterPanel({ filters, onChange, onClose, category }: {
  filters: any; onChange: (f: any) => void; onClose: () => void; category: string;
}) {
  const [local, setLocal] = useState({ ...filters });
  const specs = Array.from(new Set(HOSPITALS.flatMap(h => h.specializations))).sort();
  const toggle = (key: string) => setLocal((p: any) => ({ ...p, [key]: !p[key] }));
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-80 bg-white h-full shadow-2xl flex flex-col overflow-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-black text-slate-800 flex items-center gap-2"><SlidersHorizontal size={18} className="text-indigo-600" />Filters</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="flex-1 p-5 space-y-6">
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Max Distance</p>
            <div className="flex gap-2 flex-wrap">
              {[1,2,5,10,20].map(km => (
                <button key={km} onClick={() => setLocal((p: any) => ({ ...p, maxDistance: km }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${local.maxDistance === km ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
                  {km} km
                </button>
              ))}
            </div>
          </div>
          {category === "hospitals" && (
            <>
              {[
                { key:"emergency", label:"Emergency Available" },
                { key:"is24x7",   label:"Open 24 Hours" },
                { key:"diagnostics", label:"Diagnostics Available" },
                { key:"pharmacy",    label:"In-house Pharmacy" },
                { key:"openNow",     label:"Open Now" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => toggle(key)} className={`w-11 h-6 rounded-full relative transition-all ${local[key] ? "bg-indigo-600" : "bg-slate-200"}`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${local[key] ? "left-6" : "left-1"}`} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{label}</span>
                </label>
              ))}
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Specialization</p>
                <select value={local.specialization} onChange={e => setLocal((p: any) => ({ ...p, specialization: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">All Specializations</option>
                  {specs.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </>
          )}
          {category === "labs" && (
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => toggle("homeCollection")} className={`w-11 h-6 rounded-full relative transition-all ${local.homeCollection ? "bg-indigo-600" : "bg-slate-200"}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${local.homeCollection ? "left-6" : "left-1"}`} />
              </div>
              <span className="text-sm font-bold text-slate-700">Home Collection Only</span>
            </label>
          )}
          {category === "pharmacies" && (
            <>
              {[{ key:"delivery", label:"Home Delivery" },{ key:"open247", label:"24/7 Only" }].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => toggle(key)} className={`w-11 h-6 rounded-full relative transition-all ${local[key] ? "bg-indigo-600" : "bg-slate-200"}`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${local[key] ? "left-6" : "left-1"}`} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{label}</span>
                </label>
              ))}
            </>
          )}
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={() => setLocal({ maxDistance:20, emergency:false, is24x7:false, diagnostics:false, pharmacy:false, openNow:false, specialization:"", homeCollection:false, delivery:false, open247:false })}
            className="flex-1 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">Reset</button>
          <button onClick={() => { onChange(local); onClose(); }}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all">Apply</button>
        </div>
      </div>
    </div>
  );
}

export default function Map() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<HospitalFull | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorFull | null>(null);
  const [compareList, setCompareList] = useState<HospitalFull[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [doctorCompareList, setDoctorCompareList] = useState<DoctorFull[]>([]);
  const [showDoctorCompare, setShowDoctorCompare] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"list"|"map">("list");
  const [sortBy, setSortBy] = useState("distance");
  const [specFilter, setSpecFilter] = useState("");
  const [filters, setFilters] = useState({ maxDistance:20, emergency:false, is24x7:false, diagnostics:false, pharmacy:false, openNow:false, specialization:"", homeCollection:false, delivery:false, open247:false });
  const [packageQuery, setPackageQuery] = useState("");
  const [packageSort, setPackageSort] = useState<"discount"|"price_asc"|"price_desc"|"name">("discount");
  const [packageCatFilter, setPackageCatFilter] = useState("");
  const [packageHomeOnly, setPackageHomeOnly] = useState(false);
  const [packageViewMode, setPackageViewMode] = useState<"list"|"map">("list");
  const [requestedPkg, setRequestedPkg] = useState<number | null>(null);
  const [requestNotice, setRequestNotice] = useState("");

  const [position, setPosition] = useState<[number, number] | null>(null);
  const [gpsHospitals, setGpsHospitals] = useState<GpsHospital[]>([]);
  const [hoveredPos, setHoveredPos] = useState<[number, number] | null>(null);
  const [selectedRange, setSelectedRange] = useState(5);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | number | null>(null);
  const [notice, setNotice] = useState("");
  const gpsMarkerRefs = useRef<Record<string | number, L.Marker>>({});
  const dummyMarkerRefs = useRef<Record<number, L.Marker>>({});
  const labMarkerRefs = useRef<Record<number, L.Marker>>({});
  const pharmMarkerRefs = useRef<Record<number, L.Marker>>({});
  const docHospMarkerRefs = useRef<Record<number, L.Marker>>({});
  const navigate = useNavigate();

  useEffect(() => {
    setViewMode("list"); setSortBy("distance");
    setPackageQuery(""); setPackageCatFilter(""); setPackageHomeOnly(false); setPackageViewMode("list"); setRequestNotice("");
  }, [activeCategory]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setPosition([15.3647, 75.124])
    );
  }, []);

  const fetchGpsHospitals = async () => {
    if (!position) return;
    setGpsLoading(true);
    const [lat, lon] = position;
    try {
      const res = await api.get("/hospital/geoapify/search", { params: { lat, lon, radius: selectedRange * 1000, limit: 50 } });
      const places: any[] = res.data?.data || [];
      setGpsHospitals(places.map((p, i): GpsHospital => ({
        id: p.placeId || i, placeId: p.placeId, lat: Number(p.lat), lon: Number(p.lon),
        name: p.name, address: p.address,
        distance: haversine(lat, lon, Number(p.lat), Number(p.lon)),
      })).sort((a, b) => a.distance - b.distance));
      setNotice("Live hospital data loaded from GPS.");
    } catch {
      const vb = `${lon - 0.15},${lat + 0.15},${lon + 0.15},${lat - 0.15}`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=hospital&limit=50&viewbox=${vb}&bounded=1`, { headers: { "User-Agent": "MediRaksha/1.0" } });
      const data = await res.json();
      setGpsHospitals(data.map((p: any, i: number): GpsHospital => ({
        id: p.place_id ?? i, lat: parseFloat(p.lat), lon: parseFloat(p.lon),
        name: p.display_name, address: p.display_name,
        distance: haversine(lat, lon, parseFloat(p.lat), parseFloat(p.lon)),
      })).sort((a: GpsHospital, b: GpsHospital) => a.distance - b.distance));
      setNotice("Using OpenStreetMap fallback.");
    }
    setGpsLoading(false);
  };

  const requestBed = async (h: GpsHospital) => {
    setBookingId(h.id); setNotice("");
    try {
      const res = await api.post("/hospital/geoapify/bed-bookings", { bedsRequested: 1, hospitalPlaceId: (h as any).placeId || String(h.id), hospitalName: h.name.split(",")[0], notes: h.address });
      if (res.data?.success) setNotice(`Bed request sent for ${h.name.split(",")[0]}.`);
    } catch (err: any) {
      if (err.response?.status === 401) { navigate("/auth"); return; }
      setNotice(err.response?.data?.message || "Could not create bed request.");
    } finally { setBookingId(null); }
  };

  const openDirections = (lat: number, lon: number, name: string) => {
    const base = position ? `&origin=${position[0]},${position[1]}` : "";
    window.open(`https://www.google.com/maps/dir/?api=1${base}&destination=${lat},${lon}&travelmode=driving`, "_blank");
  };

  const toggleCompare = (h: HospitalFull) =>
    setCompareList(prev => prev.some(c => c.id === h.id) ? prev.filter(c => c.id !== h.id) : prev.length < 3 ? [...prev, h] : prev);

  const toggleDoctorCompare = (d: DoctorFull) =>
    setDoctorCompareList(prev => prev.some(c => c.id === d.id) ? prev.filter(c => c.id !== d.id) : prev.length < 3 ? [...prev, d] : prev);

  const filteredHospitals = useMemo(() => {
    let items = HOSPITALS.filter(h => {
      if (filters.maxDistance && h.distance > filters.maxDistance) return false;
      if (filters.emergency && !h.emergency) return false;
      if (filters.is24x7 && !h.is24x7) return false;
      if (filters.diagnostics && !h.diagnosticsAvailable) return false;
      if (filters.pharmacy && !h.pharmacyAvailable) return false;
      if (filters.openNow && !h.isOpen) return false;
      if (filters.specialization && !h.specializations.includes(filters.specialization)) return false;
      if (searchQuery && activeCategory === "hospitals") {
        const q = searchQuery.toLowerCase();
        return h.name.toLowerCase().includes(q) || h.specializations.some(s => s.toLowerCase().includes(q)) || h.address.toLowerCase().includes(q);
      }
      return true;
    });
    return sortItems(items, sortBy);
  }, [filters, searchQuery, activeCategory, sortBy]);

  const filteredLabs = useMemo(() => {
    let items = LABS.filter(l => {
      if (filters.homeCollection && !l.homeCollection) return false;
      if (filters.maxDistance && l.distance > filters.maxDistance) return false;
      if (searchQuery && activeCategory === "labs") {
        const q = searchQuery.toLowerCase();
        return l.name.toLowerCase().includes(q) || l.tests.some(t => t.toLowerCase().includes(q));
      }
      return true;
    });
    return sortItems(items, sortBy);
  }, [filters, searchQuery, activeCategory, sortBy]);

  const filteredPharmacies = useMemo(() => {
    let items = PHARMACIES.filter(p => {
      if (filters.delivery && !p.delivery) return false;
      if (filters.open247 && !p.is24x7) return false;
      if (filters.maxDistance && p.distance > filters.maxDistance) return false;
      if (searchQuery && activeCategory === "pharmacies") {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
      }
      return true;
    });
    return sortItems(items, sortBy);
  }, [filters, searchQuery, activeCategory, sortBy]);

  const filteredDoctors = useMemo(() => {
    let items = DOCTORS.filter(d => {
      if (specFilter && d.specialization !== specFilter) return false;
      if (searchQuery && activeCategory === "doctors") {
        const q = searchQuery.toLowerCase();
        return d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q) || d.hospital.toLowerCase().includes(q);
      }
      return true;
    });
    return items.sort((a, b) => sortBy === "rating" ? b.rating - a.rating : sortBy === "name" ? a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
  }, [specFilter, searchQuery, activeCategory, sortBy]);

  const doctorHospitals = useMemo(() => {
    const ids = new Set(filteredDoctors.map(d => d.hospitalId));
    return HOSPITALS.filter(h => ids.has(h.id));
  }, [filteredDoctors]);

  const filteredPackages = useMemo(() => {
    let items = PACKAGES.filter(pk => {
      if (packageHomeOnly && !pk.homeCollection) return false;
      if (packageCatFilter && pk.category !== packageCatFilter) return false;
      if (packageQuery.trim()) {
        const q = packageQuery.toLowerCase();
        return pk.name.toLowerCase().includes(q) ||
          pk.tests.some(t => t.toLowerCase().includes(q)) ||
          pk.description.toLowerCase().includes(q) ||
          pk.provider.toLowerCase().includes(q);
      }
      return true;
    });
    return items.sort((a, b) =>
      packageSort === "price_asc"  ? a.price - b.price :
      packageSort === "price_desc" ? b.price - a.price :
      packageSort === "discount"   ? (b.originalPrice - b.price) - (a.originalPrice - a.price) :
      a.name.localeCompare(b.name)
    );
  }, [packageQuery, packageSort, packageCatFilter, packageHomeOnly]);

  const requestPackage = (pkId: number) => {
    setRequestedPkg(pkId);
    setRequestNotice("Request sent! A healthcare coordinator will contact you shortly.");
    setTimeout(() => { setRequestedPkg(null); setRequestNotice(""); }, 3500);
  };

  const searchResults = useMemo(() => {
    if (!searchQuery) return null;
    const q = searchQuery.toLowerCase();
    return {
      hospitals: HOSPITALS.filter(h => h.name.toLowerCase().includes(q) || h.specializations.some(s => s.toLowerCase().includes(q))).slice(0, 5),
      doctors: DOCTORS.filter(d => d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q)).slice(0, 5),
      labs: LABS.filter(l => l.name.toLowerCase().includes(q) || l.tests.some(t => t.toLowerCase().includes(q))).slice(0, 3),
      pharmacies: PHARMACIES.filter(p => p.name.toLowerCase().includes(q)).slice(0, 3),
      packages: PACKAGES.filter(pk => pk.name.toLowerCase().includes(q) || pk.tests.some(t => t.toLowerCase().includes(q))).slice(0, 3),
    };
  }, [searchQuery]);

  if (selectedHospital) return <HospitalDetail h={selectedHospital} onBack={() => setSelectedHospital(null)} />;
  if (selectedDoctor) return <DoctorProfile d={selectedDoctor} onBack={() => setSelectedDoctor(null)} />;

  const categories = [
    { id:"hospitals",  emoji:"🏥", label:"Hospitals",           count:`${HOSPITALS.length} Centres`,    color:"indigo" },
    { id:"doctors",    emoji:"👨‍⚕️", label:"Doctors",             count:`${DOCTORS.length}+ Specialists`, color:"emerald" },
    { id:"labs",       emoji:"🧪", label:"Labs & Diagnostics",  count:`${LABS.length} Centres`,         color:"violet" },
    { id:"pharmacies", emoji:"💊", label:"Pharmacies",           count:`${PHARMACIES.length} Stores`,    color:"rose" },
    { id:"packages",   emoji:"📦", label:"Health Packages",      count:`${PACKAGES.length} Packages`,    color:"amber" },
  ];
  const catBorder: Record<string,string> = {
    indigo:"border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600",
    emerald:"border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600",
    violet:"border-violet-200 hover:bg-violet-600 hover:text-white hover:border-violet-600",
    rose:"border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600",
    amber:"border-amber-200 hover:bg-amber-600 hover:text-white hover:border-amber-600",
  };
  const allSpecs = Array.from(new Set(DOCTORS.map(d => d.specialization))).sort();
  const mapCenter: [number, number] = position || [15.3647, 75.124];

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans overflow-hidden">

      <header className="bg-white border-b border-slate-100 z-30 shadow-sm shrink-0">
        {activeCategory ? (
          /* Category page — single compact row */
          <div className="px-4 md:px-6 py-2.5 flex items-center gap-2.5">
            <button onClick={() => { setActiveCategory(null); setSearchQuery(""); }}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all shrink-0">
              <ArrowLeft size={17} />
            </button>
            <span className="text-sm font-black text-slate-700 shrink-0">
              {activeCategory === "hospitals" ? "🏥 Hospitals" : activeCategory === "doctors" ? "👨‍⚕️ Doctors" : activeCategory === "labs" ? "🧪 Labs" : activeCategory === "pharmacies" ? "💊 Pharmacies" : "📦 Packages"}
            </span>
            <div className="flex-1 min-w-0 mx-1">
              <div className="flex items-center bg-slate-50 border border-slate-200 hover:border-indigo-300 focus-within:border-indigo-500 focus-within:bg-white rounded-full transition-all overflow-hidden">
                <Search className="ml-3 text-slate-400 shrink-0" size={14} />
                <input type="text"
                  placeholder={`Search ${activeCategory}…`}
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 py-2 px-2.5 text-slate-800 text-sm bg-transparent focus:outline-none placeholder:text-slate-400" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}
                    className="mr-2.5 w-5 h-5 rounded-full bg-slate-200 hover:bg-rose-100 hover:text-rose-500 flex items-center justify-center text-slate-500 transition-all">
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
            {activeCategory !== "packages" && activeCategory !== "doctors" && (
              <button onClick={() => setShowFilters(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-all shrink-0">
                <Filter size={13} />Filters
              </button>
            )}
          </div>
        ) : (
          /* Home page — two-row: branding + search */
          <div>
            <div className="px-4 md:px-6 pt-3 pb-2 flex items-center gap-3">
              <Link to="/"
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all shrink-0">
                <ArrowLeft size={17} />
              </Link>
              <div className="flex items-center gap-2.5 flex-1">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md shrink-0">
                  <LocateFixed size={14} className="text-white" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-black text-slate-800">MediConnect</span>
                  <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">Near You</span>
                </div>
              </div>
            </div>
            <div className="px-4 md:px-6 pb-3">
              <div className="flex items-center bg-slate-50 border-2 border-slate-200 hover:border-indigo-300 focus-within:border-indigo-500 focus-within:bg-white rounded-2xl transition-all shadow-sm overflow-hidden">
                <Search className="ml-4 text-slate-400 shrink-0" size={16} />
                <input type="text"
                  placeholder="Hospitals, doctors, labs, pharmacies near you…"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 py-3 px-3 text-slate-800 text-sm bg-transparent focus:outline-none placeholder:text-slate-400" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}
                    className="mr-3 w-5 h-5 rounded-full bg-slate-200 hover:bg-rose-100 hover:text-rose-500 flex items-center justify-center text-slate-500 transition-all">
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-auto">

        {searchQuery && searchResults && (
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {(Object.entries(searchResults) as [string, any[]][]).map(([key, items]) => items.length > 0 && (
              <div key={key}>
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                  {key === "hospitals" ? "🏥 Hospitals" : key === "doctors" ? "👨‍⚕️ Doctors" : key === "labs" ? "🧪 Labs" : key === "pharmacies" ? "💊 Pharmacies" : "📦 Health Packages"}
                </h2>
                <div className="space-y-2">
                  {key === "hospitals" && (items as HospitalFull[]).map(h => (
                    <div key={h.id} onClick={() => setSelectedHospital(h)} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm hover:shadow-md cursor-pointer transition-all">
                      <img src={h.image} alt={h.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm">{h.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-indigo-600 font-bold">{h.distance.toFixed(1)} km</span>
                          <Stars r={h.rating} />
                          {h.emergency && <Chip label="Emergency" color="rose" />}
                          {h.is24x7 && <Chip label="24/7" color="emerald" />}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 shrink-0" />
                    </div>
                  ))}
                  {key === "doctors" && (items as DoctorFull[]).map(d => (
                    <div key={d.id} onClick={() => setSelectedDoctor(d)} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm hover:shadow-md cursor-pointer transition-all">
                      <img src={d.photo} alt={d.name} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100 shrink-0" onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=6366f1&color=fff`; }} />
                      <div className="flex-1 min-w-0"><p className="font-bold text-slate-800 text-sm">{d.name}</p><p className="text-xs text-indigo-600 font-semibold">{d.specialization}</p><p className="text-[11px] text-slate-400 truncate">{d.hospital}</p></div>
                      <div className="shrink-0 text-right"><Stars r={d.rating} /><p className="text-xs font-bold text-emerald-600 mt-1">₹{d.consultationFee}</p></div>
                    </div>
                  ))}
                  {key === "labs" && (items as LabCenter[]).map(l => (
                    <div key={l.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0"><FlaskConical className="text-violet-600" size={18} /></div>
                      <div className="flex-1 min-w-0"><p className="font-bold text-slate-800 text-sm">{l.name}</p><p className="text-[11px] text-slate-400">{l.distance.toFixed(1)} km · ₹{l.startingPrice}+</p></div>
                      {l.homeCollection && <Chip label="Home" color="violet" />}
                    </div>
                  ))}
                  {key === "pharmacies" && (items as PharmacyStore[]).map(p => (
                    <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0"><Pill className="text-rose-500" size={18} /></div>
                      <div className="flex-1 min-w-0"><p className="font-bold text-slate-800 text-sm">{p.name}</p><p className="text-[11px] text-slate-400">{p.distance.toFixed(1)} km</p></div>
                      <div className="flex gap-1">{p.is24x7 && <Chip label="24/7" color="emerald" />}{p.delivery && <Chip label="Delivery" color="indigo" />}</div>
                    </div>
                  ))}
                  {key === "packages" && (items as typeof PACKAGES).map(pk => (
                    <div key={pk.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0"><Package className="text-amber-600" size={18} /></div>
                      <div className="flex-1 min-w-0"><p className="font-bold text-slate-800 text-sm">{pk.name}</p><p className="text-[11px] text-slate-400">{pk.provider} · {pk.testsCount} tests</p></div>
                      <div className="text-right shrink-0"><p className="text-sm font-black text-indigo-700">₹{pk.price}</p><p className="text-[10px] line-through text-slate-400">₹{pk.originalPrice}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!searchQuery && !activeCategory && (
          <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

            {/* Category grid — gradient cards */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">What are you looking for?</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {categories.map(cat => {
                  const grad: Record<string,string> = {
                    indigo:  "from-indigo-500  to-indigo-700",
                    emerald: "from-emerald-500 to-emerald-700",
                    violet:  "from-violet-500  to-violet-700",
                    rose:    "from-rose-500    to-rose-700",
                    amber:   "from-amber-500   to-amber-600",
                  };
                  return (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                      className={`group flex flex-col items-center justify-center gap-2.5 py-6 px-4 rounded-2xl bg-gradient-to-br ${grad[cat.color]} text-white transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-md`}>
                      <span className="text-3xl drop-shadow">{cat.emoji}</span>
                      <span className="font-black text-sm text-center leading-tight">{cat.label}</span>
                      <span className="text-[10px] opacity-70 font-bold bg-white/15 px-2 py-0.5 rounded-full">{cat.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Top Rated Hospitals */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Top Rated Hospitals</h3>
                <button onClick={() => setActiveCategory("hospitals")} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">View all <ChevronRight size={12} /></button>
              </div>
              <div className="flex gap-5 overflow-x-auto pb-3 hide-scrollbar">
                {HOSPITALS.filter(h => h.rating >= 4.7).slice(0, 6).map(h => (
                  <div key={h.id} className="shrink-0 w-72">
                    <HospitalCard h={h} onSelect={setSelectedHospital} onDirections={openDirections} compareList={compareList} onToggleCompare={toggleCompare} />
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Specialists */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Featured Specialists</h3>
                <button onClick={() => setActiveCategory("doctors")} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">View all <ChevronRight size={12} /></button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                {DOCTORS.filter(d => d.rating >= 4.7).slice(0, 8).map(d => (
                  <div key={d.id} onClick={() => setSelectedDoctor(d)}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col items-center shrink-0 w-36 overflow-hidden">
                    <div className="w-full bg-gradient-to-br from-indigo-500 to-violet-600 relative overflow-hidden flex flex-col items-center px-3 pt-5 pb-3">
                      <div className="absolute -right-3 -top-3 w-14 h-14 rounded-full bg-white/10" />
                      <img src={d.photo} alt={d.name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-lg relative z-10"
                        onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=6366f1&color=fff`; }} />
                      <span className={`mt-1.5 text-[8px] font-black px-2 py-0.5 rounded-full ${d.available ? "bg-emerald-400 text-white" : "bg-white/20 text-white"}`}>{d.available ? "Available" : "Busy"}</span>
                    </div>
                    <div className="px-3 pb-4 pt-2 text-center">
                      <p className="text-xs font-black text-slate-800 leading-tight">{d.name}</p>
                      <p className="text-[10px] text-indigo-600 font-bold mt-0.5">{d.specialization}</p>
                      <div className="mt-1.5"><Stars r={d.rating} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!searchQuery && activeCategory === "hospitals" && (
          <div className="flex flex-col h-full">
            <SortViewBar count={filteredHospitals.length} label="hospitals" sortBy={sortBy} onSort={setSortBy} viewMode={viewMode} onView={setViewMode} showRange={viewMode === "map"} selectedRange={selectedRange} onRangeChange={setSelectedRange} />
            {viewMode === "list" && (
              <div className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredHospitals.map(h => (
                    <HospitalCard key={h.id} h={h} onSelect={setSelectedHospital} onDirections={openDirections} compareList={compareList} onToggleCompare={toggleCompare} />
                  ))}
                  {filteredHospitals.length === 0 && (
                    <div className="col-span-3 text-center py-20"><Building2 size={40} className="mx-auto mb-3 text-slate-200" /><p className="font-bold text-slate-400">No hospitals match the current filters.</p></div>
                  )}
                </div>
              </div>
            )}
            {viewMode === "map" && (
              <div className="flex flex-1 overflow-hidden">
                <aside className="w-80 bg-white border-r border-slate-100 flex flex-col shadow-xl shrink-0 z-10">
                  {/* Sidebar header */}
                  <div className="px-4 py-4 bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-700 flex items-center justify-between shrink-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black text-sm flex items-center gap-2">
                        <Building2 size={14} className="shrink-0" />
                        Nearby Hospitals
                        <span className="text-[9px] bg-white/25 text-white px-1.5 py-0.5 rounded-full font-bold">{filteredHospitals.length}</span>
                      </p>
                      <p className="text-indigo-200 text-[10px] font-medium mt-0.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        {gpsHospitals.length > 0
                          ? `${gpsHospitals.filter(h => h.distance <= selectedRange).length} GPS · ${selectedRange} km radius`
                          : "Tap Scan for live GPS results"}
                      </p>
                    </div>
                    <button onClick={fetchGpsHospitals} disabled={!position || gpsLoading}
                      className="ml-3 flex items-center gap-1.5 bg-white/15 hover:bg-white/30 border border-white/25 text-white py-2 px-3 rounded-xl text-[11px] font-black disabled:opacity-50 transition-all shrink-0">
                      {gpsLoading
                        ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <LocateFixed size={12} />}
                      {gpsLoading ? "Scanning…" : "Scan"}
                    </button>
                  </div>
                  {notice && (
                    <div className="text-[10px] text-indigo-700 px-3 py-2 bg-indigo-50 border-b border-indigo-100 font-semibold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />{notice}
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto">
                    {filteredHospitals.length > 0 && (
                      <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listed Hospitals</span>
                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{filteredHospitals.length}</span>
                      </div>
                    )}
                    {filteredHospitals.map((h, idx) => (
                      <div key={h.id}
                        onMouseEnter={() => { setHoveredPos([h.lat, h.lon]); dummyMarkerRefs.current[h.id]?.openPopup(); }}
                        onClick={() => setSelectedHospital(h)}
                        className="px-3 py-3 border-b border-slate-50 hover:bg-indigo-50/50 cursor-pointer transition-all group">
                        <div className="flex gap-3">
                          {/* Thumbnail with status bar at bottom */}
                          <div className="relative w-[52px] h-[52px] rounded-xl overflow-hidden shrink-0 border-2 border-slate-100 shadow-sm">
                            <img src={h.image} alt={h.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            <div className={`absolute bottom-0 left-0 right-0 h-1 ${h.isOpen ? "bg-emerald-400" : "bg-slate-300"}`} />
                            <span className="absolute top-1 left-1 text-[9px] font-black text-white bg-black/40 rounded px-0.5 leading-none py-0.5">{idx + 1}</span>
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <p className="font-bold text-slate-800 text-[11px] leading-tight group-hover:text-indigo-700 transition-colors line-clamp-2 flex-1">{h.name}</p>
                              <Stars r={h.rating} />
                            </div>
                            <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                              <span className="flex items-center gap-0.5 text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                                <Navigation size={7} />{h.distance.toFixed(1)} km
                              </span>
                              <span className={`flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${h.isOpen ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                                <span className={`w-1 h-1 rounded-full shrink-0 ${h.isOpen ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                                {h.isOpen ? "Open" : "Closed"}
                              </span>
                              {h.emergency && (
                                <span className="flex items-center gap-0.5 text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full">
                                  <Zap size={7} />Emg
                                </span>
                              )}
                              {h.is24x7 && (
                                <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">24/7</span>
                              )}
                            </div>
                            {h.specializations.length > 0 && (
                              <p className="text-[9px] text-slate-400 font-medium truncate mb-1.5">{h.specializations.slice(0, 2).join(" · ")}</p>
                            )}
                            <div className="flex gap-1.5">
                              <a href={`tel:${h.phone}`} onClick={e => e.stopPropagation()}
                                className="flex items-center gap-0.5 text-[10px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-all">
                                <Phone size={9} />Call
                              </a>
                              <button onClick={e => { e.stopPropagation(); openDirections(h.lat, h.lon, h.name); }}
                                className="flex items-center gap-0.5 text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-all">
                                <Navigation size={9} />Go
                              </button>
                              <button onClick={e => { e.stopPropagation(); setSelectedHospital(h); }}
                                className="flex items-center gap-0.5 text-[10px] font-black text-indigo-500 hover:text-indigo-700 ml-auto transition-all">
                                Details <ChevronRight size={9} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {gpsHospitals.length > 0 && (
                      <>
                        <div className="flex items-center justify-between px-3.5 pt-3 pb-1 bg-emerald-50/50 border-t border-emerald-100 mt-1">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                            <LocateFixed size={9} />GPS Results
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{gpsHospitals.filter(h => h.distance <= selectedRange).length}</span>
                        </div>
                        {gpsHospitals.filter(h => h.distance <= selectedRange).map(h => (
                          <div key={h.id}
                            onMouseEnter={() => { setHoveredPos([h.lat, h.lon]); gpsMarkerRefs.current[h.id]?.openPopup(); }}
                            className="px-3 py-2.5 border-b border-slate-50 hover:bg-emerald-50/60 cursor-pointer transition-colors">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center shrink-0 text-base shadow-sm border border-emerald-200">🏥</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-[11px] leading-tight truncate">{h.name.split(",")[0]}</p>
                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                                  <Navigation size={8} />{h.distance.toFixed(2)} km · GPS
                                </span>
                              </div>
                              <button onClick={e => { e.stopPropagation(); requestBed(h); }} disabled={bookingId === h.id}
                                className="flex items-center gap-0.5 text-[9px] font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-600 hover:text-white px-2 py-1.5 rounded-lg disabled:opacity-50 transition-all shrink-0">
                                <BedDouble size={9} />{bookingId === h.id ? "…" : "Bed"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </aside>
                <div className="flex-1 relative">
                  <MapContainer center={mapCenter} zoom={14} className="h-full w-full z-10">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors" />
                    {position && <Marker position={position} icon={userIcon}><Popup>📍 You are here</Popup></Marker>}
                    {filteredHospitals.map(h => (
                      <Marker key={h.id} position={[h.lat, h.lon]} icon={hospitalMapIcon} ref={r => { if (r) dummyMarkerRefs.current[h.id] = r; }}>
                        <Popup>
                          <div className="p-1 min-w-40">
                            <p className="font-black text-slate-800 text-xs">{h.name}</p>
                            <div className="flex items-center gap-2 mt-1 mb-2">
                              <span className="text-[10px] text-indigo-600 font-bold">{h.distance.toFixed(1)} km</span>
                              <Stars r={h.rating} />
                              {h.isOpen ? <span className="text-[9px] text-emerald-600 font-black">Open</span> : <span className="text-[9px] text-slate-400 font-black">Closed</span>}
                            </div>
                            <div className="flex gap-1 mb-2 flex-wrap">
                              {h.emergency && <Chip label="🚨 Emg" color="rose" />}
                              {h.is24x7 && <Chip label="24/7" color="emerald" />}
                            </div>
                            <button onClick={() => setSelectedHospital(h)} className="w-full bg-indigo-600 text-white py-1.5 rounded-lg text-[11px] font-bold mb-1">View Details</button>
                            <button onClick={() => openDirections(h.lat, h.lon, h.name)} className="w-full bg-slate-100 text-slate-700 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1"><Navigation size={10} />Directions</button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    {gpsHospitals.filter(h => h.distance <= selectedRange).map(h => (
                      <Marker key={h.id} position={[h.lat, h.lon]} icon={makeIcon("#059669","🏥")} ref={r => { if (r) gpsMarkerRefs.current[h.id] = r; }}>
                        <Popup>
                          <div className="p-1 min-w-36">
                            <p className="font-bold text-slate-800 text-xs">{h.name.split(",")[0]}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{h.distance.toFixed(2)} km · GPS Result</p>
                            <button onClick={() => openDirections(h.lat, h.lon, h.name)} className="mt-2 w-full bg-indigo-600 text-white py-1.5 rounded-lg text-[11px] font-bold">Directions</button>
                            <button onClick={() => requestBed(h)} disabled={bookingId === h.id} className="mt-1 w-full bg-emerald-600 text-white py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50 flex items-center justify-center gap-1"><BedDouble size={10} />{bookingId === h.id ? "Sending..." : "Request Bed"}</button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    <FlyTo pos={hoveredPos} />
                  </MapContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {!searchQuery && activeCategory === "labs" && (
          <div className="flex flex-col h-full">
            <SortViewBar count={filteredLabs.length} label="diagnostic centres" sortBy={sortBy} onSort={setSortBy} viewMode={viewMode} onView={setViewMode} />
            {viewMode === "list" && (
              <div className="flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
                  {filteredLabs.map(l => <LabCard key={l.id} l={l} onDirections={openDirections} />)}
                  {filteredLabs.length === 0 && <div className="text-center py-20"><FlaskConical size={40} className="mx-auto mb-3 text-slate-200" /><p className="font-bold text-slate-400">No labs match the current filters.</p></div>}
                </div>
              </div>
            )}
            {viewMode === "map" && (
              <div className="flex flex-1 overflow-hidden">
                <aside className="w-80 bg-white border-r border-slate-100 flex flex-col shadow-md shrink-0 z-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 pt-3 pb-1">{filteredLabs.length} labs shown</p>
                  <div className="flex-1 overflow-y-auto">
                    {filteredLabs.map(l => (
                      <div key={l.id} onMouseEnter={() => { setHoveredPos([l.lat, l.lon]); labMarkerRefs.current[l.id]?.openPopup(); }}>
                        <LabCard l={l} onDirections={openDirections} compact />
                      </div>
                    ))}
                  </div>
                </aside>
                <div className="flex-1 relative">
                  <MapContainer center={mapCenter} zoom={14} className="h-full w-full z-10">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors" />
                    {position && <Marker position={position} icon={userIcon}><Popup>📍 You are here</Popup></Marker>}
                    {filteredLabs.map(l => (
                      <Marker key={l.id} position={[l.lat, l.lon]} icon={labMapIcon} ref={r => { if (r) labMarkerRefs.current[l.id] = r; }}>
                        <Popup>
                          <div className="p-1 min-w-40">
                            <p className="font-black text-slate-800 text-xs">{l.name}</p>
                            <div className="flex items-center gap-2 mt-1 mb-1">
                              <span className="text-[10px] text-violet-600 font-bold">{l.distance.toFixed(1)} km</span>
                              <Stars r={l.rating} />
                              {l.isOpen ? <span className="text-[9px] text-emerald-600 font-black">Open</span> : <span className="text-[9px] text-slate-400 font-black">Closed</span>}
                            </div>
                            {l.homeCollection && <p className="text-[9px] text-violet-600 font-black mb-1">🏠 Home Collection</p>}
                            <p className="text-xs font-black text-violet-700 mb-2">₹{l.startingPrice}+</p>
                            <a href={`tel:${l.phone}`} className="w-full block text-center bg-slate-100 text-slate-700 py-1.5 rounded-lg text-[11px] font-bold mb-1"><Phone size={10} className="inline mr-1" />Call</a>
                            <button onClick={() => openDirections(l.lat, l.lon, l.name)} className="w-full bg-violet-600 text-white py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1"><Navigation size={10} />Directions</button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    <FlyTo pos={hoveredPos} />
                  </MapContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {!searchQuery && activeCategory === "pharmacies" && (
          <div className="flex flex-col h-full">
            <SortViewBar count={filteredPharmacies.length} label="pharmacies" sortBy={sortBy} onSort={setSortBy} viewMode={viewMode} onView={setViewMode} />
            {viewMode === "list" && (
              <div className="flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
                  {filteredPharmacies.map(p => <PharmacyCard key={p.id} p={p} onDirections={openDirections} />)}
                  {filteredPharmacies.length === 0 && <div className="text-center py-20"><Pill size={40} className="mx-auto mb-3 text-slate-200" /><p className="font-bold text-slate-400">No pharmacies match the current filters.</p></div>}
                </div>
              </div>
            )}
            {viewMode === "map" && (
              <div className="flex flex-1 overflow-hidden">
                <aside className="w-80 bg-white border-r border-slate-100 flex flex-col shadow-md shrink-0 z-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 pt-3 pb-1">{filteredPharmacies.length} pharmacies shown</p>
                  <div className="flex-1 overflow-y-auto">
                    {filteredPharmacies.map(p => (
                      <div key={p.id} onMouseEnter={() => { setHoveredPos([p.lat, p.lon]); pharmMarkerRefs.current[p.id]?.openPopup(); }}>
                        <PharmacyCard p={p} onDirections={openDirections} compact />
                      </div>
                    ))}
                  </div>
                </aside>
                <div className="flex-1 relative">
                  <MapContainer center={mapCenter} zoom={14} className="h-full w-full z-10">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors" />
                    {position && <Marker position={position} icon={userIcon}><Popup>📍 You are here</Popup></Marker>}
                    {filteredPharmacies.map(p => (
                      <Marker key={p.id} position={[p.lat, p.lon]} icon={pharmMapIcon} ref={r => { if (r) pharmMarkerRefs.current[p.id] = r; }}>
                        <Popup>
                          <div className="p-1 min-w-40">
                            <p className="font-black text-slate-800 text-xs">{p.name}</p>
                            <div className="flex items-center gap-2 mt-1 mb-1">
                              <span className="text-[10px] text-rose-600 font-bold">{p.distance.toFixed(1)} km</span>
                              <Stars r={p.rating} />
                              {p.isOpen ? <span className="text-[9px] text-emerald-600 font-black">Open</span> : <span className="text-[9px] text-slate-400 font-black">Closed</span>}
                            </div>
                            <div className="flex gap-1 mb-2">{p.is24x7 && <Chip label="24/7" color="emerald" />}{p.delivery && <Chip label="Delivery" color="indigo" />}</div>
                            <a href={`tel:${p.phone}`} className="w-full block text-center bg-slate-100 text-slate-700 py-1.5 rounded-lg text-[11px] font-bold mb-1">Call</a>
                            <button onClick={() => openDirections(p.lat, p.lon, p.name)} className="w-full bg-rose-500 text-white py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1"><Navigation size={10} />Directions</button>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    <FlyTo pos={hoveredPos} />
                  </MapContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {!searchQuery && activeCategory === "doctors" && (
          <div className="flex flex-col h-full">
            {/* Filter / Sort / View bar */}
            <div className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-2 flex-wrap shrink-0">
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                {filteredDoctors.length} <span className="text-slate-400">doctors</span>
              </span>
              <select value={specFilter} onChange={e => setSpecFilter(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">All Specializations</option>
                {allSpecs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex gap-1.5 flex-1 hide-scrollbar overflow-x-auto">
                {[
                  { key: "rating", icon: <Star size={11} />,        text: "Top Rated" },
                  { key: "name",   icon: <ArrowUpDown size={11} />,  text: "A – Z" },
                ].map(s => (
                  <button key={s.key} onClick={() => setSortBy(s.key)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 flex items-center gap-1.5 transition-all
                      ${sortBy === s.key ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600"}`}>
                    {s.icon} {s.text}
                  </button>
                ))}
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded-xl shrink-0 gap-0.5">
                <button onClick={() => setViewMode("list")} title="List view"
                  className={`px-2.5 py-1.5 rounded-lg flex items-center transition-all ${viewMode === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                  <LayoutGrid size={13} />
                </button>
                <button onClick={() => setViewMode("map")} title="Map view"
                  className={`px-2.5 py-1.5 rounded-lg flex items-center transition-all ${viewMode === "map" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                  <MapPin size={13} />
                </button>
              </div>
            </div>

            {/* LIST VIEW */}
            {viewMode === "list" && (
              <div className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredDoctors.map(d => {
                    const inDoctorCompare = doctorCompareList.some(c => c.id === d.id);
                    return (
                      <div key={d.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 relative overflow-hidden px-4 pt-5 pb-4 flex items-end gap-3 cursor-pointer" onClick={() => setSelectedDoctor(d)}>
                          <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-white/10" />
                          <img src={d.photo} alt={d.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/80 shadow-xl shrink-0 relative z-10"
                            onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=6366f1&color=fff&size=64`; }} />
                          <div className="pb-0.5">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${d.available ? "bg-emerald-400 text-white" : "bg-white/20 text-white"}`}>
                              {d.available ? "Available" : "Busy"}
                            </span>
                          </div>
                          {/* Doctor compare button */}
                          <button onClick={e => { e.stopPropagation(); toggleDoctorCompare(d); }}
                            className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black transition-all shadow-md ${inDoctorCompare ? "bg-emerald-500 text-white border border-emerald-400" : "bg-white/90 text-slate-700 border border-white/60 hover:bg-emerald-50 hover:text-emerald-700"}`}>
                            <Scale size={10} />{inDoctorCompare ? "Added ✓" : "Compare"}
                          </button>
                        </div>
                        <div className="p-4 cursor-pointer" onClick={() => setSelectedDoctor(d)}>
                          <h3 className="font-black text-slate-800 text-sm leading-tight group-hover:text-indigo-600 transition-colors">{d.name}</h3>
                          <p className="text-indigo-600 text-xs font-bold mt-0.5">{d.specialization}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{d.hospital}</p>
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-50">
                            <span className="text-[11px] text-slate-400 font-medium">{d.experience} yrs</span>
                            <Stars r={d.rating} />
                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">₹{d.consultationFee}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MAP VIEW — hospital markers for each doctor's workplace */}
            {viewMode === "map" && (
              <div className="flex flex-1 overflow-hidden">
                <aside className="w-80 bg-white border-r border-slate-100 flex flex-col shadow-md shrink-0 z-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 pt-3 pb-1">
                    {filteredDoctors.length} doctors · {doctorHospitals.length} hospitals
                  </p>
                  <div className="flex-1 overflow-y-auto">
                    {filteredDoctors.map(d => {
                      const hosp = HOSPITALS.find(h => h.id === d.hospitalId);
                      return (
                        <div key={d.id}
                          onMouseEnter={() => { if (hosp) { setHoveredPos([hosp.lat, hosp.lon]); docHospMarkerRefs.current[d.hospitalId]?.openPopup(); } }}
                          onClick={() => setSelectedDoctor(d)}
                          className="p-3 border-b border-slate-50 hover:bg-indigo-50 cursor-pointer transition-colors group">
                          <div className="flex items-center gap-2.5 mb-1">
                            <img src={d.photo} alt={d.name} className="w-9 h-9 rounded-full object-cover border border-indigo-100 shrink-0"
                              onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=6366f1&color=fff&size=36`; }} />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800 text-xs leading-tight group-hover:text-indigo-700 transition-colors">{d.name}</p>
                              <p className="text-[10px] text-indigo-600 font-semibold">{d.specialization}</p>
                            </div>
                            <Stars r={d.rating} />
                          </div>
                          <p className="text-[10px] text-slate-400 truncate pl-11 flex items-center gap-1">
                            <Building2 size={9} className="shrink-0" />{d.hospital}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </aside>
                <div className="flex-1 relative">
                  <MapContainer center={mapCenter} zoom={13} className="h-full w-full z-10">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors" />
                    {position && <Marker position={position} icon={userIcon}><Popup>📍 You are here</Popup></Marker>}
                    {doctorHospitals.map(hosp => {
                      const docs = filteredDoctors.filter(d => d.hospitalId === hosp.id);
                      return (
                        <Marker key={hosp.id} position={[hosp.lat, hosp.lon]} icon={hospitalMapIcon}
                          ref={r => { if (r) docHospMarkerRefs.current[hosp.id] = r; }}>
                          <Popup>
                            <div className="p-1 min-w-48">
                              <p className="font-black text-slate-800 text-xs mb-0.5">{hosp.name}</p>
                              <div className="flex items-center gap-2 mb-2">
                                <Stars r={hosp.rating} />
                                <span className="text-[10px] text-indigo-600 font-bold">{hosp.distance.toFixed(1)} km</span>
                                {hosp.isOpen
                                  ? <span className="text-[9px] text-emerald-600 font-black flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Open</span>
                                  : <span className="text-[9px] text-slate-400 font-black">Closed</span>}
                              </div>
                              <div className="space-y-1.5 mb-2.5 border-t border-slate-50 pt-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{docs.length} doctor{docs.length !== 1 ? "s" : ""} here</p>
                                {docs.slice(0, 3).map(d => (
                                  <div key={d.id} className="flex items-center gap-2">
                                    <img src={d.photo} alt={d.name} className="w-7 h-7 rounded-full object-cover border border-indigo-100 shrink-0"
                                      onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=6366f1&color=fff&size=28`; }} />
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-bold text-slate-800 truncate">{d.name}</p>
                                      <p className="text-[9px] text-indigo-600">{d.specialization}</p>
                                    </div>
                                  </div>
                                ))}
                                {docs.length > 3 && <p className="text-[9px] text-slate-400 font-bold pl-1">+{docs.length - 3} more doctors</p>}
                              </div>
                              <button onClick={() => setSelectedHospital(hosp)}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1">
                                <Building2 size={11} />View Hospital Details
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                    <FlyTo pos={hoveredPos} />
                  </MapContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {!searchQuery && activeCategory === "packages" && (
          <div className="flex flex-col h-full">
            {/* ── Filter / Sort bar ── */}
            <div className="bg-white border-b border-slate-100 px-3 py-2.5 flex items-center gap-2 shadow-sm shrink-0 overflow-x-auto hide-scrollbar">
              <div className="flex items-center bg-amber-50 border border-amber-200 hover:border-amber-300 focus-within:border-amber-500 focus-within:bg-white rounded-full overflow-hidden shrink-0 transition-all" style={{minWidth:"200px"}}>
                <Search className="ml-3 text-amber-400 shrink-0" size={13} />
                <input type="text" placeholder="Search test or package…"
                  value={packageQuery} onChange={e => setPackageQuery(e.target.value)}
                  className="flex-1 py-2 px-2 text-sm bg-transparent focus:outline-none text-slate-800 placeholder:text-amber-400/70 min-w-0" />
                {packageQuery && (
                  <button onClick={() => setPackageQuery("")} className="mr-2 w-4 h-4 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 hover:bg-rose-200 hover:text-rose-600 transition-all"><X size={9} /></button>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                {([
                  { key: "discount",   label: "Best Deal" },
                  { key: "price_asc",  label: "Cheapest" },
                  { key: "price_desc", label: "Costliest" },
                  { key: "name",       label: "A – Z" },
                ] as const).map(s => (
                  <button key={s.key} onClick={() => setPackageSort(s.key)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all ${packageSort === s.key ? "bg-amber-500 text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200 hover:border-amber-300 hover:text-amber-600"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setPackageHomeOnly(p => !p)}
                className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl shrink-0 transition-all border ${packageHomeOnly ? "bg-amber-500 text-white border-amber-500 shadow-sm" : "text-slate-500 border-slate-200 hover:border-amber-300"}`}>
                🏠 Home Only
              </button>
              <select value={packageCatFilter} onChange={e => setPackageCatFilter(e.target.value)}
                className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-600 focus:outline-none shrink-0 bg-white hover:border-amber-300 transition-all">
                <option value="">All Categories</option>
                {Array.from(new Set(PACKAGES.map(p => p.category))).sort().map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex bg-amber-50 border border-amber-100 p-0.5 rounded-xl shrink-0 gap-0.5 ml-auto">
                <button onClick={() => setPackageViewMode("list")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] font-bold transition-all ${packageViewMode === "list" ? "bg-white text-amber-600 shadow-sm border border-amber-200" : "text-amber-400 hover:text-amber-600"}`}>
                  <LayoutGrid size={12} /><span>List</span>
                </button>
                <button onClick={() => setPackageViewMode("map")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px] font-bold transition-all ${packageViewMode === "map" ? "bg-white text-amber-600 shadow-sm border border-amber-200" : "text-amber-400 hover:text-amber-600"}`}>
                  <MapPin size={12} /><span>Map</span>
                </button>
              </div>
            </div>
            {/* ── Search result notice ── */}
            {packageQuery && (
              <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-2 shrink-0">
                <Search size={10} className="text-amber-500 shrink-0" />
                <span className="text-[11px] font-black text-amber-700 flex-1">
                  {filteredPackages.length > 0
                    ? <>{filteredPackages.length} package{filteredPackages.length > 1 ? "s" : ""} contain <span className="bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded mx-0.5">"{packageQuery}"</span></>
                    : <>No packages match "{packageQuery}" — try a different test name</>}
                </span>
                <button onClick={() => setPackageQuery("")} className="text-[10px] text-amber-500 hover:text-amber-700 font-bold shrink-0">Clear</button>
              </div>
            )}
            {/* ── Request success toast ── */}
            {requestNotice && (
              <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 flex items-center gap-2 shrink-0">
                <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                <p className="text-[11px] font-bold text-emerald-700">{requestNotice}</p>
              </div>
            )}

            {/* ── LIST VIEW ── */}
            {packageViewMode === "list" && (
              <div className="flex-1 overflow-auto">
                {filteredPackages.length === 0 ? (
                  <div className="text-center py-20">
                    <Package size={44} className="mx-auto mb-3 text-slate-200" />
                    <p className="font-bold text-slate-400">No packages found</p>
                    <p className="text-xs text-slate-300 mt-1">Try a different test name or clear the filters</p>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">
                    {filteredPackages.map(pk => {
                      const discount = Math.round((1 - pk.price / pk.originalPrice) * 100);
                      const matchedTests = packageQuery.trim()
                        ? pk.tests.filter(t => t.toLowerCase().includes(packageQuery.toLowerCase()))
                        : [];
                      return (
                        <div key={pk.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border border-slate-100">
                          <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 px-5 py-4 flex items-center gap-4 overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
                            <div className="absolute right-12 bottom-0 w-14 h-14 rounded-full bg-white/10 pointer-events-none" />
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                              <Package className="text-white" size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-black text-white text-base leading-tight">{pk.name}</h3>
                              <p className="text-amber-100 text-xs mt-0.5 font-medium">{pk.provider}</p>
                              {matchedTests.length > 0 && (
                                <span className="inline-block mt-1.5 text-[9px] font-black text-amber-900 bg-white/30 border border-white/20 px-2 py-0.5 rounded-full">
                                  ✓ Contains: {matchedTests.slice(0,2).join(", ")}{matchedTests.length > 2 ? ` +${matchedTests.length - 2}` : ""}
                                </span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-2xl font-black text-white">₹{pk.price}</p>
                              <p className="text-[10px] line-through text-amber-200 font-medium">₹{pk.originalPrice}</p>
                              <span className="inline-block text-[10px] font-black text-white bg-white/25 border border-white/20 px-2 py-0.5 rounded-full mt-0.5">{discount}% OFF</span>
                            </div>
                          </div>
                          <div className="p-5">
                            <p className="text-xs text-slate-500 leading-relaxed mb-3">{pk.description}</p>
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
                                <FlaskConical size={11} className="text-violet-500" />{pk.testsCount} Tests
                              </span>
                              {pk.homeCollection && <Chip label="🏠 Home Collection" color="amber" />}
                              <Chip label={pk.category} color="amber" />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {pk.tests.map(t => {
                                const isMatch = packageQuery.trim() && t.toLowerCase().includes(packageQuery.toLowerCase());
                                return (
                                  <span key={t} className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all ${isMatch ? "bg-amber-100 text-amber-800 border border-amber-300 ring-1 ring-amber-300" : "bg-slate-100 text-slate-600"}`}>
                                    {t}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Provider</p>
                              <p className="text-xs font-bold text-slate-600 truncate">{pk.provider}</p>
                            </div>
                            {pk.homeCollection && (
                              <button onClick={() => requestPackage(pk.id)} disabled={requestedPkg === pk.id}
                                className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-200 px-3 py-2 rounded-xl transition-all disabled:opacity-60 shrink-0">
                                {requestedPkg === pk.id ? "✓ Sent" : "🏠 Request"}
                              </button>
                            )}
                            <button className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-sm shrink-0">
                              <Package size={12} />Book Now
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── MAP VIEW ── */}
            {packageViewMode === "map" && (
              <div className="flex flex-1 overflow-hidden">
                <aside className="w-80 bg-white border-r border-slate-100 flex flex-col shadow-xl shrink-0 z-10">
                  <div className="px-4 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-between shrink-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black text-sm flex items-center gap-2">
                        <Package size={14} className="shrink-0" />Health Packages
                        <span className="text-[9px] bg-white/25 text-white px-1.5 py-0.5 rounded-full font-bold">{filteredPackages.length}</span>
                      </p>
                      <p className="text-amber-100 text-[10px] font-medium mt-0.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
                        {LABS.filter(l => l.homeCollection).length} labs offer home collection · {LABS.length} total labs
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                    {filteredPackages.map(pk => {
                      const discount = Math.round((1 - pk.price / pk.originalPrice) * 100);
                      return (
                        <div key={pk.id} className="px-3 py-3 hover:bg-amber-50/50 transition-colors group">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                              <Package size={16} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800 text-[11px] leading-tight group-hover:text-amber-700 transition-colors">{pk.name}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">{pk.provider}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-sm font-black text-amber-700">₹{pk.price}</span>
                                <span className="text-[9px] text-slate-400 line-through">₹{pk.originalPrice}</span>
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{discount}% OFF</span>
                              </div>
                              <div className="flex gap-1.5 mt-2">
                                {pk.homeCollection && (
                                  <button onClick={() => requestPackage(pk.id)} disabled={requestedPkg === pk.id}
                                    className="flex items-center gap-0.5 text-[10px] font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-lg transition-all disabled:opacity-50">
                                    🏠 {requestedPkg === pk.id ? "Sent" : "Request"}
                                  </button>
                                )}
                                <button className="flex items-center gap-0.5 text-[10px] font-black text-white bg-amber-500 hover:bg-amber-600 px-2 py-1 rounded-lg transition-all">
                                  <Package size={9} />Book
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </aside>
                <div className="flex-1 relative">
                  <MapContainer center={mapCenter} zoom={13} className="h-full w-full z-10">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors" />
                    {position && <Marker position={position} icon={userIcon}><Popup>📍 You are here</Popup></Marker>}
                    {LABS.map(l => (
                      <Marker key={l.id} position={[l.lat, l.lon]} icon={packageMapIcon}>
                        <Popup>
                          <div className="p-1 min-w-48">
                            <p className="font-black text-slate-800 text-xs">{l.name}</p>
                            <div className="flex items-center gap-2 mt-1 mb-1.5">
                              <span className="text-[10px] text-amber-600 font-bold">{l.distance.toFixed(1)} km</span>
                              {l.homeCollection && <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">🏠 Home</span>}
                            </div>
                            <p className="text-[10px] font-black text-amber-700 mb-0.5">{filteredPackages.length} package{filteredPackages.length !== 1 ? "s" : ""} available</p>
                            <p className="text-[11px] font-black text-amber-600 mb-2">Starting ₹{filteredPackages.length > 0 ? Math.min(...filteredPackages.map(p => p.price)) : "—"}</p>
                            <button onClick={() => setPackageViewMode("list")}
                              className="w-full bg-amber-500 text-white py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 mb-1">
                              <Package size={10} />View Packages
                            </button>
                            {l.homeCollection && (
                              <button onClick={() => { requestPackage(l.id); setPackageViewMode("list"); }}
                                className="w-full bg-emerald-600 text-white py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1">
                                🏠 Request Home Collection
                              </button>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    <FlyTo pos={hoveredPos} />
                  </MapContainer>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {compareList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-indigo-100 shadow-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0"><Scale size={15} className="text-indigo-600" /></div>
          <p className="text-xs font-black text-indigo-700 shrink-0 hidden sm:block">Hospitals</p>
          <div className="flex-1 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {compareList.map(h => (
              <div key={h.id} className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-2.5 py-1.5 shrink-0">
                <img src={h.image} alt={h.name} className="w-5 h-5 rounded-md object-cover" />
                <span className="text-xs font-bold text-indigo-700 max-w-20 truncate">{h.name.split(" ").slice(0,2).join(" ")}</span>
                <button onClick={() => setCompareList(p => p.filter(c => c.id !== h.id))} className="text-indigo-300 hover:text-rose-500 transition-colors"><X size={11} /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setShowCompare(true)} disabled={compareList.length < 2}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-4 py-2 rounded-xl disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-lg">
            <Scale size={12} />Compare {compareList.length}
          </button>
        </div>
      )}

      {doctorCompareList.length > 0 && (
        <div className={`fixed ${compareList.length > 0 ? "bottom-14" : "bottom-0"} left-0 right-0 z-40 bg-white border-t border-emerald-100 shadow-2xl px-4 py-3 flex items-center gap-3`}>
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0"><Scale size={15} className="text-emerald-600" /></div>
          <p className="text-xs font-black text-emerald-700 shrink-0 hidden sm:block">Doctors</p>
          <div className="flex-1 flex items-center gap-2 overflow-x-auto hide-scrollbar">
            {doctorCompareList.map(d => (
              <div key={d.id} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 shrink-0">
                <img src={d.photo} alt={d.name} className="w-5 h-5 rounded-full object-cover border border-emerald-200"
                  onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=10b981&color=fff&size=20`; }} />
                <span className="text-xs font-bold text-emerald-700 max-w-20 truncate">{d.name}</span>
                <button onClick={() => setDoctorCompareList(p => p.filter(c => c.id !== d.id))} className="text-emerald-300 hover:text-rose-500 transition-colors"><X size={11} /></button>
              </div>
            ))}
          </div>
          <button onClick={() => setShowDoctorCompare(true)} disabled={doctorCompareList.length < 2}
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-lg">
            <Scale size={12} />Compare {doctorCompareList.length}
          </button>
        </div>
      )}

      {showCompare && (
        <CompareModal
          list={compareList}
          onClose={() => setShowCompare(false)}
          onRemove={id => { setCompareList(p => p.filter(c => c.id !== id)); if (compareList.length <= 2) setShowCompare(false); }}
          onAdd={h => compareList.length < 3 && setCompareList(p => [...p, h])}
        />
      )}

      {showDoctorCompare && (
        <DoctorCompareModal
          list={doctorCompareList}
          onClose={() => setShowDoctorCompare(false)}
          onRemove={id => { setDoctorCompareList(p => p.filter(c => c.id !== id)); if (doctorCompareList.length <= 2) setShowDoctorCompare(false); }}
          onAdd={d => doctorCompareList.length < 3 && setDoctorCompareList(p => [...p, d])}
        />
      )}

      {showFilters && <FilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilters(false)} category={activeCategory || ""} />}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-popup-content-wrapper { border-radius: 16px !important; padding: 6px !important; box-shadow: 0 10px 20px -5px rgba(0,0,0,.2) !important; }
        .leaflet-popup-tip-container { display: none; }
        .leaflet-bar { border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,.1) !important; }
        .leaflet-bar a { border-radius: 8px !important; border-bottom: none !important; margin-bottom: 2px; }
        .w-18 { width: 4.5rem; } .h-18 { height: 4.5rem; }
      `}</style>
    </div>
  );
}
