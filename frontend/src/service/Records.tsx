import React, { useState, useEffect, useRef, useMemo, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  ArrowLeft, Plus, FileText, FlaskConical, ScanLine, LayoutDashboard,
  Stethoscope, Pencil, X, Upload, ChevronRight, Droplets,
  AlertCircle, Phone, ClipboardList, Trash2, Link2, Search,
  SlidersHorizontal, ArrowUpDown, Star, Archive,
  Copy, Eye, Clock, CheckCircle2, FileImage, FileArchive, ChevronDown,
  Pin, Tag, Hash, Building2, Calendar, User,
  Layers
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import api from '../api/Api';
import DateField from '../components/DateField';

/* ─── Types ─── */
interface Tag { id: number; name: string; color: string; usageCount?: number; }
interface CollectionRef { id: number; name: string; }
interface RecentRecord { category: string; title: string; visitDate: string | null; }
interface Collection {
  id: number; name: string; description: string | null;
  recordCount: number; prescriptionCount: number; labCount: number;
  scanCount: number; importantCount: number; isImportant: boolean;
  created_at: string; updated_at: string;
  recentRecords: RecentRecord[];
  records?: CollectionRecord[];
}
interface CollectionRecord { id: number; recordId: string; title: string; category: string; doctorName: string | null; visitDate: string | null; created_at: string; isImportant: boolean; isPinned: boolean; originalFileName: string | null; mimeType: string | null; }

interface Report {
  id: number; recordId: string; title: string;
  category: 'prescription' | 'lab' | 'scan' | 'discharge' | 'other';
  doctorName: string | null; specialization: string | null; hospital: string | null;
  visitDate: string | null; notes: string | null; visibility: string; emergencyAccess: boolean;
  originalFileName: string | null; mimeType: string | null; fileSize: number | null;
  created_at: string; updated_at: string; connectionCount: number;
  isImportant: boolean; isArchived: boolean; isPinned: boolean;
  tags: Tag[]; collections: CollectionRef[];
}

interface PatientSummary { bloodGroup: string | null; knownConditions: string | null; allergies: string | null; emergencyContact: string | null; healthRemarks: string | null; }

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

/** Emergency contact is stored as one string ("Name — +91 98765 43210") so no schema change
 *  is needed, but the UI edits/displays it as separate name + phone fields. */
const parseEmergencyContact = (raw: string | null): { name: string; phone: string } => {
  if (!raw) return { name: '', phone: '' };
  const digits = raw.replace(/\D/g, '');
  const phone = digits.length >= 10 ? digits.slice(-10) : digits;
  const sepIdx = raw.search(/[-–—:]/);
  let name: string;
  if (sepIdx !== -1) {
    name = raw.slice(0, sepIdx).trim();
  } else {
    // No separator: if the whole string is just phone-ish characters (any length,
    // not only long runs), there's no name to show — just a bare number.
    name = /^[\d+()\s-]+$/.test(raw.trim()) ? '' : raw.trim();
  }
  return { name, phone };
};

const formatEmergencyContact = (name: string, phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '').slice(0, 10);
  const formattedPhone = cleanPhone.length === 10 ? `${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : cleanPhone;
  if (!name.trim() && !formattedPhone) return '';
  if (!formattedPhone) return name.trim();
  if (!name.trim()) return `+91 ${formattedPhone}`;
  return `${name.trim()} — +91 ${formattedPhone}`;
};

type Tab = 'overview' | 'prescriptions' | 'lab' | 'scans' | 'collections' | 'timeline';
type CategoryType = 'prescription' | 'lab' | 'scan' | 'discharge' | 'other';
type SortKey = 'created_at' | 'visitDate' | 'title';

/* ─── Constants ─── */
const CATEGORY_META: Record<string, { label: string; prefix: string; color: string; bg: string; icon: React.ReactNode }> = {
  prescription: { label: 'Prescription',      prefix: 'PRES', color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200',   icon: <Stethoscope size={13} /> },
  lab:          { label: 'Lab Report',         prefix: 'LAB',  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: <FlaskConical size={13} /> },
  scan:         { label: 'Scan / Imaging',     prefix: 'IMG',  color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200',   icon: <ScanLine size={13} /> },
  discharge:    { label: 'Discharge Summary',  prefix: 'DIS',  color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     icon: <ClipboardList size={13} /> },
  other:        { label: 'Other',              prefix: 'REC',  color: 'text-slate-600',   bg: 'bg-slate-100 border-slate-200',    icon: <FileText size={13} /> },
};

const TAG_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  indigo:  { bg: 'bg-indigo-100',  text: 'text-indigo-700',  border: 'border-indigo-300'  },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  violet:  { bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-300'  },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300'   },
  rose:    { bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-300'    },
  sky:     { bg: 'bg-sky-100',     text: 'text-sky-700',     border: 'border-sky-300'     },
  teal:    { bg: 'bg-teal-100',    text: 'text-teal-700',    border: 'border-teal-300'    },
  orange:  { bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-300'  },
  pink:    { bg: 'bg-pink-100',    text: 'text-pink-700',    border: 'border-pink-300'    },
  lime:    { bg: 'bg-lime-100',    text: 'text-lime-700',    border: 'border-lime-300'    },
};
const tagColor = (c: string) => TAG_COLOR_MAP[c] || TAG_COLOR_MAP.indigo;



/* ─── Helpers ─── */
const relativeDate = (ts: string): string => {
  const d = new Date(ts), now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  const hrs = Math.floor(mins / 60), days = Math.floor(hrs / 24);
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (mins < 1) return 'Just now';
  if (hrs < 1) return `${mins}m ago`;
  if (d.toDateString() === now.toDateString()) return `Today • ${time}`;
  if (days === 1) return `Yesterday • ${time}`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmt = (cat: string) => CATEGORY_META[cat] || CATEGORY_META.other;

const fileBadge = (mimeType: string | null) => {
  if (!mimeType) return null;
  if (mimeType === 'application/pdf') return { label: 'PDF', cls: 'bg-rose-50 text-rose-600 border-rose-200', icon: <FileArchive size={10} /> };
  if (mimeType.startsWith('image/')) return { label: mimeType.split('/')[1].toUpperCase(), cls: 'bg-sky-50 text-sky-600 border-sky-200', icon: <FileImage size={10} /> };
  return { label: 'FILE', cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: <FileText size={10} /> };
};

/* ─── Sub-components ─── */
function RecordIdBadge({ recordId, category }: { recordId: string | null; category: string }) {
  const m = fmt(category);
  if (!recordId) return null;
  return <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${m.color} ${m.bg}`}>{recordId}</span>;
}

function TagChip({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  const c = tagColor(tag.color);
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      <Hash size={9} />
      {tag.name}
      {onRemove && <button onClick={onRemove} className="ml-0.5 hover:opacity-70"><X size={10} /></button>}
    </span>
  );
}

function FileBadge({ mimeType }: { mimeType: string | null }) {
  const b = fileBadge(mimeType);
  if (!b) return null;
  return <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${b.cls}`}>{b.icon} {b.label}</span>;
}

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4"><FileText size={28} className="text-slate-300" /></div>
      <p className="font-bold text-slate-700 text-lg mb-1">No {label} yet</p>
      <p className="text-sm text-slate-400 mb-6 max-w-xs">Upload your first {label.toLowerCase()} to start building your connected medical history.</p>
      <button onClick={onAdd} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100">
        <Plus size={16} /> Add Record
      </button>
    </div>
  );
}

/* ─── Tag chip input ─── */
function TagInput({ value, onChange, allTags }: { value: string[]; onChange: (t: string[]) => void; allTags: Tag[] }) {
  const [input, setInput] = useState('');
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShow(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const add = (name: string) => {
    const n = name.replace(/^#/, '').trim();
    if (!n || value.includes(n)) return;
    onChange([...value, n]);
    setInput(''); setShow(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) { e.preventDefault(); add(input); }
    if (e.key === 'Backspace' && !input && value.length) onChange(value.slice(0, -1));
  };

  const suggestions = allTags.filter(t => t.name.toLowerCase().includes(input.toLowerCase()) && !value.includes(t.name));

  return (
    <div ref={ref} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex flex-wrap gap-1.5 min-h-[44px] focus-within:ring-2 focus-within:ring-indigo-500 transition-all cursor-text" onClick={() => { setShow(true); }}>
      {value.map(n => {
        const t = allTags.find(t => t.name === n);
        const c = tagColor(t?.color || 'indigo');
        return (
          <span key={n} className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
            <Hash size={9} />{n}
            <button type="button" onClick={e => { e.stopPropagation(); onChange(value.filter(v => v !== n)); }} className="ml-0.5 hover:opacity-70"><X size={10} /></button>
          </span>
        );
      })}
      <div className="relative flex-1 min-w-24">
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setShow(true); }}
          onKeyDown={handleKey}
          onFocus={() => setShow(true)}
          placeholder={value.length === 0 ? 'Type tag, press Enter…' : ''}
          className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
        {show && (suggestions.length > 0 || input.trim()) && (
          <div className="absolute left-0 top-7 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 max-h-40 overflow-y-auto">
            {suggestions.map(t => {
              const c = tagColor(t.color);
              return (
                <button key={t.id} type="button" onMouseDown={e => { e.preventDefault(); add(t.name); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-left">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}><Hash size={9} />{t.name}</span>
                </button>
              );
            })}
            {input.trim() && !allTags.find(t => t.name.toLowerCase() === input.toLowerCase()) && (
              <button type="button" onMouseDown={e => { e.preventDefault(); add(input); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-indigo-50 text-left text-indigo-600 font-medium">
                <Plus size={13} /> Create <span className="font-bold">#{input}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Right-click context menu ─── */
interface CtxMenu { x: number; y: number; record: Report; }

function ContextMenu({ menu, onClose, onView, onToggleImportant, onToggleArchive, onDuplicate, onDelete, onTogglePin }: {
  menu: CtxMenu; onClose: () => void; onView: () => void;
  onToggleImportant: () => void; onToggleArchive: () => void;
  onDuplicate: () => void; onDelete: () => void; onTogglePin: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: menu.y, left: menu.x });

  useEffect(() => {
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const key = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [onClose]);

  useEffect(() => {
    if (!ref.current) return;
    const { offsetWidth: w, offsetHeight: h } = ref.current;
    setPos({ top: Math.min(menu.y, window.innerHeight - h - 8), left: Math.min(menu.x, window.innerWidth - w - 8) });
  }, [menu.x, menu.y]);

  const item = (icon: React.ReactNode, label: string, action: () => void, danger = false) => (
    <button onClick={e => { e.stopPropagation(); action(); onClose(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors text-left ${danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'}`}>
      {icon} {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="w-52 bg-white rounded-xl border border-slate-200 shadow-2xl shadow-slate-300/40 p-1.5" onContextMenu={e => e.preventDefault()}>
      <div className="px-3 py-1.5 mb-1 border-b border-slate-100">
        <p className="text-xs font-bold text-slate-800 truncate">{menu.record.title}</p>
        <p className="text-[10px] text-slate-400 font-mono">{menu.record.recordId}</p>
      </div>
      {item(<Eye size={14} />, 'View Details', onView)}
      {item(<Pin size={14} className={menu.record.isPinned ? 'fill-indigo-400 text-indigo-400' : ''} />, menu.record.isPinned ? 'Unpin' : 'Pin', onTogglePin)}
      {item(<Star size={14} className={menu.record.isImportant ? 'fill-amber-400 text-amber-400' : ''} />, menu.record.isImportant ? 'Remove Star' : 'Star', onToggleImportant)}
      {item(<Copy size={14} />, 'Duplicate', onDuplicate)}
      {item(<Archive size={14} />, menu.record.isArchived ? 'Unarchive' : 'Archive', onToggleArchive)}
      <div className="my-1 border-t border-slate-100" />
      {item(<Trash2 size={14} />, 'Delete', onDelete, true)}
    </div>
  );
}

/* ─── Main Component ─── */
export default function Records() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  const [records, setRecords] = useState<Report[]>([]);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [searchQ, setSearchQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterTag, setFilterTag] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterHospital, setFilterHospital] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDesc, setSortDesc] = useState(true);
  const [showSortMenu, setShowSortMenu] = useState(false);

  /* add record modal */
  const [showAdd, setShowAdd] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [directStep2, setDirectStep2] = useState(false);
  const [selCategory, setSelCategory] = useState<CategoryType>('prescription');
  const [fTitle, setFTitle] = useState('');
  const [fDoctor, setFDoctor] = useState('');
  const [fSpec, setFSpec] = useState('');
  const [fHospital, setFHospital] = useState('');
  const [fDate, setFDate] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [fVisibility, setFVisibility] = useState<'private' | 'shared'>('private');
  const [fEmergencyAccess, setFEmergencyAccess] = useState(false);
  const [fTags, setFTags] = useState<string[]>([]);
  const [fFile, setFFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [addError, setAddError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState<Report | null>(null);

  /* summary modal */
  const [showSummaryEdit, setShowSummaryEdit] = useState(false);
  const [sBlood, setSBlood] = useState('');
  const [sConditions, setSConditions] = useState('');
  const [sAllergies, setSAllergies] = useState('');
  const [sEmergencyName, setSEmergencyName] = useState('');
  const [sEmergencyPhone, setSEmergencyPhone] = useState('');
  const [sRemarks, setSRemarks] = useState('');
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  /* collections UI */
  const [showNewCol, setShowNewCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  /* context menu */
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);

  const openCtx = useCallback((e: React.MouseEvent, record: Report) => {
    e.preventDefault(); e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, record });
  }, []);

  const sortRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [rRes, sRes, tRes, cRes] = await Promise.all([
          api.get('/user/records/all'),
          api.get('/user/records/summary'),
          api.get('/user/tags'),
          api.get('/user/collections'),
        ]);
        if (rRes.data?.success) setRecords(rRes.data.data);
        if (sRes.data?.success) setSummary(sRes.data.data);
        if (tRes.data?.success) setAllTags(tRes.data.data);
        if (cRes.data?.success) setCollections(cRes.data.data);
      } catch (e: any) {
        if (e.response?.status === 401) navigate('/auth');
      } finally { setLoading(false); }
    })();
  }, [navigate]);

  /* Arriving from "Create a collection" on a record's detail page */
  useEffect(() => {
    if (searchParams.get('tab') === 'collections') {
      setActiveTab('collections');
      if (searchParams.get('createFor')) setShowNewCol(true);
    }
  }, [searchParams]);

  const filteredRecords = useMemo(() => {
    let list = [...records];
    if (!showArchived) list = list.filter(r => !r.isArchived);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) || (r.recordId || '').toLowerCase().includes(q) ||
        (r.doctorName || '').toLowerCase().includes(q) || (r.hospital || '').toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q) ||
        r.tags.some(t => t.name.toLowerCase().includes(q))
      );
    }
    if (filterTag) list = list.filter(r => r.tags.some(t => t.name === filterTag));
    if (filterDoctor.trim()) list = list.filter(r => (r.doctorName || '').toLowerCase().includes(filterDoctor.toLowerCase()));
    if (filterHospital.trim()) list = list.filter(r => (r.hospital || '').toLowerCase().includes(filterHospital.toLowerCase()));
    if (filterDateFrom) list = list.filter(r => r.visitDate && r.visitDate >= filterDateFrom);
    if (filterDateTo) list = list.filter(r => r.visitDate && r.visitDate <= filterDateTo);
    list.sort((a, b) => {
      const av = (a[sortKey] || '') as string, bv = (b[sortKey] || '') as string;
      return sortDesc ? bv.localeCompare(av) : av.localeCompare(bv);
    });
    return list;
  }, [records, searchQ, filterTag, filterDoctor, filterHospital, filterDateFrom, filterDateTo, showArchived, sortKey, sortDesc]);

  const prescriptions = useMemo(() => filteredRecords.filter(r => r.category === 'prescription'), [filteredRecords]);
  const labReports    = useMemo(() => filteredRecords.filter(r => r.category === 'lab'), [filteredRecords]);
  const scans         = useMemo(() => filteredRecords.filter(r => r.category === 'scan'), [filteredRecords]);
  const pinnedRecords = useMemo(() => records.filter(r => r.isPinned && !r.isArchived), [records]);
  const recent        = useMemo(() => records.filter(r => !r.isArchived && !r.isPinned).slice(0, 5), [records]);

  const timelineRecords = useMemo(() =>
    records.filter(r => !r.isArchived).slice().sort((a, b) => {
      const av = a.visitDate || a.created_at, bv = b.visitDate || b.created_at;
      return bv.localeCompare(av);
    }), [records]);

  /* ── Timeline: category filter, month grouping, collapse + jump state ── */
  const [timelineCategory, setTimelineCategory] = useState<string>('');
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const yearsInitRef = useRef(false);
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const timelineCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of timelineRecords) counts[r.category] = (counts[r.category] || 0) + 1;
    return counts;
  }, [timelineRecords]);

  const filteredTimelineRecords = useMemo(() =>
    timelineCategory ? timelineRecords.filter(r => r.category === timelineCategory) : timelineRecords,
    [timelineRecords, timelineCategory]);

  const timelineGroups = useMemo(() => {
    const map = new Map<string, Map<string, Report[]>>();
    for (const r of filteredTimelineRecords) {
      const d = r.visitDate ? new Date(r.visitDate) : new Date(r.created_at);
      const year = String(d.getFullYear());
      const month = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      if (!map.has(year)) map.set(year, new Map());
      const monthMap = map.get(year)!;
      if (!monthMap.has(month)) monthMap.set(month, []);
      monthMap.get(month)!.push(r);
    }
    return map;
  }, [filteredTimelineRecords]);

  useEffect(() => {
    if (!yearsInitRef.current && timelineGroups.size > 0) {
      yearsInitRef.current = true;
      setExpandedYears(new Set([Array.from(timelineGroups.keys())[0]]));
    }
  }, [timelineGroups]);

  const toggleYear = (year: string) => setExpandedYears(prev => {
    const next = new Set(prev);
    if (next.has(year)) next.delete(year); else next.add(year);
    return next;
  });

  const toggleMonth = (month: string) => setCollapsedMonths(prev => {
    const next = new Set(prev);
    if (next.has(month)) next.delete(month); else next.add(month);
    return next;
  });

  const jumpToMonth = (year: string, month: string) => {
    setExpandedYears(prev => new Set(prev).add(year));
    setCollapsedMonths(prev => {
      if (!prev.has(month)) return prev;
      const next = new Set(prev);
      next.delete(month);
      return next;
    });
    requestAnimationFrame(() => monthRefs.current[month]?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const openAdd = (defaultCat?: CategoryType) => {
    if (defaultCat) { setSelCategory(defaultCat); setAddStep(2); setDirectStep2(true); }
    else { setAddStep(1); setDirectStep2(false); }
    setFTitle(''); setFDoctor(''); setFSpec(''); setFHospital('');
    setFDate(''); setFNotes(''); setFVisibility('private'); setFEmergencyAccess(false); setFTags([]); setFFile(null);
    setAddError(''); setUploadProgress(0); setSaveSuccess(null); setShowAdd(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setAddError('File must be under 5MB.'); return; }
    setFFile(f); setAddError('');
  };

  const handleSubmitRecord = async () => {
    if (!fTitle.trim()) { setAddError('Title is required.'); return; }
    setIsSubmitting(true); setAddError(''); setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append('title', fTitle.trim()); fd.append('category', selCategory);
      fd.append('doctorName', fDoctor); fd.append('specialization', fSpec);
      fd.append('hospital', fHospital); fd.append('visitDate', fDate);
      fd.append('notes', fNotes); fd.append('visibility', fVisibility);
      fd.append('emergencyAccess', String(fEmergencyAccess));
      if (fTags.length) fd.append('tags', JSON.stringify(fTags));
      if (fFile) fd.append('file', fFile);

      const res = await api.post('/user/records/create', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => { if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100)); },
      });
      if (res.data?.success) {
        setRecords(prev => [res.data.data, ...prev]);
        setSaveSuccess(res.data.data);
        // Refresh tags list in case new tags were created
        const tRes = await api.get('/user/tags');
        if (tRes.data?.success) setAllTags(tRes.data.data);
      }
    } catch (e: any) {
      if (e.response?.status === 401) navigate('/auth');
      else if (!e.response) setAddError('Could not connect to server. Check your connection and try again.');
      else setAddError(e.response?.data?.message || 'Upload failed. Please try again.');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm('Delete this record permanently?')) return;
    try {
      await api.delete(`/user/records/${id}`);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (e: any) {
      if (e.response?.status === 401) navigate('/auth');
      else console.error('Delete failed:', e);
    }
  }, [navigate]);

  const handleToggleImportant = useCallback(async (id: number) => {
    try {
      const res = await api.patch(`/user/records/${id}/important`);
      if (res.data?.success) setRecords(prev => prev.map(r => r.id === id ? { ...r, isImportant: res.data.isImportant } : r));
    } catch {}
  }, []);

  const handleToggleArchive = useCallback(async (id: number) => {
    try {
      const res = await api.patch(`/user/records/${id}/archive`);
      if (res.data?.success) setRecords(prev => prev.map(r => r.id === id ? { ...r, isArchived: res.data.isArchived } : r));
    } catch {}
  }, []);

  const handleTogglePin = useCallback(async (id: number) => {
    try {
      const res = await api.patch(`/user/records/${id}/pin`);
      if (res.data?.success) setRecords(prev => prev.map(r => r.id === id ? { ...r, isPinned: res.data.isPinned } : r));
    } catch {}
  }, []);

  const handleDuplicate = useCallback(async (id: number) => {
    try {
      const res = await api.post(`/user/records/${id}/duplicate`);
      if (res.data?.success) setRecords(prev => [res.data.data, ...prev]);
    } catch {}
  }, []);

  const openSummaryEdit = () => {
    setSBlood(summary?.bloodGroup || ''); setSConditions(summary?.knownConditions || '');
    setSAllergies(summary?.allergies || '');
    const parsed = parseEmergencyContact(summary?.emergencyContact || null);
    setSEmergencyName(parsed.name); setSEmergencyPhone(parsed.phone);
    setSRemarks(summary?.healthRemarks || '');
    setSummaryError('');
    setShowSummaryEdit(true);
  };

  const handleSaveSummary = async () => {
    setIsSavingSummary(true);
    setSummaryError('');
    try {
      const emergencyContact = formatEmergencyContact(sEmergencyName, sEmergencyPhone);
      const res = await api.post('/user/records/summary', { bloodGroup: sBlood, knownConditions: sConditions, allergies: sAllergies, emergencyContact, healthRemarks: sRemarks });
      if (res.data?.success) { setSummary(res.data.data); setShowSummaryEdit(false); }
      else setSummaryError('Failed to save. Please try again.');
    } catch (e: any) {
      if (e.response?.status === 401) navigate('/auth');
      else setSummaryError(e.response?.data?.message || 'Could not connect to server. Please try again.');
    }
    finally { setIsSavingSummary(false); }
  };

  const handleCreateCollection = async () => {
    if (!newColName.trim()) return;
    try {
      const res = await api.post('/user/collections', { name: newColName.trim(), description: newColDesc.trim() || null });
      if (res.data?.success) {
        setCollections(prev => [{ ...res.data.data, prescriptionCount: 0, labCount: 0, scanCount: 0, importantCount: 0, recentRecords: [] }, ...prev]);
        setNewColName(''); setNewColDesc(''); setShowNewCol(false);
        const createFor = searchParams.get('createFor');
        if (createFor) {
          try { await api.post(`/user/collections/${res.data.data.id}/records/${createFor}`); } catch {}
          navigate(`/records/${createFor}`);
        } else {
          navigate(`/collections/${res.data.data.id}`);
        }
      }
    } catch {}
  };

  const handleDeleteCollection = async (id: number) => {
    if (!window.confirm('Delete this collection? Records will not be deleted.')) return;
    try {
      await api.delete(`/user/collections/${id}`);
      setCollections(prev => prev.filter(c => c.id !== id));
    } catch {}
  };

  const handleToggleCollectionImportant = async (id: number) => {
    try {
      const res = await api.patch(`/user/collections/${id}/important`);
      if (res.data?.success) {
        setCollections(prev => prev.map(c => c.id === id ? { ...c, isImportant: res.data.isImportant } : c));
      }
    } catch {}
  };

  const activeFiltersCount = [filterTag, filterDoctor, filterHospital, filterDateFrom, filterDateTo, showArchived ? 'x' : ''].filter(Boolean).length;

  const TABS: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview',      label: 'Overview',     icon: <LayoutDashboard size={16} /> },
    { key: 'prescriptions', label: 'Prescriptions', icon: <Stethoscope size={16} />,  count: records.filter(r => r.category === 'prescription' && !r.isArchived).length },
    { key: 'lab',           label: 'Lab Reports',  icon: <FlaskConical size={16} />,  count: records.filter(r => r.category === 'lab' && !r.isArchived).length },
    { key: 'scans',         label: 'Scans',        icon: <ScanLine size={16} />,      count: records.filter(r => r.category === 'scan' && !r.isArchived).length },
    { key: 'collections',   label: 'Collections',  icon: <Layers size={16} />,        count: collections.length || undefined },
    { key: 'timeline',      label: 'Timeline',     icon: <Clock size={16} /> },
  ];

  /* ─── Toolbar ─── */
  const Toolbar = () => (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Search by title, doctor, tag, notes…"
            className="w-full pl-11 pr-9 py-3 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
          {searchQ && <button onClick={() => setSearchQ('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
        </div>
        <button onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-bold transition-all ${showFilters || activeFiltersCount > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
          <SlidersHorizontal size={15} /> Filters
          {activeFiltersCount > 0 && <span className="bg-indigo-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">{activeFiltersCount}</span>}
        </button>
        <div ref={sortRef} className="relative">
          <button onClick={() => setShowSortMenu(v => !v)}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-slate-300 transition-all">
            <ArrowUpDown size={15} /> Sort <ChevronDown size={13} className="text-slate-400" />
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-300/30 z-30 p-1.5">
              {([['created_at', 'Upload Date'], ['visitDate', 'Visit Date'], ['title', 'Title']] as [SortKey, string][]).map(([k, l]) => (
                <button key={k} onClick={() => { if (sortKey === k) setSortDesc(v => !v); else { setSortKey(k); setSortDesc(true); } setShowSortMenu(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-xl transition-colors ${sortKey === k ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50 font-medium'}`}>
                  {l} {sortKey === k && <span className="text-xs">{sortDesc ? '↓' : '↑'}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.08)]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2">Doctor</label>
              <input value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)} placeholder="Any doctor"
                className={`w-full rounded-xl px-3.5 py-3 text-sm font-semibold placeholder:font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${filterDoctor ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' : 'bg-slate-50 border border-slate-200 text-slate-700'}`} />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2">Hospital</label>
              <input value={filterHospital} onChange={e => setFilterHospital(e.target.value)} placeholder="Any hospital"
                className={`w-full rounded-xl px-3.5 py-3 text-sm font-semibold placeholder:font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${filterHospital ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' : 'bg-slate-50 border border-slate-200 text-slate-700'}`} />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tag</label>
              <div className="relative">
                <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
                  className={`w-full appearance-none rounded-xl pl-3.5 pr-9 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${filterTag ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' : 'bg-slate-50 border border-slate-200 text-slate-700'}`}>
                  <option value="">All tags</option>
                  {allTags.map(t => <option key={t.id} value={t.name}>#{t.name}</option>)}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2">From</label>
              <DateField value={filterDateFrom} onChange={setFilterDateFrom} />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2">To</label>
              <DateField value={filterDateTo} onChange={setFilterDateTo} />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2">Show Archived</label>
              <button type="button" onClick={() => setShowArchived(v => !v)}
                className="w-full flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 hover:border-slate-300 transition-colors">
                <span className={`w-9 h-5 rounded-full relative shrink-0 transition-colors ${showArchived ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${showArchived ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
                <span className="text-sm font-semibold text-slate-600">{showArchived ? 'On' : 'Off'}</span>
              </button>
            </div>
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-slate-50">
            <button onClick={() => { setFilterTag(''); setFilterDoctor(''); setFilterHospital(''); setFilterDateFrom(''); setFilterDateTo(''); setShowArchived(false); }} className="text-xs font-bold text-indigo-600 hover:underline">
              Clear all filters
            </button>
          </div>
        </div>
      )}
    </div>
  );

  /* ─── Flat report cards (Prescriptions / Lab Reports) ─── */
  const visitFmtShort = (ds: string) => new Date(ds).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const visitDayMonth = (ds: string) => {
    const d = new Date(ds);
    return {
      day: d.toLocaleDateString('en-IN', { day: 'numeric' }),
      monthYear: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    };
  };

  const RecordMeta = ({ label, value, icon }: { label: string; value: string | null; icon?: React.ReactNode }) => {
    if (!value) return null;
    return (
      <span className="record-context__item" title={`${label}: ${value}`} aria-label={`${label}: ${value}`}>
        <span className="record-context__label">{icon}</span>
        <span className="record-context__value">{value}</span>
      </span>
    );
  };

  const PrescriptionCard = ({ r }: { r: Report }) => {
    const dm = r.visitDate ? visitDayMonth(r.visitDate) : null;

    return (
      <div key={r.id} onClick={() => navigate(`/records/${r.id}`)} onContextMenu={e => openCtx(e, r)}
        className="record-list-card group">
        <span className="record-list-card__rail bg-indigo-500" />
        <div className="record-list-card__body flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="record-list-card__icon w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <Stethoscope size={22} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-[.12em] text-indigo-600">Prescription</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-[10px] font-bold text-slate-400">{r.recordId}</span>
              {r.isPinned && <Pin size={12} className="text-indigo-500 fill-current" />}
              {r.isImportant && <Star size={12} className="fill-amber-400 text-amber-400" />}
            </div>
            <p className="font-black text-slate-900 text-[17px] tracking-tight leading-tight mt-1.5 truncate">{r.title}</p>
            <div className="record-context mt-3">
              <RecordMeta label="Doctor" value={r.doctorName} icon={<User size={12} />} />
              <RecordMeta label="Department" value={r.specialization} icon={<Stethoscope size={12} />} />
              <RecordMeta label="Facility" value={r.hospital} icon={<Building2 size={12} />} />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-3">
              {r.tags.slice(0, 3).map(t => <TagChip key={t.id} tag={t} />)}
              {r.mimeType && <FileBadge mimeType={r.mimeType} />}
              {r.isArchived && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Archived</span>}
            </div>
          </div>

          <div className="record-list-card__date shrink-0 sm:px-5 sm:min-w-[112px]">
            {dm ? <><div className="text-[24px] font-black text-slate-900 leading-none tabular-nums">{dm.day}</div><div className="text-[10px] font-black text-slate-400 uppercase tracking-[.12em] mt-1">{dm.monthYear}</div></> : <span className="text-xs text-slate-400">Date not added</span>}
          </div>
          <div className="record-list-card__action w-9 h-9 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center shrink-0">
            <ChevronRight size={18} />
          </div>
        </div>
      </div>
    );
  };

  const renderPrescriptionList = (rows: Report[]) => {
    if (!rows.length) return <EmptyState label="Prescriptions" onAdd={() => openAdd('prescription')} />;
    return <div className="flex flex-col gap-3">{rows.map(r => <PrescriptionCard key={r.id} r={r} />)}</div>;
  };

  const LabReportCard = ({ r }: { r: Report }) => {
    const dm = r.visitDate ? visitDayMonth(r.visitDate) : null;

    return (
      <div key={r.id} onClick={() => navigate(`/records/${r.id}`)} onContextMenu={e => openCtx(e, r)}
        className="record-list-card group">
        <span className="record-list-card__rail bg-emerald-500" />
        <div className="record-list-card__body flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="record-list-card__icon w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <FlaskConical size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-[.12em] text-emerald-600">Lab report</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-[10px] font-bold text-slate-400">{r.recordId}</span>
              {r.isPinned && <Pin size={12} className="text-emerald-600 fill-current" />}
              {r.isImportant && <Star size={12} className="fill-amber-400 text-amber-400" />}
            </div>
            <p className="font-black text-slate-900 text-[17px] tracking-tight leading-tight mt-1.5 truncate">{r.title}</p>
            <div className="record-context mt-3">
              <RecordMeta label="Facility" value={r.hospital} icon={<Building2 size={12} />} />
              <RecordMeta label="Doctor" value={r.doctorName} icon={<User size={12} />} />
              <RecordMeta label="Department" value={r.specialization} icon={<FlaskConical size={12} />} />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap mt-3">
              {r.tags.slice(0, 3).map(t => <TagChip key={t.id} tag={t} />)}
              {r.mimeType && <FileBadge mimeType={r.mimeType} />}
              {r.isArchived && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Archived</span>}
            </div>
          </div>
          <div className="record-list-card__date shrink-0 sm:px-5 sm:min-w-[112px]">
            {dm ? <><div className="text-[24px] font-black text-slate-900 leading-none tabular-nums">{dm.day}</div><div className="text-[10px] font-black text-slate-400 uppercase tracking-[.12em] mt-1">{dm.monthYear}</div></> : <span className="text-xs text-slate-400">Date not added</span>}
          </div>
          <div className="record-list-card__action w-9 h-9 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 flex items-center justify-center shrink-0">
            <ChevronRight size={18} />
          </div>
        </div>
      </div>
    );
  };

  const renderLabReportList = (rows: Report[]) => {
    if (!rows.length) return <EmptyState label="Lab Reports" onAdd={() => openAdd('lab')} />;
    return <div className="flex flex-col gap-3">{rows.map(r => <LabReportCard key={r.id} r={r} />)}</div>;
  };

  /* ─── Scan gallery card ─── */
  const SCAN_PREVIEW_STYLES = [
    'radial-gradient(circle at 30% 20%, #3f3f46, #18181b 70%)',
    'radial-gradient(circle at 30% 20%, #4c1d95, #1e1b4b 70%)',
    'radial-gradient(circle at 50% 30%, #0c4a6e, #0f172a 75%)',
  ];

  const ScanGalleryCard = ({ r }: { r: Report }) => (
    <div key={r.id} onClick={() => navigate(`/records/${r.id}`)} onContextMenu={e => openCtx(e, r)}
      className="record-card-lift bg-white border border-slate-100 rounded-[22px] overflow-hidden hover:border-violet-200 cursor-pointer group">
      <div className="relative h-44 flex items-center justify-center overflow-hidden" style={{ background: SCAN_PREVIEW_STYLES[r.id % SCAN_PREVIEW_STYLES.length] }}>
        <ScanLine size={64} className="text-white/10" />
        <span className="absolute top-3 left-3 bg-white/15 backdrop-blur border border-white/25 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full">
          {r.specialization || 'Scan'}
        </span>
        <span className="absolute top-3 right-3 font-mono bg-white/15 backdrop-blur border border-white/25 text-white text-[10px] font-extrabold px-2 py-1 rounded-md">
          {r.recordId}
        </span>
        {(r.isPinned || r.isImportant) && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1.5">
            {r.isPinned && <Pin size={12} className="text-white fill-white/80" />}
            {r.isImportant && <Star size={12} className="text-amber-300 fill-amber-300" />}
          </span>
        )}
      </div>
      <div className="p-5">
        <p className="font-extrabold text-slate-800 text-[14.5px] leading-snug group-hover:text-violet-700 transition-colors">{r.title}</p>
        <div className="flex flex-col gap-1 mt-2.5 text-[11.5px] text-slate-500">
          {r.hospital && <span className="flex items-center gap-1.5"><Building2 size={12} className="shrink-0" />{r.hospital}</span>}
          {r.doctorName && <span className="flex items-center gap-1.5"><User size={12} className="shrink-0" />{r.doctorName}</span>}
          {r.visitDate && <span className="flex items-center gap-1.5"><Calendar size={12} className="shrink-0" />{visitFmtShort(r.visitDate)}</span>}
        </div>
        <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-slate-50">
          <div className="flex items-center gap-1.5 flex-wrap">
            {r.tags.slice(0, 2).map(t => <TagChip key={t.id} tag={t} />)}
            {r.isArchived && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Archived</span>}
          </div>
          <span className="text-[11px] font-extrabold text-violet-600 flex items-center gap-1 whitespace-nowrap">
            View Scan <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </div>
  );

  const renderScanGallery = (rows: Report[]) => {
    if (!rows.length) return <EmptyState label="Scans" onAdd={() => openAdd('scan')} />;
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{rows.map(r => <ScanGalleryCard key={r.id} r={r} />)}</div>;
  };

  /* ─── Timeline ─── */
  const TimelineRail = () => (
    <div className="w-56 shrink-0 space-y-5">
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-2.5">Jump to</p>
        {Array.from(timelineGroups.entries()).map(([year, months]) => {
          const total = Array.from(months.values()).reduce((s, arr) => s + arr.length, 0);
          const isOpen = expandedYears.has(year);
          return (
            <div key={year}>
              <button onClick={() => toggleYear(year)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-black text-slate-800 hover:bg-slate-50 transition-colors">
                <ChevronDown size={12} className={`text-slate-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                {year}
                <span className="ml-auto text-[11px] font-semibold text-slate-400">{total}</span>
              </button>
              {isOpen && Array.from(months.entries()).map(([month, recs]) => (
                <button key={month} onClick={() => jumpToMonth(year, month)}
                  className="w-full flex items-center gap-2.5 pl-7 pr-3 py-2 rounded-lg text-[13px] font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                  <span className="truncate">{month}</span>
                  <span className="ml-auto text-[11px] font-bold text-slate-400 shrink-0">{recs.length}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-2.5">Category</p>
        <button onClick={() => setTimelineCategory('')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-bold transition-colors ${!timelineCategory ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}>
          All records
          <span className="ml-auto text-[11px] font-semibold text-slate-400">{timelineRecords.length}</span>
        </button>
        {(Object.keys(CATEGORY_META) as CategoryType[]).filter(k => timelineCategoryCounts[k]).map(k => (
          <button key={k} onClick={() => setTimelineCategory(k)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors ${timelineCategory === k ? `${CATEGORY_META[k].bg} ${CATEGORY_META[k].color}` : 'text-slate-600 hover:bg-slate-50'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${CATEGORY_META[k].color.replace('text-', 'bg-')}`} />
            {CATEGORY_META[k].label}
            <span className="ml-auto text-[11px] font-bold text-slate-400">{timelineCategoryCounts[k]}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const TimelineView = () => {
    if (!filteredTimelineRecords.length) return <EmptyState label="records" onAdd={() => openAdd()} />;
    return (
      <div>
        {Array.from(timelineGroups.entries()).map(([, months]) =>
          Array.from(months.entries()).map(([month, recs]) => {
            const isCollapsed = collapsedMonths.has(month);
            return (
              <div key={month} ref={el => { monthRefs.current[month] = el; }} className="pt-5 first:pt-0">
                <button onClick={() => toggleMonth(month)} className="w-full flex items-center gap-2.5 mb-4">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <ChevronDown size={13} className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  </span>
                  <span className="text-sm font-black whitespace-nowrap text-slate-800">{month}</span>
                  <span className={`flex-1 h-px ${isCollapsed ? 'bg-slate-100' : 'bg-slate-200'}`} />
                  <span className="text-xs text-slate-400 font-semibold shrink-0">
                    {recs.length} record{recs.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="relative pl-8 mb-2">
                    <div className="absolute left-3 top-1 bottom-1 w-0.5 bg-slate-200 rounded-full" />
                    <div className="space-y-3">
                      {recs.map(r => {
                        const m = fmt(r.category);
                        const date = r.visitDate ? new Date(r.visitDate) : new Date(r.created_at);
                        return (
                          <div key={r.id} className="relative">
                            <div className={`absolute -left-8 top-3 w-9 h-9 rounded-xl flex items-center justify-center ${m.bg} ${m.color}`}><span className="scale-110">{m.icon}</span></div>
                            <div onClick={() => navigate(`/records/${r.id}`)} onContextMenu={e => openCtx(e, r)}
                              className="ml-2 bg-white rounded-2xl border border-slate-100 p-4 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${m.color}`}>{m.label}</span>
                                    {r.isPinned && <Pin size={11} className="fill-indigo-400 text-indigo-400" />}
                                    {r.isImportant && <Star size={11} className="fill-amber-400 text-amber-400" />}
                                  </div>
                                  <p className="font-bold text-slate-800 text-[15px] mt-0.5 group-hover:text-indigo-600 transition-colors">{r.title}</p>
                                </div>
                                <span className="text-xs text-slate-400 font-bold whitespace-nowrap tabular-nums">
                                  {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                                {r.doctorName && <span>{r.doctorName}{r.specialization ? `, ${r.specialization}` : ''}</span>}
                                {r.hospital && <span>{r.hospital}</span>}
                              </div>
                              {(r.tags.length > 0 || r.mimeType) && (
                                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                                  {r.tags.map(t => <TagChip key={t.id} tag={t} />)}
                                  <FileBadge mimeType={r.mimeType} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  /* ─── Collections tab ─── */
  const CollectionsTab = () => {
    const importanceRank = (c: Collection) => (c.isImportant ? 2 : 0) + (c.importantCount > 0 ? 1 : 0);
    const sorted = [...collections].sort((a, b) => {
      const rankDiff = importanceRank(b) - importanceRank(a);
      if (rankDiff !== 0) return rankDiff;
      return (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at);
    });

    const totalRecords = collections.reduce((s, c) => s + c.recordCount, 0);
    const totalImportant = collections.reduce((s, c) => s + c.importantCount + (c.isImportant ? 1 : 0), 0);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const updatedThisWeek = collections.filter(c => new Date(c.updated_at || c.created_at).getTime() >= weekAgo).length;

    const dominantCategory = (col: Collection): CategoryType => {
      const counts: [CategoryType, number][] = [
        ['prescription', col.prescriptionCount], ['lab', col.labCount], ['scan', col.scanCount],
      ];
      const top = counts.reduce((a, b) => (b[1] > a[1] ? b : a));
      return top[1] > 0 ? top[0] : 'other';
    };

    const dateRange = (col: Collection) => {
      const started = col.created_at ? new Date(col.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;
      return started ? `Since ${started}` : '';
    };

    const Pills = ({ col }: { col: Collection }) => (
      <div className="flex items-center gap-1.5 flex-wrap">
        {col.prescriptionCount > 0 && <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">{col.prescriptionCount} Prescription{col.prescriptionCount !== 1 ? 's' : ''}</span>}
        {col.labCount > 0 && <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">{col.labCount} Lab Report{col.labCount !== 1 ? 's' : ''}</span>}
        {col.scanCount > 0 && <span className="text-[11px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full">{col.scanCount} Scan{col.scanCount !== 1 ? 's' : ''}</span>}
        {col.importantCount > 0 && <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">{col.importantCount} Important</span>}
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Your collections</h2>
          </div>
          {collections.length > 0 && (
            <button
              onClick={() => setShowNewCol(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100">
              <Plus size={15} /> Add Collection
            </button>
          )}
        </div>

        {/* Stat strip */}
        {collections.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Layers size={18} /></div>
              <div><p className="text-2xl font-black text-slate-800 leading-none tabular-nums">{collections.length}</p><p className="text-[11px] text-slate-400 font-semibold mt-1">Collections</p></div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><FileText size={18} /></div>
              <div><p className="text-2xl font-black text-slate-800 leading-none tabular-nums">{totalRecords}</p><p className="text-[11px] text-slate-400 font-semibold mt-1">Total records</p></div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Star size={16} /></div>
              <div><p className="text-2xl font-black text-slate-800 leading-none tabular-nums">{totalImportant}</p><p className="text-[11px] text-slate-400 font-semibold mt-1">Marked important</p></div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Clock size={18} /></div>
              <div><p className="text-2xl font-black text-slate-800 leading-none tabular-nums">{updatedThisWeek}</p><p className="text-[11px] text-slate-400 font-semibold mt-1">Updated this week</p></div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {collections.length === 0 && (
          <div className="max-w-xl mx-auto text-center pt-12 pb-8">
            {/* Layered-document mark */}
            <div className="relative w-[92px] h-[74px] mx-auto mb-4">
              <div className="absolute left-2.5 top-[18px] w-[58px] h-[46px] rounded-xl bg-indigo-50 border border-indigo-100 -rotate-[9deg]" />
              <div className="absolute left-[23px] top-2.5 w-[58px] h-[46px] rounded-xl bg-violet-50 border border-violet-100 rotate-6" />
              <div className="absolute left-[17px] top-[13px] w-[58px] h-[46px] rounded-xl bg-white border border-slate-200 shadow-lg shadow-indigo-100 flex items-center justify-center text-indigo-400">
                <Layers size={20} />
              </div>
            </div>

            <p className="font-black text-slate-800 text-xl mb-2">Group your records into a story</p>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mb-5">
              A collection ties records to one episode of care, so the full picture — not just a single report — is what you or a doctor sees.
            </p>

            <button
              onClick={() => setShowNewCol(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-3.5 rounded-xl transition-all shadow-md shadow-indigo-100 mx-auto mb-6">
              <Plus size={16} /> Add Collection
            </button>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Or start from a common one</p>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Chronic Condition', icon: <Stethoscope size={16} />, color: 'text-indigo-600' },
                { label: 'Surgery / Procedure', icon: <ScanLine size={16} />, color: 'text-violet-600' },
                { label: 'Annual Checkup', icon: <FlaskConical size={16} />, color: 'text-emerald-600' },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => { setNewColName(s.label); setShowNewCol(true); }}
                  className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-700 transition-all">
                  <span className={s.color}>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collections grid — uniform size, sorted by most recently opened/updated */}
        {sorted.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map(col => {
              const cat = dominantCategory(col);
              return (
                <div key={col.id} onClick={() => navigate(`/collections/${col.id}`)}
                  className="relative bg-white border border-slate-100 rounded-2xl p-6 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group flex flex-col">
                  <div className="absolute top-5 right-5 flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); handleToggleCollectionImportant(col.id); }}
                      title={col.isImportant ? 'Marked important' : 'Mark as important'}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        col.isImportant
                          ? 'text-amber-500 hover:bg-amber-50'
                          : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'
                      }`}>
                      <Star size={14} className={col.isImportant ? 'fill-amber-400' : ''} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteCollection(col.id); }}
                      className="w-7 h-7 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-all">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex gap-3.5 pr-16">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${col.recordCount === 0 ? 'bg-indigo-50 text-indigo-400' : `${fmt(cat).bg} ${fmt(cat).color}`}`}>
                      <span className="scale-125">{col.recordCount === 0 ? <Layers size={13} /> : fmt(cat).icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{col.name}</p>
                      <p className="text-sm font-semibold text-slate-400 mt-0.5">{col.recordCount} record{col.recordCount !== 1 ? 's' : ''}</p>
                      {col.description && <p className="text-xs text-slate-400 mt-1 truncate">{col.description}</p>}
                    </div>
                  </div>
                  {col.recordCount > 0 ? (
                    <div className="mt-4"><Pills col={col} /></div>
                  ) : (
                    <div className="mt-4 bg-slate-50 rounded-xl px-4 py-3">
                      <p className="text-xs text-slate-400">No records yet — open to add the first one.</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                    <span className="text-[11px] text-slate-400 font-medium">{dateRange(col)}</span>
                    <span className="text-xs font-bold text-indigo-600 group-hover:underline">View Collection</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Collection modal */}
        {showNewCol && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
                <div>
                  <h2 className="font-black text-slate-800 text-lg">Create Collection</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Group records from one episode of care together</p>
                </div>
                <button
                  onClick={() => { setShowNewCol(false); setNewColName(''); setNewColDesc(''); }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>

              <div className="px-7 py-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Name <span className="text-rose-500">*</span></label>
                  <input
                    value={newColName}
                    onChange={e => setNewColName(e.target.value)}
                    placeholder="e.g. Diabetes Management, Knee Surgery 2026"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Description</label>
                  <input
                    value={newColDesc}
                    onChange={e => setNewColDesc(e.target.value)}
                    placeholder="What health episode does this track?"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Or pick a common one</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Chronic Condition', icon: <Stethoscope size={13} /> },
                      { label: 'Surgery / Procedure', icon: <ScanLine size={13} /> },
                      { label: 'Annual Checkup', icon: <FlaskConical size={13} /> },
                    ].map(s => (
                      <button key={s.label} type="button" onClick={() => setNewColName(s.label)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-all ${newColName === s.label ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowNewCol(false); setNewColName(''); setNewColDesc(''); }}
                    className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCollection}
                    disabled={!newColName.trim()}
                    className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-sm transition-all shadow-md shadow-indigo-100 disabled:shadow-none">
                    Create & Open
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ─── Loading ─── */
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading your records...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/services')} className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors text-slate-500"><ArrowLeft size={18} /></button>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Medical Records</h1>
              <p className="text-xs text-slate-400 mt-0.5">{records.filter(r => !r.isArchived).length} active · {pinnedRecords.length} pinned</p>
            </div>
          </div>
          {activeTab !== 'collections' && activeTab !== 'timeline' && (
            <button
              onClick={() => openAdd(activeTab === 'prescriptions' ? 'prescription' : activeTab === 'lab' ? 'lab' : activeTab === 'scans' ? 'scan' : undefined)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100 active:scale-95">
              <Plus size={16} /> Add Record
            </button>
          )}
        </div>
        <div className="max-w-7xl mx-auto px-6 flex gap-1 pb-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.icon} {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">

            {/* Pinned Records Strip */}
            {pinnedRecords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Pin size={14} className="fill-indigo-500 text-indigo-500" />
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Pinned</h2>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {pinnedRecords.map(r => {
                    const m = fmt(r.category);
                    return (
                      <div key={r.id} onClick={() => navigate(`/records/${r.id}`)}
                        className="flex-shrink-0 w-60 bg-white rounded-2xl border-2 border-indigo-100 p-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${m.bg} ${m.color} shrink-0`}>{m.icon}</div>
                          <RecordIdBadge recordId={r.recordId} category={r.category} />
                        </div>
                        <p className="font-bold text-sm text-slate-800 line-clamp-2 mb-1">{r.title}</p>
                        {r.doctorName && <p className="text-xs text-slate-400 truncate">{r.doctorName}</p>}
                        {r.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{r.tags.slice(0, 2).map(t => <TagChip key={t.id} tag={t} />)}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Records',  value: records.filter(r => !r.isArchived).length, color: 'indigo',  icon: <FileText size={20} /> },
                { label: 'Prescriptions', value: records.filter(r => r.category === 'prescription' && !r.isArchived).length, color: 'indigo', icon: <Stethoscope size={20} /> },
                { label: 'Lab Reports',   value: records.filter(r => r.category === 'lab' && !r.isArchived).length, color: 'emerald', icon: <FlaskConical size={20} /> },
                { label: 'Scans',         value: records.filter(r => r.category === 'scan' && !r.isArchived).length, color: 'violet', icon: <ScanLine size={20} /> },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-${s.color}-50 text-${s.color}-600`}>{s.icon}</div>
                  <div>
                    <p className="text-2xl font-black text-slate-800">{s.value}</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Patient Summary */}
              <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
                  <h2 className="font-bold text-slate-800">Patient Summary</h2>
                  <button onClick={openSummaryEdit} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors"><Pencil size={12} /> Edit</button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1"><Droplets size={14} className="text-rose-500" /><span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Blood Group</span></div>
                    {summary?.bloodGroup ? (
                      <span className="inline-flex items-center justify-center min-w-9 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-black">{summary.bloodGroup}</span>
                    ) : (
                      <p className="text-sm font-medium text-slate-300 italic">Not specified</p>
                    )}
                  </div>
                  {[
                    { label: 'Known Conditions', value: summary?.knownConditions, icon: <AlertCircle size={14} className="text-amber-500" /> },
                    { label: 'Allergies', value: summary?.allergies, icon: <AlertCircle size={14} className="text-orange-500" /> },
                  ].map(f => (
                    <div key={f.label}>
                      <div className="flex items-center gap-1.5 mb-1">{f.icon}<span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{f.label}</span></div>
                      <p className={`text-sm font-medium ${f.value ? 'text-slate-800' : 'text-slate-300 italic'}`}>{f.value || 'Not specified'}</p>
                    </div>
                  ))}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1"><Phone size={14} className="text-emerald-500" /><span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Emergency Contact</span></div>
                    {summary?.emergencyContact ? (() => {
                      const { name, phone } = parseEmergencyContact(summary.emergencyContact);
                      const hasPhone = phone.length >= 5;
                      const phoneLabel = phone.length === 10 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
                      if (!name && !hasPhone) return <p className="text-sm font-medium text-slate-300 italic">Not specified</p>;
                      return (
                        <div className="flex items-center gap-1.5 min-w-0">
                          {name && <span className="text-sm font-semibold text-slate-800 truncate min-w-0">{name}</span>}
                          {name && hasPhone && <span className="text-slate-300 shrink-0">—</span>}
                          {hasPhone && (
                            <a href={`tel:+91${phone}`} onClick={e => e.stopPropagation()}
                              className="inline-flex items-center text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md tabular-nums shrink-0 hover:bg-indigo-100 transition-colors">
                              {phoneLabel}
                            </a>
                          )}
                        </div>
                      );
                    })() : (
                      <p className="text-sm font-medium text-slate-300 italic">Not specified</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1"><ClipboardList size={14} className="text-indigo-400" /><span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Health Remarks</span></div>
                    <p className={`text-sm font-medium ${summary?.healthRemarks ? 'text-slate-800' : 'text-slate-300 italic'}`}>{summary?.healthRemarks || 'Not specified'}</p>
                  </div>
                  {!summary && <button onClick={openSummaryEdit} className="w-full mt-2 border-2 border-dashed border-slate-200 rounded-xl py-3 text-sm text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors font-medium">+ Add your health summary</button>}
                </div>
              </div>

              {/* Recent Records */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
                  <h2 className="font-bold text-slate-800">Recent Records</h2>
                  <span className="text-xs text-slate-400">{records.filter(r => !r.isArchived).length} total</span>
                </div>
                {recent.length === 0 && pinnedRecords.length === 0 ? <EmptyState label="records" onAdd={() => openAdd()} /> : (
                  <div className="divide-y divide-slate-50">
                    {recent.map(r => (
                      <div key={r.id} onClick={() => navigate(`/records/${r.id}`)} onContextMenu={e => openCtx(e, r)}
                        className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors group">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${fmt(r.category).bg} ${fmt(r.category).color} shrink-0`}>{fmt(r.category).icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {r.isImportant && <Star size={11} className="fill-amber-400 text-amber-400 shrink-0" />}
                            <span className="font-semibold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors truncate">{r.title}</span>
                            <RecordIdBadge recordId={r.recordId} category={r.category} />
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-slate-400">{relativeDate(r.created_at)}</p>
                            {r.tags.slice(0, 2).map(t => <TagChip key={t.id} tag={t} />)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <FileBadge mimeType={r.mimeType} />
                          {r.connectionCount > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full"><Link2 size={9} /> {r.connectionCount}</span>}
                        </div>
                        <ChevronRight size={16} className="text-slate-300 shrink-0 group-hover:text-slate-500 transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PRESCRIPTIONS */}
        {activeTab === 'prescriptions' && (
          <div>
            {Toolbar()}
            {renderPrescriptionList(prescriptions)}
          </div>
        )}

        {/* LAB REPORTS */}
        {activeTab === 'lab' && (
          <div>
            {Toolbar()}
            {renderLabReportList(labReports)}
          </div>
        )}

        {/* SCANS */}
        {activeTab === 'scans' && (
          <div>
            {Toolbar()}
            {renderScanGallery(scans)}
          </div>
        )}

        {/* COLLECTIONS */}
        {activeTab === 'collections' && CollectionsTab()}

        {/* TIMELINE */}
        {activeTab === 'timeline' && (
          <div>
            <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Timeline</h2>
                <p className="text-sm text-slate-400 mt-1">{filteredTimelineRecords.length} record{filteredTimelineRecords.length !== 1 ? 's' : ''}{timelineCategory ? ` · ${CATEGORY_META[timelineCategory].label}` : ''}</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              {TimelineRail()}
              <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                {TimelineView()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ RIGHT-CLICK CONTEXT MENU ══ */}
      {ctxMenu && (
        <ContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)}
          onView={() => navigate(`/records/${ctxMenu.record.id}`)}
          onToggleImportant={() => handleToggleImportant(ctxMenu.record.id)}
          onToggleArchive={() => handleToggleArchive(ctxMenu.record.id)}
          onDuplicate={() => handleDuplicate(ctxMenu.record.id)}
          onDelete={() => handleDelete(ctxMenu.record.id)}
          onTogglePin={() => handleTogglePin(ctxMenu.record.id)} />
      )}

      {/* ══ ADD RECORD MODAL ══ */}
      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="font-black text-slate-800 text-lg">
                  {saveSuccess ? 'Record Saved!' : addStep === 1 ? 'Select Record Type' : `New ${CATEGORY_META[selCategory]?.label}`}
                </h2>
                {!saveSuccess && !directStep2 && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {[1, 2].map(s => <div key={s} className={`h-1 rounded-full transition-all ${s === addStep ? 'w-8 bg-indigo-600' : s < addStep ? 'w-4 bg-indigo-300' : 'w-4 bg-slate-200'}`} />)}
                    <span className="text-[11px] text-slate-400 ml-1">Step {addStep} of 2</span>
                  </div>
                )}
              </div>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><X size={16} /></button>
            </div>

            <div className="px-7 py-6 overflow-y-auto">
              {/* POST SAVE SUCCESS */}
              {saveSuccess && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} className="text-emerald-600" /></div>
                  <p className="font-bold text-slate-800 mb-1">{saveSuccess.title}</p>
                  <RecordIdBadge recordId={saveSuccess.recordId} category={saveSuccess.category} />
                  <p className="text-sm text-slate-400 mt-3 mb-6">Record saved successfully.</p>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => { setShowAdd(false); navigate(`/records/${saveSuccess.id}`); }} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all">View Record</button>
                    <button onClick={() => { setSaveSuccess(null); setAddStep(1); setFTitle(''); setFDoctor(''); setFSpec(''); setFHospital(''); setFDate(''); setFNotes(''); setFVisibility('private'); setFEmergencyAccess(false); setFTags([]); setFFile(null); }} className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">Add Another</button>
                    <button onClick={() => setShowAdd(false)} className="text-sm text-slate-400 hover:text-slate-600 py-1 transition-colors">Return to Records</button>
                  </div>
                </div>
              )}

              {/* STEP 1 */}
              {!saveSuccess && addStep === 1 && (
                <div className="space-y-3">
                  {(Object.entries(CATEGORY_META) as [CategoryType, typeof CATEGORY_META[string]][]).map(([key, meta]) => (
                    <button key={key} onClick={() => { setSelCategory(key); setAddStep(2); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left hover:shadow-sm ${selCategory === key ? `${meta.bg} border-current ${meta.color}` : 'border-slate-100 hover:border-slate-200'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.bg} ${meta.color}`}><span className="scale-125">{meta.icon}</span></div>
                      <div><p className="font-bold text-slate-800 text-sm">{meta.label}</p><p className="text-xs text-slate-400 mt-0.5">{meta.prefix}-XXXXX</p></div>
                      <ChevronRight size={16} className="ml-auto text-slate-300" />
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 2 */}
              {!saveSuccess && addStep === 2 && (
                <div className="space-y-4">
                  {!directStep2 && <button onClick={() => setAddStep(1)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors mb-2"><ArrowLeft size={13} /> Back to type selection</button>}

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Title <span className="text-rose-500">*</span></label>
                    <input type="text" value={fTitle} onChange={e => setFTitle(e.target.value)}
                      placeholder={`e.g., ${selCategory === 'prescription' ? 'Diabetes Follow-up' : selCategory === 'lab' ? 'CBC Blood Panel' : 'Chest X-Ray'}`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" autoFocus />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Doctor Name</label>
                      <input type="text" value={fDoctor} onChange={e => setFDoctor(e.target.value)} placeholder="Dr. Rajesh Kumar" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Specialization</label>
                      <input type="text" value={fSpec} onChange={e => setFSpec(e.target.value)} placeholder="Cardiology" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Hospital / Clinic</label>
                      <input type="text" value={fHospital} onChange={e => setFHospital(e.target.value)} placeholder="Apollo Hospital" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Visit Date</label>
                      <DateField value={fDate} onChange={setFDate} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Personal Notes</label>
                    <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} rows={2} placeholder="Doctor's advice, follow-up reminders, personal context…"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Tags</label>
                    <TagInput value={fTags} onChange={setFTags} allTags={allTags} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Access</label>
                      <select value={fVisibility} onChange={e => setFVisibility(e.target.value as typeof fVisibility)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                        <option value="private">🔒 Private — only you</option>
                        <option value="shared">🌐 Shared with Doctor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Emergency Access</label>
                      <select value={fEmergencyAccess ? 'yes' : 'no'} onChange={e => setFEmergencyAccess(e.target.value === 'yes')}
                        className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${fEmergencyAccess ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        <option value="no">No</option>
                        <option value="yes">🚨 Yes</option>
                      </select>
                    </div>
                  </div>
                  {fEmergencyAccess && (
                    <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg -mt-2">
                      Visible to the treating hospital during a medical emergency, regardless of the access setting above.
                    </p>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Attach File <span className="text-slate-400 font-normal">(PDF or image, max 5MB)</span></label>
                    <input type="file" ref={fileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed transition-all ${fFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-indigo-400 bg-slate-50'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${fFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><Upload size={15} /></div>
                      <span className={`text-sm font-medium truncate ${fFile ? 'text-emerald-700' : 'text-slate-400'}`}>{fFile ? fFile.name : 'Click to upload file'}</span>
                      {fFile && <X size={14} className="ml-auto text-slate-400 shrink-0" onClick={e => { e.stopPropagation(); setFFile(null); }} />}
                    </button>
                  </div>

                  {isSubmitting && uploadProgress > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5"><span>Uploading...</span><span>{uploadProgress}%</span></div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} /></div>
                    </div>
                  )}

                  {addError && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg font-medium">{addError}</p>}

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={handleSubmitRecord} disabled={isSubmitting || !fTitle.trim()}
                      className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-sm transition-all shadow-md shadow-indigo-100 disabled:shadow-none">
                      {isSubmitting ? 'Saving...' : 'Save Record'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ PATIENT SUMMARY EDIT MODAL ══ */}
      {showSummaryEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
              <h2 className="font-black text-slate-800 text-lg">Edit Patient Summary</h2>
              <button onClick={() => setShowSummaryEdit(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"><X size={16} /></button>
            </div>
            <div className="px-7 py-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Blood Group</label>
                <select value={sBlood} onChange={e => setSBlood(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              {[
                { label: 'Known Conditions', val: sConditions, set: setSConditions, placeholder: 'e.g. Hypertension, Diabetes Type 2' },
                { label: 'Allergies', val: sAllergies, set: setSAllergies, placeholder: 'e.g. Penicillin, Dust mites' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{f.label}</label>
                  <input type="text" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Emergency Contact</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={sEmergencyName} onChange={e => setSEmergencyName(e.target.value)} placeholder="Contact name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">+91</span>
                    <input type="tel" inputMode="numeric" value={sEmergencyPhone}
                      onChange={e => setSEmergencyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="98765 43210" maxLength={10}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">Who to contact and their phone number in a medical emergency.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Health Remarks</label>
                <textarea value={sRemarks} onChange={e => setSRemarks(e.target.value)} rows={3}
                  placeholder="Any other health details, lifestyle notes, current medications, implants, etc."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none" />
              </div>
              {summaryError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg font-medium">{summaryError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSummaryEdit(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleSaveSummary} disabled={isSavingSummary} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm transition-all shadow-md shadow-indigo-100">
                  {isSavingSummary ? 'Saving...' : 'Save Summary'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
