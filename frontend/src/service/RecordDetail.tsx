import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, FileText, FlaskConical, ScanLine, Stethoscope, ClipboardList,
  Calendar, Building2, User, Link2, Plus, X, Search, Download,
  Eye, EyeOff, Clock, Pencil, ExternalLink, Star, Archive,
  FileImage, FileArchive, Pin, Hash,
  AlertCircle, FolderOpen, Check
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import api from '../api/Api';

/* ─── Types ─── */
interface RecordTag { id: number; name: string; color: string; }
interface CollectionRef { id: number; name: string; }
interface CollectionSummary { id: number; name: string; description: string | null; recordCount: number; }

interface Report {
  id: number;
  recordId: string;
  title: string;
  category: string;
  doctorName: string | null;
  specialization: string | null;
  hospital: string | null;
  visitDate: string | null;
  notes: string | null;
  visibility: string;
  originalFileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  fileData?: string;
  created_at: string;
  updated_at: string;
  connectionCount: number;
  isImportant: boolean;
  isArchived: boolean;
  isPinned: boolean;
  tags: RecordTag[];
  collections: CollectionRef[];
}

interface ConnectedRecord {
  id: number;
  recordId: string;
  title: string;
  category: string;
  doctorName: string | null;
  visitDate: string | null;
  created_at: string;
}

interface SearchResult {
  id: number;
  recordId: string;
  title: string;
  category: string;
  doctorName: string | null;
  visitDate: string | null;
  created_at: string;
}

/* ─── Constants ─── */
const TAG_COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  indigo:  { bg: 'bg-indigo-100',  text: 'text-indigo-700',  border: 'border-indigo-300',  dot: 'bg-indigo-500'  },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  violet:  { bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-300',  dot: 'bg-violet-500'  },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300',   dot: 'bg-amber-500'   },
  rose:    { bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-300',    dot: 'bg-rose-500'    },
  sky:     { bg: 'bg-sky-100',     text: 'text-sky-700',     border: 'border-sky-300',     dot: 'bg-sky-500'     },
  teal:    { bg: 'bg-teal-100',    text: 'text-teal-700',    border: 'border-teal-300',    dot: 'bg-teal-500'    },
  orange:  { bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-300',  dot: 'bg-orange-500'  },
  pink:    { bg: 'bg-pink-100',    text: 'text-pink-700',    border: 'border-pink-300',    dot: 'bg-pink-500'    },
  lime:    { bg: 'bg-lime-100',    text: 'text-lime-700',    border: 'border-lime-300',    dot: 'bg-lime-500'    },
};
const DEFAULT_TAG_C = { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', dot: 'bg-slate-400' };

const VIS_META: Record<string, { label: string; cls: string }> = {
  private:   { label: 'Private',          cls: 'bg-slate-100 text-slate-600 border-slate-300' },
  shared:    { label: 'Shared',           cls: 'bg-blue-50 text-blue-700 border-blue-200'     },
  emergency: { label: 'Emergency Access', cls: 'bg-rose-50 text-rose-700 border-rose-200'     },
};

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  prescription: { label: 'Prescription',     color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200', icon: <Stethoscope size={14} /> },
  lab:          { label: 'Lab Report',        color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <FlaskConical size={14} /> },
  scan:         { label: 'Scan / Imaging',    color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200', icon: <ScanLine size={14} /> },
  discharge:    { label: 'Discharge Summary', color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',  icon: <ClipboardList size={14} /> },
  other:        { label: 'Other',             color: 'text-slate-600',   bg: 'bg-slate-100',  border: 'border-slate-200',  icon: <FileText size={14} /> },
};

const fmt = (cat: string) => CATEGORY_META[cat] || CATEGORY_META.other;

/* ─── Helpers ─── */
const detailDate = (ts: string): string => {
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    + ' • '
    + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
    + ' IST';
};

const visitFmt = (ds: string): string =>
  new Date(ds).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

const relativeDate = (ts: string): string => {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return 'Just now';
  if (hrs < 1) return `${mins} minutes ago`;
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fileSizeFmt = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const base64ToObjectUrl = (base64: string, mimeType: string): string => {
  const bytes = atob(base64);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return URL.createObjectURL(new Blob([buf], { type: mimeType }));
};

const fileBadge = (mimeType: string | null) => {
  if (!mimeType) return null;
  if (mimeType === 'application/pdf') return { label: 'PDF', cls: 'bg-rose-50 text-rose-600 border-rose-200', icon: <FileArchive size={11} /> };
  if (mimeType.startsWith('image/')) {
    const ext = mimeType.split('/')[1].toUpperCase();
    return { label: ext, cls: 'bg-sky-50 text-sky-600 border-sky-200', icon: <FileImage size={11} /> };
  }
  return { label: 'FILE', cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: <FileText size={11} /> };
};

/* ─── Tag Chip ─── */
function TagChip({ tag, onRemove }: { tag: RecordTag; onRemove?: () => void }) {
  const c = TAG_COLOR_MAP[tag.color] || DEFAULT_TAG_C;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <Hash size={9} />
      {tag.name}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:opacity-60 transition-opacity">
          <X size={9} />
        </button>
      )}
    </span>
  );
}

/* ─── Tag Input ─── */
function TagInput({ tags, allTags, onAdd, onRemove }: {
  tags: RecordTag[];
  allTags: RecordTag[];
  onAdd: (name: string) => void;
  onRemove: (tagId: number) => void;
}) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);

  const existingIds = new Set(tags.map(t => t.id));
  const trimmed = input.trim();
  const filtered = allTags.filter(
    t => !existingIds.has(t.id) && t.name.toLowerCase().includes(trimmed.toLowerCase())
  );
  const showCreate = trimmed.length > 0 && !allTags.find(t => t.name.toLowerCase() === trimmed.toLowerCase());

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map(t => (
        <TagChip key={t.id} tag={t} onRemove={() => onRemove(t.id)} />
      ))}
      <div className="relative">
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onKeyDown={e => {
            if (e.key === 'Enter' && trimmed) { onAdd(trimmed); setInput(''); setOpen(false); }
            if (e.key === 'Escape') setOpen(false);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={tags.length === 0 ? '+ Add tag' : '+'}
          className="text-xs bg-transparent border border-dashed border-slate-300 rounded-full px-3 py-1 focus:outline-none focus:border-indigo-400 focus:bg-indigo-50/50 transition-all placeholder:text-slate-400 w-20 focus:w-32"
        />
        {open && (filtered.length > 0 || showCreate) && (
          <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden py-1">
            {filtered.slice(0, 6).map(t => {
              const c = TAG_COLOR_MAP[t.color] || DEFAULT_TAG_C;
              return (
                <button
                  key={t.id}
                  onMouseDown={() => { onAdd(t.name); setInput(''); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left"
                >
                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
                  <span className="text-xs text-slate-700 truncate">#{t.name}</span>
                </button>
              );
            })}
            {showCreate && (
              <button
                onMouseDown={() => { onAdd(trimmed); setInput(''); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 text-left border-t border-slate-100"
              >
                <Plus size={11} className="text-indigo-600 shrink-0" />
                <span className="text-xs text-indigo-600 font-medium truncate">Create "#{trimmed}"</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Connection Chip ─── */
function ConnectionChip({ record, onRemove, onClick }: { record: ConnectedRecord; onRemove: () => void; onClick: () => void }) {
  const m = fmt(record.category);
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${m.bg} ${m.border} group`}>
      <button onClick={onClick} className={`flex items-center gap-1.5 ${m.color}`}>
        <span className="shrink-0">{m.icon}</span>
        <span className="font-mono text-xs font-bold">{record.recordId}</span>
        <span className="text-xs font-medium max-w-28 truncate">{record.title}</span>
      </button>
      <button
        onClick={onRemove}
        className={`w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${m.color} hover:bg-white/60`}
      >
        <X size={10} />
      </button>
    </div>
  );
}

/* ─── Search Result Row ─── */
function SearchRow({ r, onSelect, alreadyLinked }: { r: SearchResult; onSelect: () => void; alreadyLinked: boolean }) {
  const m = fmt(r.category);
  return (
    <button
      onClick={onSelect}
      disabled={alreadyLinked}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${alreadyLinked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${m.bg} ${m.border} ${m.color}`}>
        {m.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-mono text-xs font-bold ${m.color}`}>{r.recordId}</span>
          <span className="font-semibold text-sm text-slate-800 truncate">{r.title}</span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {r.doctorName && `Dr. ${r.doctorName}`}
          {r.doctorName && r.visitDate && ' · '}
          {r.visitDate && visitFmt(r.visitDate)}
          {!r.doctorName && !r.visitDate && relativeDate(r.created_at)}
        </p>
      </div>
      {alreadyLinked ? (
        <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">Linked</span>
      ) : (
        <Plus size={14} className="text-indigo-600 shrink-0" />
      )}
    </button>
  );
}

/* ─── Main Component ─── */
export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<Report | null>(null);
  const [connections, setConnections] = useState<ConnectedRecord[]>([]);
  const [allTags, setAllTags] = useState<RecordTag[]>([]);
  const [allCollections, setAllCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  /* file preview */
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'other' | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  /* notes editing */
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState('');

  /* collections dropdown */
  const [showAddToCol, setShowAddToCol] = useState(false);

  /* connect modal */
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [rRes, cRes, tRes, colRes] = await Promise.all([
          api.get(`/user/records/${id}`),
          api.get(`/user/records/${id}/connections`),
          api.get('/user/tags'),
          api.get('/user/collections'),
        ]);
        if (rRes.data?.success) {
          const r = rRes.data.data;
          setRecord({ ...r, tags: r.tags || [], collections: r.collections || [], isPinned: r.isPinned ?? false });
        }
        if (cRes.data?.success) setConnections(cRes.data.data);
        if (tRes.data?.success) setAllTags(tRes.data.data);
        if (colRes.data?.success) setAllCollections(colRes.data.data);
      } catch (e: any) {
        if (e.response?.status === 401) navigate('/auth');
        else setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  /* debounced connection search */
  useEffect(() => {
    if (!showConnectModal) return;
    const t = setTimeout(async () => {
      if (!searchQuery.trim() && searchQuery !== '') return;
      setIsSearching(true);
      try {
        const res = await api.get('/user/records/search', { params: { q: searchQuery, excludeId: id } });
        if (res.data?.success) setSearchResults(res.data.data);
      } catch { /* silent */ }
      finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, showConnectModal, id]);

  /* revoke blob URL on unmount */
  useEffect(() => {
    return () => {
      if (previewSrc && previewSrc.startsWith('blob:')) URL.revokeObjectURL(previewSrc);
    };
  }, [previewSrc]);

  const openConnectModal = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowConnectModal(true);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  /* ─── File handlers ─── */
  const handleLoadPreview = async () => {
    if (previewSrc) { setShowPreview(true); return; }
    if (!record?.originalFileName) return;
    setPreviewLoading(true);
    try {
      const res = await api.get(`/user/records/${id}`);
      const r: Report = res.data.data;
      if (!r.fileData) return;
      const mime = r.mimeType || 'application/octet-stream';
      const objectUrl = base64ToObjectUrl(r.fileData, mime);
      setPreviewSrc(objectUrl);
      if (mime === 'application/pdf') setPreviewType('pdf');
      else if (mime.startsWith('image/')) setPreviewType('image');
      else setPreviewType('other');
      setShowPreview(true);
    } catch { /* silent */ }
    finally { setPreviewLoading(false); }
  };

  const handleDownload = async () => {
    if (!record) return;
    let objectUrl = previewSrc;
    let tempUrl = false;
    if (!objectUrl) {
      const res = await api.get(`/user/records/${id}`);
      const r: Report = res.data.data;
      if (!r.fileData) return;
      objectUrl = base64ToObjectUrl(r.fileData, r.mimeType || 'application/octet-stream');
      tempUrl = true;
    }
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = record.originalFileName || 'record';
    a.click();
    if (tempUrl) setTimeout(() => URL.revokeObjectURL(objectUrl!), 5000);
  };

  /* ─── Connection handlers ─── */
  const handleAddConnection = async (targetId: number) => {
    if (!id) return;
    setIsLinking(targetId);
    try {
      await api.post(`/user/records/${id}/connect/${targetId}`);
      const added = searchResults.find(r => r.id === targetId);
      if (added) {
        setConnections(prev => [...prev, added as ConnectedRecord]);
        setRecord(prev => prev ? { ...prev, connectionCount: prev.connectionCount + 1 } : prev);
      }
    } catch (e: any) {
      if (e.response?.status === 401) navigate('/auth');
    } finally {
      setIsLinking(null);
    }
  };

  const handleRemoveConnection = async (targetId: number) => {
    if (!id || !window.confirm('Remove this connection?')) return;
    try {
      await api.delete(`/user/records/${id}/connect/${targetId}`);
      setConnections(prev => prev.filter(c => c.id !== targetId));
      setRecord(prev => prev ? { ...prev, connectionCount: Math.max(0, prev.connectionCount - 1) } : prev);
    } catch (e: any) {
      if (e.response?.status === 401) navigate('/auth');
    }
  };

  /* ─── Status toggles ─── */
  const handleToggleImportant = async () => {
    if (!id) return;
    try {
      const res = await api.patch(`/user/records/${id}/important`);
      if (res.data?.success) setRecord(prev => prev ? { ...prev, isImportant: res.data.isImportant } : prev);
    } catch {}
  };

  const handleToggleArchive = async () => {
    if (!id) return;
    try {
      const res = await api.patch(`/user/records/${id}/archive`);
      if (res.data?.success) setRecord(prev => prev ? { ...prev, isArchived: res.data.isArchived } : prev);
    } catch {}
  };

  const handleTogglePin = async () => {
    if (!id) return;
    try {
      const res = await api.patch(`/user/records/${id}/pin`);
      if (res.data?.success) setRecord(prev => prev ? { ...prev, isPinned: res.data.isPinned } : prev);
    } catch {}
  };

  /* ─── Tag handlers ─── */
  const handleAddTag = async (name: string) => {
    if (!id || !name.trim()) return;
    try {
      const tagRes = await api.post('/user/tags', { name: name.trim() });
      if (!tagRes.data?.success) return;
      const tag: RecordTag = tagRes.data.data;
      if (record?.tags.find(t => t.id === tag.id)) return;
      await api.post(`/user/records/${id}/tags/${tag.id}`);
      setRecord(prev => prev ? { ...prev, tags: [...prev.tags, tag] } : prev);
      setAllTags(prev => prev.find(t => t.id === tag.id) ? prev : [...prev, tag]);
    } catch {}
  };

  const handleRemoveTag = async (tagId: number) => {
    if (!id) return;
    try {
      await api.delete(`/user/records/${id}/tags/${tagId}`);
      setRecord(prev => prev ? { ...prev, tags: prev.tags.filter(t => t.id !== tagId) } : prev);
    } catch {}
  };

  /* ─── Collection handlers ─── */
  const handleAddToCollection = async (collectionId: number) => {
    if (!id) return;
    try {
      await api.post(`/user/collections/${collectionId}/records/${id}`);
      const col = allCollections.find(c => c.id === collectionId);
      if (col) setRecord(prev => prev ? { ...prev, collections: [...prev.collections, { id: col.id, name: col.name }] } : prev);
      setShowAddToCol(false);
    } catch {}
  };

  const handleRemoveFromCollection = async (collectionId: number) => {
    if (!id) return;
    try {
      await api.delete(`/user/collections/${collectionId}/records/${id}`);
      setRecord(prev => prev ? { ...prev, collections: prev.collections.filter(c => c.id !== collectionId) } : prev);
    } catch {}
  };

  /* ─── Visibility handler ─── */
  const handleChangeVisibility = async (visibility: string) => {
    if (!id) return;
    try {
      await api.patch(`/user/records/${id}`, { visibility });
      setRecord(prev => prev ? { ...prev, visibility } : prev);
    } catch {}
  };

  /* ─── Notes handlers ─── */
  const startEditNotes = () => {
    setNotesValue(record?.notes || '');
    setNotesError('');
    setEditingNotes(true);
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    setSavingNotes(true);
    setNotesError('');
    try {
      await api.patch(`/user/records/${id}`, { notes: notesValue });
      setRecord(prev => prev ? { ...prev, notes: notesValue } : prev);
      setEditingNotes(false);
    } catch (e: any) {
      if (e.response?.status === 401) navigate('/auth');
      else setNotesError(e.response?.data?.message || 'Failed to save notes. Please try again.');
    }
    finally { setSavingNotes(false); }
  };

  const connectedIds = new Set(connections.map(c => c.id));
  const existingColIds = new Set((record?.collections || []).map(c => c.id));
  const availableCols = allCollections.filter(c => !existingColIds.has(c.id));

  /* ─── Render states ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading record...</p>
        </div>
      </div>
    );
  }

  if (notFound || !record) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-slate-700 mb-2">Record not found</p>
          <button onClick={() => navigate('/records')} className="text-indigo-600 text-sm font-semibold hover:underline">← Back to Records</button>
        </div>
      </div>
    );
  }

  const m = fmt(record.category);
  const vis = VIS_META[record.visibility] || VIS_META.private;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/records')}
            className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors text-slate-500 shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-400 min-w-0">
            <span className="hover:text-indigo-600 cursor-pointer" onClick={() => navigate('/records')}>Medical Records</span>
            <span>/</span>
            <span className={`font-mono font-bold ${m.color}`}>{record.recordId}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-7 py-6">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shrink-0 ${m.bg} ${m.border} ${m.color}`}>
                  <span className="scale-125">{m.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-2">
                    <span className={`font-mono text-sm font-black px-2.5 py-1 rounded-lg border ${m.color} ${m.bg} ${m.border}`}>
                      {record.recordId}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${m.color} ${m.bg} ${m.border}`}>
                      {m.label}
                    </span>
                    {record.isPinned && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                        <Pin size={10} className="fill-indigo-400" /> Pinned
                      </span>
                    )}
                    {record.isImportant && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Star size={10} className="fill-amber-400" /> Starred
                      </span>
                    )}
                    {record.isArchived && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                        <Archive size={10} /> Archived
                      </span>
                    )}
                    {record.connectionCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                        <Link2 size={10} /> {record.connectionCount} connection{record.connectionCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {fileBadge(record.mimeType) && (() => {
                      const b = fileBadge(record.mimeType)!;
                      return (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${b.cls}`}>
                          {b.icon} {b.label}
                        </span>
                      );
                    })()}
                  </div>
                  <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{record.title}</h1>
                  {(record.doctorName || record.specialization) && (
                    <p className="text-sm text-slate-500 mt-1">
                      {record.doctorName && `Dr. ${record.doctorName}`}
                      {record.doctorName && record.specialization && ' · '}
                      {record.specialization}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleTogglePin}
                    title={record.isPinned ? 'Unpin' : 'Pin this record'}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${record.isPinned ? 'bg-indigo-50 border-indigo-200 text-indigo-500' : 'border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-400 hover:bg-indigo-50'}`}
                  >
                    <Pin size={15} className={record.isPinned ? 'fill-indigo-400' : ''} />
                  </button>
                  <button
                    onClick={handleToggleImportant}
                    title={record.isImportant ? 'Remove star' : 'Star this record'}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${record.isImportant ? 'bg-amber-50 border-amber-200 text-amber-500' : 'border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-400 hover:bg-amber-50'}`}
                  >
                    <Star size={16} className={record.isImportant ? 'fill-amber-400' : ''} />
                  </button>
                  <button
                    onClick={handleToggleArchive}
                    title={record.isArchived ? 'Unarchive' : 'Archive this record'}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${record.isArchived ? 'bg-slate-100 border-slate-300 text-slate-600' : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Archive size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Metadata Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-7 py-6">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { label: 'Doctor', value: record.doctorName ? `Dr. ${record.doctorName}` : null, icon: <User size={15} className="text-indigo-500" /> },
                  { label: 'Specialization', value: record.specialization, icon: <Stethoscope size={15} className="text-slate-400" /> },
                  { label: 'Hospital / Clinic', value: record.hospital, icon: <Building2 size={15} className="text-slate-400" /> },
                  { label: 'Visit Date', value: record.visitDate ? visitFmt(record.visitDate) : null, icon: <Calendar size={15} className="text-slate-400" /> },
                ].map(f => (
                  <div key={f.label}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {f.icon}
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{f.label}</span>
                    </div>
                    <p className={`text-sm font-medium ${f.value ? 'text-slate-800' : 'text-slate-300 italic'}`}>
                      {f.value || 'Not specified'}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-50 mt-5 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock size={13} className="text-slate-300" />
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Created</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{detailDate(record.created_at)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Pencil size={13} className="text-slate-300" />
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Last Updated</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{detailDate(record.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Personal Notes Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-7 py-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Personal Notes</h2>
                {!editingNotes && (
                  <button
                    onClick={startEditNotes}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                  >
                    <Pencil size={11} /> {record.notes ? 'Edit' : 'Add note'}
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-3">
                  <textarea
                    value={notesValue}
                    onChange={e => setNotesValue(e.target.value)}
                    autoFocus
                    rows={4}
                    placeholder="Add personal notes, observations, or reminders..."
                    className="w-full text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all placeholder:text-slate-300"
                  />
                  {notesError && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg font-medium">{notesError}</p>}
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setEditingNotes(false)}
                      className="text-xs font-semibold text-slate-500 hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {savingNotes
                        ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Check size={12} />}
                      Save
                    </button>
                  </div>
                </div>
              ) : record.notes ? (
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{record.notes}</p>
              ) : (
                <p className="text-sm text-slate-300 italic">No personal notes yet.</p>
              )}
            </div>

            {/* File Card */}
            {record.originalFileName && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-7 py-6">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Attached File</h2>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{record.originalFileName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {record.mimeType} {record.fileSize ? `· ${fileSizeFmt(record.fileSize)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleLoadPreview}
                      disabled={previewLoading}
                      className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      {previewLoading
                        ? <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        : <Eye size={14} />}
                      View
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tags Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-7 py-6">
              <div className="flex items-center gap-2 mb-4">
                <Hash size={14} className="text-slate-400" />
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tags</h2>
              </div>
              <TagInput
                tags={record.tags}
                allTags={allTags}
                onAdd={handleAddTag}
                onRemove={handleRemoveTag}
              />
            </div>

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-5">

            {/* Connections Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
                <div className="flex items-center gap-2">
                  <Link2 size={16} className="text-indigo-600" />
                  <h2 className="font-bold text-slate-800 text-sm">Connections</h2>
                </div>
                <button
                  onClick={openConnectModal}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={13} /> Link Record
                </button>
              </div>
              <div className="p-5">
                {connections.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center mx-auto mb-3">
                      <Link2 size={20} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mb-1">No connections yet</p>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      Link related prescriptions, lab reports, or scans.
                    </p>
                    <button
                      onClick={openConnectModal}
                      className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors border border-indigo-200"
                    >
                      + Add Connection
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {connections.map(c => (
                      <ConnectionChip
                        key={c.id}
                        record={c}
                        onClick={() => navigate(`/records/${c.id}`)}
                        onRemove={() => handleRemoveConnection(c.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Collections Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
                <div className="flex items-center gap-2">
                  <FolderOpen size={16} className="text-indigo-600" />
                  <h2 className="font-bold text-slate-800 text-sm">Collections</h2>
                </div>
                {availableCols.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowAddToCol(v => !v)}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={13} /> Add
                    </button>
                    {showAddToCol && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase px-3 pt-2 pb-1">Add to collection</p>
                        {availableCols.map(c => (
                          <button
                            key={c.id}
                            onClick={() => handleAddToCollection(c.id)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 text-left"
                          >
                            <FolderOpen size={13} className="text-indigo-400 shrink-0" />
                            <span className="text-sm text-slate-700 truncate flex-1">{c.name}</span>
                            {c.recordCount > 0 && (
                              <span className="text-xs text-slate-400 shrink-0">{c.recordCount}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-5">
                {record.collections.length === 0 ? (
                  <div className="text-center py-6">
                    <FolderOpen size={24} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Not in any collection yet.</p>
                    {allCollections.length === 0 && (
                      <p className="text-xs text-slate-300 mt-1">Create collections from the Records page.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {record.collections.map(col => (
                      <div key={col.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 group">
                        <FolderOpen size={14} className="text-indigo-400 shrink-0" />
                        <span className="text-sm text-slate-700 font-medium flex-1 truncate">{col.name}</span>
                        <button
                          onClick={() => handleRemoveFromCollection(col.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Record Info Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Record Info</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Type</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md border ${m.color} ${m.bg} ${m.border}`}>
                    {m.icon}{m.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Record ID</span>
                  <span className={`font-mono text-xs font-bold ${m.color}`}>{record.recordId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">File</span>
                  <span className="text-xs font-medium text-slate-600">
                    {record.originalFileName ? 'Attached' : <span className="text-slate-300">None</span>}
                  </span>
                </div>

                {/* Visibility */}
                <div className="pt-1 border-t border-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Visibility</span>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${vis.cls}`}>
                      {record.visibility === 'private' && <EyeOff size={10} />}
                      {record.visibility === 'shared' && <Eye size={10} />}
                      {record.visibility === 'emergency' && <AlertCircle size={10} />}
                      {vis.label}
                    </span>
                  </div>
                  <select
                    value={record.visibility}
                    onChange={e => handleChangeVisibility(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                  >
                    <option value="private">Private</option>
                    <option value="shared">Shared with Doctor</option>
                    <option value="emergency">Emergency Access</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ FILE PREVIEW MODAL ══ */}
      {showPreview && previewSrc && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-10">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="text-indigo-600" size={18} />
                <span className="font-bold text-slate-800 text-sm">{record.originalFileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleDownload} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 transition-colors">
                  <Download size={13} /> Download
                </button>
                <button onClick={() => setShowPreview(false)} className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50 flex items-center justify-center transition-colors">
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center">
              {previewType === 'image' && <img src={previewSrc} alt="Preview" className="max-w-full max-h-full object-contain p-4" />}
              {previewType === 'pdf' && <iframe src={previewSrc} className="w-full h-full border-none" title="PDF Preview" />}
              {previewType === 'other' && (
                <div className="text-center p-10 bg-white rounded-2xl shadow-sm">
                  <p className="text-slate-600 mb-4 font-medium">This file format cannot be previewed.</p>
                  <button onClick={handleDownload} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ CONNECT MODAL ══ */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="font-black text-slate-800">Link a Record</h2>
                <p className="text-xs text-slate-400 mt-0.5">Search by ID, title, or doctor name</p>
              </div>
              <button onClick={() => setShowConnectModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 border-b border-slate-50 shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="e.g. PRES-00001, Dr. Rajesh, Blood Panel..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(r => (
                  <div key={r.id} className="relative">
                    <SearchRow
                      r={r}
                      alreadyLinked={connectedIds.has(r.id)}
                      onSelect={() => !connectedIds.has(r.id) && handleAddConnection(r.id)}
                    />
                    {isLinking === r.id && (
                      <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                  {searchQuery ? (
                    <>
                      <Search size={28} className="text-slate-200 mb-3" />
                      <p className="text-sm font-semibold text-slate-600">No records found</p>
                      <p className="text-xs text-slate-400 mt-1">Try searching by record ID, title, or doctor name</p>
                    </>
                  ) : (
                    <>
                      <ExternalLink size={28} className="text-slate-200 mb-3" />
                      <p className="text-sm font-semibold text-slate-600">Start typing to search</p>
                      <p className="text-xs text-slate-400 mt-1">Find records to connect to this one</p>
                    </>
                  )}
                </div>
              )}
            </div>
            {connections.length > 0 && (
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Currently linked</p>
                <div className="flex flex-wrap gap-1.5">
                  {connections.map(c => {
                    const cm = fmt(c.category);
                    return (
                      <span key={c.id} className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${cm.color} ${cm.bg} ${cm.border}`}>
                        {cm.icon} {c.recordId}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop to close collections dropdown */}
      {showAddToCol && (
        <div className="fixed inset-0 z-10" onClick={() => setShowAddToCol(false)} />
      )}
    </div>
  );
}
