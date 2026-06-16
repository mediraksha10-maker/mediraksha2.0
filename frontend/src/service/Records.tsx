import React, { useState, useEffect, useRef, useMemo, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  ArrowLeft, Plus, FileText, FlaskConical, ScanLine, LayoutDashboard,
  Stethoscope, Pencil, X, Upload, ChevronRight, Droplets,
  AlertCircle, Phone, ClipboardList, Trash2, Link2, Search,
  SlidersHorizontal, ArrowUpDown, LayoutGrid, List, Star, Archive,
  Copy, Eye, Clock, CheckCircle2, FileImage, FileArchive, ChevronDown,
  CalendarDays, Pin, Tag, Hash,
  Layers
} from 'lucide-react';
import { useNavigate } from 'react-router';
import api from '../api/Api';

/* ─── Types ─── */
interface Tag { id: number; name: string; color: string; usageCount?: number; }
interface CollectionRef { id: number; name: string; }
interface RecentRecord { category: string; title: string; visitDate: string | null; }
interface Collection {
  id: number; name: string; description: string | null;
  recordCount: number; prescriptionCount: number; labCount: number;
  scanCount: number; importantCount: number;
  created_at: string; updated_at: string;
  recentRecords: RecentRecord[];
  records?: CollectionRecord[];
}
interface CollectionRecord { id: number; recordId: string; title: string; category: string; doctorName: string | null; visitDate: string | null; created_at: string; isImportant: boolean; isPinned: boolean; originalFileName: string | null; mimeType: string | null; }

interface Report {
  id: number; recordId: string; title: string;
  category: 'prescription' | 'lab' | 'scan' | 'discharge' | 'other';
  doctorName: string | null; specialization: string | null; hospital: string | null;
  visitDate: string | null; notes: string | null; visibility: string;
  originalFileName: string | null; mimeType: string | null; fileSize: number | null;
  created_at: string; updated_at: string; connectionCount: number;
  isImportant: boolean; isArchived: boolean; isPinned: boolean;
  tags: Tag[]; collections: CollectionRef[];
}

interface PatientSummary { bloodGroup: string | null; knownConditions: string | null; allergies: string | null; emergencyContact: string | null; healthRemarks: string | null; }

type Tab = 'overview' | 'prescriptions' | 'lab' | 'scans' | 'collections' | 'timeline';
type CategoryType = 'prescription' | 'lab' | 'scan' | 'discharge' | 'other';
type SortKey = 'created_at' | 'visitDate' | 'title';
type ViewMode = 'list' | 'grid';

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
  const fileRef = useRef<HTMLInputElement>(null);

  const [records, setRecords] = useState<Report[]>([]);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem('recordsView') as ViewMode) || 'list');

  const [searchQ, setSearchQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
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
  const [fVisibility, setFVisibility] = useState<'private' | 'shared' | 'emergency'>('private');
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
  const [sEmergency, setSEmergency] = useState('');
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

  const setView = (v: ViewMode) => { setViewMode(v); localStorage.setItem('recordsView', v); };

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
    if (filterCategory) list = list.filter(r => r.category === filterCategory);
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
  }, [records, searchQ, filterCategory, filterTag, filterDoctor, filterHospital, filterDateFrom, filterDateTo, showArchived, sortKey, sortDesc]);

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

  const openAdd = (defaultCat?: CategoryType) => {
    if (defaultCat) { setSelCategory(defaultCat); setAddStep(2); setDirectStep2(true); }
    else { setAddStep(1); setDirectStep2(false); }
    setFTitle(''); setFDoctor(''); setFSpec(''); setFHospital('');
    setFDate(''); setFNotes(''); setFVisibility('private'); setFTags([]); setFFile(null);
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
    setSAllergies(summary?.allergies || ''); setSEmergency(summary?.emergencyContact || '');
    setSRemarks(summary?.healthRemarks || '');
    setSummaryError('');
    setShowSummaryEdit(true);
  };

  const handleSaveSummary = async () => {
    setIsSavingSummary(true);
    setSummaryError('');
    try {
      const res = await api.post('/user/records/summary', { bloodGroup: sBlood, knownConditions: sConditions, allergies: sAllergies, emergencyContact: sEmergency, healthRemarks: sRemarks });
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
        navigate(`/collections/${res.data.data.id}`);
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

  const activeFiltersCount = [filterCategory, filterTag, filterDoctor, filterHospital, filterDateFrom, filterDateTo, showArchived ? 'x' : ''].filter(Boolean).length;

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Search by title, doctor, tag, notes…"
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
          {searchQ && <button onClick={() => setSearchQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
        </div>
        <button onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${showFilters || activeFiltersCount > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
          <SlidersHorizontal size={15} /> Filters
          {activeFiltersCount > 0 && <span className="bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{activeFiltersCount}</span>}
        </button>
        <div ref={sortRef} className="relative">
          <button onClick={() => setShowSortMenu(v => !v)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:border-slate-300 transition-all">
            <ArrowUpDown size={15} /> Sort <ChevronDown size={13} className="text-slate-400" />
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-11 w-48 bg-white rounded-xl border border-slate-100 shadow-xl z-30 p-1">
              {([['created_at', 'Upload Date'], ['visitDate', 'Visit Date'], ['title', 'Title']] as [SortKey, string][]).map(([k, l]) => (
                <button key={k} onClick={() => { if (sortKey === k) setSortDesc(v => !v); else { setSortKey(k); setSortDesc(true); } setShowSortMenu(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${sortKey === k ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
                  {l} {sortKey === k && <span className="text-xs">{sortDesc ? '↓' : '↑'}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden">
          <button onClick={() => setView('list')} className={`px-3 py-2.5 transition-colors ${viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><List size={15} /></button>
          <button onClick={() => setView('grid')} className={`px-3 py-2.5 transition-colors ${viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutGrid size={15} /></button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Type</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All</option>
              {Object.entries(CATEGORY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tag</label>
            <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All</option>
              {allTags.map(t => <option key={t.id} value={t.name}>#{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Doctor</label>
            <input value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)} placeholder="Filter by doctor" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Hospital</label>
            <input value={filterHospital} onChange={e => setFilterHospital(e.target.value)} placeholder="Filter by hospital" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">From</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">To</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="flex flex-col justify-between">
            <label className="flex items-center gap-2 cursor-pointer mt-5">
              <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} className="rounded" />
              <span className="text-sm text-slate-600 font-medium">Show archived</span>
            </label>
            <button onClick={() => { setFilterCategory(''); setFilterTag(''); setFilterDoctor(''); setFilterHospital(''); setFilterDateFrom(''); setFilterDateTo(''); setShowArchived(false); }} className="text-xs text-indigo-600 hover:underline font-semibold mt-2">Clear all</button>
          </div>
        </div>
      )}
    </div>
  );

  /* ─── Grid card ─── */
  const GridCard = ({ r }: { r: Report }) => (
    <div onClick={() => navigate(`/records/${r.id}`)} onContextMenu={e => openCtx(e, r)}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${fmt(r.category).bg} ${fmt(r.category).color} shrink-0`}>{fmt(r.category).icon}</div>
        <div className="flex items-center gap-1">
          {r.isPinned && <Pin size={12} className="fill-indigo-400 text-indigo-400" />}
          {r.isImportant && <Star size={12} className="fill-amber-400 text-amber-400" />}
        </div>
      </div>
      <div>
        <RecordIdBadge recordId={r.recordId} category={r.category} />
        <p className="font-bold text-slate-800 text-sm mt-2 group-hover:text-indigo-600 transition-colors line-clamp-2">{r.title}</p>
        {r.doctorName && <p className="text-xs text-slate-500 mt-1 truncate">{r.doctorName}</p>}
        {r.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {r.tags.slice(0, 3).map(t => <TagChip key={t.id} tag={t} />)}
            {r.tags.length > 3 && <span className="text-[10px] text-slate-400 font-medium self-center">+{r.tags.length - 3}</span>}
          </div>
        )}
      </div>
      <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-slate-400">{relativeDate(r.created_at)}</span>
        <div className="flex items-center gap-1.5">
          <FileBadge mimeType={r.mimeType} />
          {r.connectionCount > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full"><Link2 size={9} /> {r.connectionCount}</span>}
          {r.collections.length > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full"><Layers size={9} /> {r.collections.length}</span>}
          {r.isArchived && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Archived</span>}
        </div>
      </div>
    </div>
  );

  /* ─── List table renderer ─── */
  const renderTable = (rows: Report[], emptyLabel: string, cat: CategoryType) => {
    if (!rows.length) return <EmptyState label={emptyLabel} onAdd={() => openAdd(cat)} />;
    if (viewMode === 'grid') return (
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map(r => <GridCard key={r.id} r={r} />)}
      </div>
    );
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {['Record ID', 'Date', 'Title', 'Doctor', 'Tags', 'Labels'].map(h => (
                <th key={h} className="py-3.5 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(r => (
              <tr key={r.id} onClick={() => navigate(`/records/${r.id}`)} onContextMenu={e => openCtx(e, r)}
                className="hover:bg-slate-50 transition-colors cursor-pointer group">
                <td className="py-4 px-5"><RecordIdBadge recordId={r.recordId} category={r.category} /></td>
                <td className="py-4 px-5 text-sm text-slate-600 whitespace-nowrap">
                  {r.visitDate ? new Date(r.visitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-slate-300">—</span>}
                </td>
                <td className="py-4 px-5">
                  <div className="flex items-center gap-2">
                    {r.isPinned && <Pin size={12} className="fill-indigo-400 text-indigo-400 shrink-0" />}
                    {r.isImportant && <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />}
                    <span className="font-semibold text-sm text-slate-800 group-hover:text-indigo-600 transition-colors">{r.title}</span>
                  </div>
                </td>
                <td className="py-4 px-5 text-sm text-slate-600">{r.doctorName || <span className="text-slate-300">—</span>}</td>
                <td className="py-4 px-5">
                  <div className="flex items-center gap-1 flex-wrap">
                    {r.tags.slice(0, 2).map(t => <TagChip key={t.id} tag={t} />)}
                    {r.tags.length > 2 && <span className="text-[10px] text-slate-400 font-medium">+{r.tags.length - 2}</span>}
                    {r.tags.length === 0 && <span className="text-slate-300 text-xs">—</span>}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <FileBadge mimeType={r.mimeType} />
                    {r.connectionCount > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full"><Link2 size={9} /> {r.connectionCount}</span>}
                    {r.collections.length > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full"><Layers size={9} /> {r.collections.length}</span>}
                    {r.isArchived && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Archived</span>}
                    <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-500 transition-colors ml-1" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /* ─── Timeline ─── */
  const TimelineView = () => {
    if (!timelineRecords.length) return <EmptyState label="records" onAdd={() => openAdd()} />;
    let lastYear = '';
    return (
      <div className="relative pl-8">
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200 rounded-full" />
        {timelineRecords.map(r => {
          const date = r.visitDate ? new Date(r.visitDate) : new Date(r.created_at);
          const year = date.getFullYear().toString();
          const showYear = year !== lastYear;
          lastYear = year;
          const m = fmt(r.category);
          return (
            <div key={r.id}>
              {showYear && (
                <div className="relative flex items-center gap-3 mb-4 mt-6 first:mt-0">
                  <div className="absolute -left-8 w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center"><CalendarDays size={12} className="text-white" /></div>
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">{year}</span>
                </div>
              )}
              <div className="relative flex items-start gap-4 mb-4 group">
                <div className={`absolute -left-8 mt-1 w-6 h-6 rounded-full border-2 border-white shadow flex items-center justify-center ${m.bg} ${m.color}`}>{m.icon}</div>
                <div onClick={() => navigate(`/records/${r.id}`)} onContextMenu={e => openCtx(e, r)}
                  className="flex-1 bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-all cursor-pointer hover:border-indigo-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <RecordIdBadge recordId={r.recordId} category={r.category} />
                        {r.isPinned && <Pin size={11} className="fill-indigo-400 text-indigo-400" />}
                        {r.isImportant && <Star size={11} className="fill-amber-400 text-amber-400" />}
                        <FileBadge mimeType={r.mimeType} />
                      </div>
                      <p className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{r.title}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
                        {r.doctorName && <span>{r.doctorName}{r.specialization ? ` · ${r.specialization}` : ''}</span>}
                        {r.hospital && <span>{r.hospital}</span>}
                        <span>{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {r.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{r.tags.map(t => <TagChip key={t.id} tag={t} />)}</div>}
                    </div>
                    <ChevronRight size={16} className="text-slate-300 shrink-0 mt-1 group-hover:text-slate-500 transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ─── Collections tab ─── */
  const JOURNEY_CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    prescription: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', icon: <Stethoscope size={11} /> },
    lab:          { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: <FlaskConical size={11} /> },
    scan:         { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', icon: <ScanLine size={11} /> },
    discharge:    { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: <ChevronDown size={11} /> },
    other:        { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', icon: <FileText size={11} /> },
  };

  const CollectionsTab = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {collections.length} medical journey{collections.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowNewCol(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-100">
          <Plus size={15} /> New Journey
        </button>
      </div>

      {/* Create form */}
      {showNewCol && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Create Medical Journey</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Name <span className="text-rose-500">*</span></label>
              <input
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                placeholder="e.g. My Diabetes Journey, Knee Surgery 2026"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Description</label>
              <input
                value={newColDesc}
                onChange={e => setNewColDesc(e.target.value)}
                placeholder="What health episode does this track?"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowNewCol(false); setNewColName(''); setNewColDesc(''); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!newColName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm transition-all">
                Create & Open
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {collections.length === 0 && !showNewCol && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center mb-5">
            <Layers size={30} className="text-indigo-300" />
          </div>
          <p className="font-black text-slate-700 text-xl mb-2">No medical journeys yet</p>
          <p className="text-sm text-slate-400 mb-6 max-w-xs">
            Group your records into journeys like "Knee Surgery 2026" or "Diabetes Management" to see your health history as a timeline.
          </p>
          <button
            onClick={() => setShowNewCol(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-100">
            <Plus size={16} /> New Journey
          </button>
        </div>
      )}

      {/* Journey Cards */}
      <div className="grid gap-4">
        {collections.map(col => {
          const startDate = col.created_at
            ? new Date(col.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
            : null;
          const lastDate = col.updated_at
            ? new Date(col.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;

          return (
            <div
              key={col.id}
              onClick={() => navigate(`/collections/${col.id}`)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group overflow-hidden"
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-100">
                    <Layers size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-base group-hover:text-indigo-700 transition-colors truncate">
                      {col.name}
                    </p>
                    {col.description && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{col.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteCollection(col.id); }}
                      className="w-7 h-7 rounded-lg text-slate-200 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={13} />
                    </button>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>

                {/* Stats badges */}
                {col.recordCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <span className="inline-flex items-center gap-1 bg-slate-100 rounded-full px-2.5 py-1 text-[11px] font-bold text-slate-600">
                      <Layers size={10} /> {col.recordCount} records
                    </span>
                    {col.prescriptionCount > 0 && (
                      <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                        <Stethoscope size={10} /> {col.prescriptionCount}
                      </span>
                    )}
                    {col.labCount > 0 && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                        <FlaskConical size={10} /> {col.labCount}
                      </span>
                    )}
                    {col.scanCount > 0 && (
                      <span className="inline-flex items-center gap-1 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-1 text-[11px] font-bold text-violet-700">
                        <ScanLine size={10} /> {col.scanCount}
                      </span>
                    )}
                    {col.importantCount > 0 && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 text-[11px] font-bold text-amber-700">
                        <Star size={10} className="fill-amber-400" /> {col.importantCount}
                      </span>
                    )}
                  </div>
                )}

                {/* Mini timeline preview */}
                {col.recentRecords?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Recent Activity</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {col.recentRecords.map((r, i) => {
                        const c = JOURNEY_CATEGORY_COLORS[r.category] || JOURNEY_CATEGORY_COLORS.other;
                        return (
                          <React.Fragment key={i}>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                              {c.icon}
                              <span className="max-w-[100px] truncate">{fmt(r.category).label}</span>
                            </span>
                            {i < col.recentRecords.length - 1 && (
                              <ChevronRight size={10} className="text-slate-300 shrink-0" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer: dates */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-50">
                  {startDate && <span>Started {startDate}</span>}
                  {lastDate && <span>Last updated {lastDate}</span>}
                </div>
              </div>

              {/* Empty state inside card */}
              {col.recordCount === 0 && (
                <div className="px-5 pb-4">
                  <div className="bg-slate-50 rounded-xl px-4 py-3 text-center">
                    <p className="text-xs text-slate-400">No records yet — click to open and add records</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

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
          <button onClick={() => openAdd()} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100 active:scale-95">
            <Plus size={16} /> Add Record
          </button>
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
                  {[
                    { label: 'Blood Group', value: summary?.bloodGroup, icon: <Droplets size={14} className="text-rose-500" /> },
                    { label: 'Known Conditions', value: summary?.knownConditions, icon: <AlertCircle size={14} className="text-amber-500" /> },
                    { label: 'Allergies', value: summary?.allergies, icon: <AlertCircle size={14} className="text-orange-500" /> },
                    { label: 'Emergency Contact', value: summary?.emergencyContact, icon: <Phone size={14} className="text-emerald-500" /> },
                    { label: 'Health Remarks', value: summary?.healthRemarks, icon: <ClipboardList size={14} className="text-indigo-400" /> },
                  ].map(f => (
                    <div key={f.label}>
                      <div className="flex items-center gap-1.5 mb-1">{f.icon}<span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{f.label}</span></div>
                      <p className={`text-sm font-medium ${f.value ? 'text-slate-800' : 'text-slate-300 italic'}`}>{f.value || 'Not specified'}</p>
                    </div>
                  ))}
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
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2"><div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600"><Stethoscope size={16} /></div><h2 className="font-bold text-slate-800">Prescriptions</h2></div>
              <button onClick={() => openAdd('prescription')} className="flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-colors"><Plus size={15} /> Add</button>
            </div>
            <div className="px-6 pt-4"><Toolbar /></div>
            {renderTable(prescriptions, 'Prescriptions', 'prescription')}
          </div>
        )}

        {/* LAB REPORTS */}
        {activeTab === 'lab' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2"><div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600"><FlaskConical size={16} /></div><h2 className="font-bold text-slate-800">Lab Reports</h2></div>
              <button onClick={() => openAdd('lab')} className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-2 rounded-xl transition-colors"><Plus size={15} /> Add</button>
            </div>
            <div className="px-6 pt-4"><Toolbar /></div>
            {renderTable(labReports, 'Lab Reports', 'lab')}
          </div>
        )}

        {/* SCANS */}
        {activeTab === 'scans' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2"><div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center text-violet-600"><ScanLine size={16} /></div><h2 className="font-bold text-slate-800">Scans & Imaging</h2></div>
              <button onClick={() => openAdd('scan')} className="flex items-center gap-1.5 text-sm font-bold text-violet-600 hover:bg-violet-50 px-3 py-2 rounded-xl transition-colors"><Plus size={15} /> Add</button>
            </div>
            <div className="px-6 pt-4"><Toolbar /></div>
            {renderTable(scans, 'Scans', 'scan')}
          </div>
        )}

        {/* COLLECTIONS */}
        {activeTab === 'collections' && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center text-violet-600"><Layers size={16} /></div>
              <h2 className="font-bold text-slate-800 text-lg">Collections</h2>
            </div>
            <CollectionsTab />
          </div>
        )}

        {/* TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2"><div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600"><Clock size={16} /></div><h2 className="font-bold text-slate-800">Medical Timeline</h2></div>
              <span className="text-xs text-slate-400">{timelineRecords.length} records</span>
            </div>
            <div className="p-6"><TimelineView /></div>
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
                    <button onClick={() => { setSaveSuccess(null); setAddStep(1); setFTitle(''); setFDoctor(''); setFSpec(''); setFHospital(''); setFDate(''); setFNotes(''); setFVisibility('private'); setFTags([]); setFFile(null); }} className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">Add Another</button>
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
                      <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
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

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Visibility</label>
                    <select value={fVisibility} onChange={e => setFVisibility(e.target.value as typeof fVisibility)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                      <option value="private">🔒 Private — only you</option>
                      <option value="shared">🌐 Shared — with doctors</option>
                      <option value="emergency">🚨 Emergency Access</option>
                    </select>
                  </div>

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
              {[
                { label: 'Blood Group', val: sBlood, set: setSBlood, placeholder: 'e.g. A+, B-, O+' },
                { label: 'Known Conditions', val: sConditions, set: setSConditions, placeholder: 'e.g. Hypertension, Diabetes Type 2' },
                { label: 'Allergies', val: sAllergies, set: setSAllergies, placeholder: 'e.g. Penicillin, Dust mites' },
                { label: 'Emergency Contact', val: sEmergency, set: setSEmergency, placeholder: 'Name — +91 XXXXX XXXXX' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{f.label}</label>
                  <input type="text" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                </div>
              ))}
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
