import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Plus, Search, X, Stethoscope, FlaskConical, ScanLine,
  ClipboardList, FileText, Star, Pin, Link2, Hash, Upload, CheckCircle2,
  Trash2, Calendar, ChevronRight, Layers, FileImage, FileArchive, AlertCircle,
} from 'lucide-react';
import api from '../api/Api';

/* ─── Types ─── */
interface Tag { id: number; name: string; color: string; }

interface CollectionRecord {
  id: number;
  recordId: string;
  title: string;
  category: string;
  doctorName: string | null;
  specialization: string | null;
  hospital: string | null;
  visitDate: string | null;
  created_at: string;
  isImportant: boolean;
  isPinned: boolean;
  originalFileName: string | null;
  mimeType: string | null;
  connectionCount: number;
  tags: Tag[];
}

interface Collection {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  records: CollectionRecord[];
}

interface SearchRecord {
  id: number;
  recordId: string;
  title: string;
  category: string;
  doctorName: string | null;
  visitDate: string | null;
  isArchived: boolean;
  tags: Tag[];
}

type CategoryType = 'prescription' | 'lab' | 'scan' | 'discharge' | 'other';

/* ─── Constants ─── */
const CATEGORY_META: Record<string, {
  label: string; prefix: string; color: string; bg: string; border: string;
  dotBg: string; icon: React.ReactNode;
}> = {
  prescription: {
    label: 'Prescription', prefix: 'PRES',
    color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200',
    dotBg: 'bg-indigo-500',
    icon: <Stethoscope size={14} />,
  },
  lab: {
    label: 'Lab Report', prefix: 'LAB',
    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',
    dotBg: 'bg-emerald-500',
    icon: <FlaskConical size={14} />,
  },
  scan: {
    label: 'Scan / Imaging', prefix: 'IMG',
    color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200',
    dotBg: 'bg-violet-500',
    icon: <ScanLine size={14} />,
  },
  discharge: {
    label: 'Discharge Summary', prefix: 'DIS',
    color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200',
    dotBg: 'bg-amber-500',
    icon: <ClipboardList size={14} />,
  },
  other: {
    label: 'Other', prefix: 'REC',
    color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200',
    dotBg: 'bg-slate-400',
    icon: <FileText size={14} />,
  },
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
const fmt = (cat: string) => CATEGORY_META[cat] || CATEGORY_META.other;

/* ─── Helpers ─── */
function groupByMonth(records: CollectionRecord[]): [string, CollectionRecord[]][] {
  const groups = new Map<string, CollectionRecord[]>();
  for (const r of records) {
    const date = r.visitDate ? new Date(r.visitDate) : new Date(r.created_at);
    const key = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return Array.from(groups.entries());
}

function formatLongDate(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatShortMonth(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

/* ─── Main Component ─── */
export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQ, setSearchQ] = useState('');

  /* add new record */
  const [showAddNew, setShowAddNew] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [selCategory, setSelCategory] = useState<CategoryType>('prescription');
  const [fTitle, setFTitle] = useState('');
  const [fDoctor, setFDoctor] = useState('');
  const [fSpec, setFSpec] = useState('');
  const [fHospital, setFHospital] = useState('');
  const [fDate, setFDate] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [fVisibility, setFVisibility] = useState<'private' | 'shared' | 'emergency'>('private');
  const [fTags, setFTags] = useState('');
  const [fFile, setFFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [addError, setAddError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  /* add existing record */
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [allRecords, setAllRecords] = useState<SearchRecord[]>([]);
  const [existingSearch, setExistingSearch] = useState('');
  const [loadingAll, setLoadingAll] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);

  /* ── fetch collection ── */
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await api.get(`/user/collections/${id}`);
        if (res.data?.success) setCollection(res.data.data);
        else setError('Collection not found.');
      } catch (e: any) {
        if (e.response?.status === 401) navigate('/auth');
        else setError('Failed to load collection.');
      } finally { setLoading(false); }
    })();
  }, [id, navigate]);

  /* ── derived data ── */
  const filteredRecords = useMemo(() => {
    if (!collection?.records) return [];
    const q = searchQ.toLowerCase().trim();
    if (!q) return collection.records;
    return collection.records.filter(r =>
      r.title.toLowerCase().includes(q) ||
      (r.recordId || '').toLowerCase().includes(q) ||
      (r.doctorName || '').toLowerCase().includes(q) ||
      r.tags?.some(t => t.name.toLowerCase().includes(q))
    );
  }, [collection, searchQ]);

  const monthGroups = useMemo(() => groupByMonth(filteredRecords), [filteredRecords]);

  const stats = useMemo(() => {
    const recs = collection?.records || [];
    return {
      total: recs.length,
      prescription: recs.filter(r => r.category === 'prescription').length,
      lab: recs.filter(r => r.category === 'lab').length,
      scan: recs.filter(r => r.category === 'scan').length,
      important: recs.filter(r => r.isImportant).length,
    };
  }, [collection]);

  const timelineRange = useMemo(() => {
    const recs = collection?.records || [];
    if (!recs.length) return null;
    const dates = recs.map(r => r.visitDate || r.created_at).filter(Boolean).sort();
    if (!dates.length) return null;
    return { start: formatShortMonth(dates[0]), end: formatShortMonth(dates[dates.length - 1]) };
  }, [collection]);

  /* ── remove record ── */
  const handleRemove = async (recordId: number) => {
    if (!id || !window.confirm('Remove this record from the collection? The record itself will not be deleted.')) return;
    try {
      await api.delete(`/user/collections/${id}/records/${recordId}`);
      setCollection(prev => prev ? { ...prev, records: prev.records.filter(r => r.id !== recordId) } : prev);
    } catch {}
  };

  /* ── add new record ── */
  const resetAddForm = () => {
    setAddStep(1); setSelCategory('prescription');
    setFTitle(''); setFDoctor(''); setFSpec(''); setFHospital('');
    setFDate(''); setFNotes(''); setFVisibility('private');
    setFTags(''); setFFile(null);
    setAddError(''); setUploadProgress(0); setSaveSuccess(false);
  };

  const refreshCollection = async () => {
    if (!id) return;
    const colRes = await api.get(`/user/collections/${id}`);
    if (colRes.data?.success) setCollection(colRes.data.data);
  };

  const handleSubmitNew = async () => {
    if (!fTitle.trim()) { setAddError('Title is required.'); return; }
    setIsSubmitting(true); setAddError(''); setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append('title', fTitle.trim());
      fd.append('category', selCategory);
      fd.append('doctorName', fDoctor);
      fd.append('specialization', fSpec);
      fd.append('hospital', fHospital);
      fd.append('visitDate', fDate);
      fd.append('notes', fNotes);
      fd.append('visibility', fVisibility);
      const tagList = fTags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
      if (tagList.length) fd.append('tags', JSON.stringify(tagList));
      if (fFile) fd.append('file', fFile);

      const res = await api.post('/user/records/create', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => { if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100)); },
      });
      if (res.data?.success) {
        await api.post(`/user/collections/${id}/records/${res.data.data.id}`);
        await refreshCollection();
        setSaveSuccess(true);
      }
    } catch (e: any) {
      if (e.response?.status === 401) navigate('/auth');
      else setAddError(e.response?.data?.message || 'Failed to save record. Please try again.');
    } finally { setIsSubmitting(false); }
  };

  /* ── add existing record ── */
  const openAddExisting = async () => {
    setShowAddExisting(true);
    setExistingSearch('');
    if (allRecords.length) return;
    setLoadingAll(true);
    try {
      const res = await api.get('/user/records/all');
      if (res.data?.success) setAllRecords(res.data.data);
    } catch {}
    finally { setLoadingAll(false); }
  };

  const handleAddExisting = async (record: SearchRecord) => {
    if (!id) return;
    setAddingId(record.id);
    try {
      await api.post(`/user/collections/${id}/records/${record.id}`);
      await refreshCollection();
    } catch {}
    finally { setAddingId(null); }
  };

  const inCollectionIds = useMemo(
    () => new Set(collection?.records.map(r => r.id) || []),
    [collection]
  );

  const filteredExisting = useMemo(() => {
    const q = existingSearch.toLowerCase().trim();
    return allRecords.filter(r => {
      if (r.isArchived || inCollectionIds.has(r.id)) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (r.recordId || '').toLowerCase().includes(q) ||
        (r.doctorName || '').toLowerCase().includes(q) ||
        r.tags?.some(t => t.name.toLowerCase().includes(q))
      );
    });
  }, [allRecords, existingSearch, inCollectionIds]);

  /* ─── Loading / Error states ─── */
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading medical journey...</p>
      </div>
    </div>
  );

  if (error || !collection) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={28} className="text-rose-400" />
        </div>
        <p className="font-bold text-slate-700 mb-2">{error || 'Collection not found'}</p>
        <button onClick={() => navigate('/records')} className="text-sm text-indigo-600 hover:underline">← Back to Records</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky Header ── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 pt-5 pb-0">
          <div className="flex items-start gap-4 mb-4">
            <button onClick={() => navigate('/records')}
              className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors text-slate-500 shrink-0 mt-0.5">
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-slate-800 tracking-tight truncate">{collection.name}</h1>
              {collection.description && (
                <p className="text-sm text-slate-400 mt-0.5 truncate">{collection.description}</p>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-2 flex-wrap pb-4">
            <span className="inline-flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5 text-xs font-bold text-slate-700">
              <Layers size={12} className="text-slate-500" />
              {stats.total} Records
            </span>
            {stats.prescription > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1.5 text-xs font-bold text-indigo-700">
                <Stethoscope size={12} /> {stats.prescription} Prescription{stats.prescription !== 1 ? 's' : ''}
              </span>
            )}
            {stats.lab > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 text-xs font-bold text-emerald-700">
                <FlaskConical size={12} /> {stats.lab} Lab Report{stats.lab !== 1 ? 's' : ''}
              </span>
            )}
            {stats.scan > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-violet-50 border border-violet-200 rounded-full px-3 py-1.5 text-xs font-bold text-violet-700">
                <ScanLine size={12} /> {stats.scan} Scan{stats.scan !== 1 ? 's' : ''}
              </span>
            )}
            {stats.important > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 text-xs font-bold text-amber-700">
                <Star size={12} className="fill-amber-400" /> {stats.important} Important
              </span>
            )}
            {timelineRange && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 ml-auto">
                <Calendar size={11} />
                {timelineRange.start === timelineRange.end
                  ? timelineRange.start
                  : `${timelineRange.start} → ${timelineRange.end}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Page Content ── */}
      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <div className="relative flex-1 min-w-52">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search records in this journey…"
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {searchQ && (
              <button onClick={() => setSearchQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={() => { resetAddForm(); setShowAddNew(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-100 active:scale-95 whitespace-nowrap">
            <Plus size={15} /> Add Record
          </button>
          <button
            onClick={openAddExisting}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-sm font-bold px-4 py-2.5 rounded-xl transition-all whitespace-nowrap">
            <Link2 size={15} /> Add Existing
          </button>
        </div>

        {/* Empty State */}
        {collection.records.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center mb-5">
              <Layers size={32} className="text-indigo-300" />
            </div>
            <p className="font-black text-slate-700 text-xl mb-2">No records yet</p>
            <p className="text-sm text-slate-400 mb-8 max-w-xs">
              Start building this medical journey by adding your first record.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { resetAddForm(); setShowAddNew(true); }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-100">
                <Plus size={16} /> Add New Record
              </button>
              <button
                onClick={openAddExisting}
                className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 text-sm font-bold px-6 py-3 rounded-xl transition-all">
                <Link2 size={16} /> Add Existing Record
              </button>
            </div>
          </div>
        )}

        {/* Search empty state */}
        {collection.records.length > 0 && filteredRecords.length === 0 && searchQ && (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm">No records match "<strong>{searchQ}</strong>"</p>
            <button onClick={() => setSearchQ('')} className="text-indigo-600 text-sm mt-2 hover:underline">Clear search</button>
          </div>
        )}

        {/* Monthly Timeline */}
        {filteredRecords.length > 0 && (
          <div className="space-y-10">
            {monthGroups.map(([month, recs]) => (
              <div key={month}>
                {/* Month divider */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center gap-2 bg-slate-800 text-white rounded-full px-4 py-1.5 shrink-0">
                    <Calendar size={12} />
                    <span className="text-xs font-bold tracking-wide">{month}</span>
                  </div>
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 font-medium shrink-0">
                    {recs.length} record{recs.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Records in this month */}
                <div className="relative pl-8">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[14px] top-3 bottom-3 w-0.5 bg-slate-200 rounded-full" />

                  <div className="space-y-3">
                    {recs.map((r) => {
                      const m = fmt(r.category);
                      return (
                        <div key={r.id} className="relative">
                          {/* Timeline node dot */}
                          <div className={`absolute -left-8 top-[22px] w-[18px] h-[18px] rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10 ${m.bg} ${m.border} border`}>
                            <div className={`${m.color} [&>svg]:w-2.5 [&>svg]:h-2.5`}>{m.icon}</div>
                          </div>

                          {/* Record Card */}
                          <div
                            onClick={() => navigate(`/records/${r.id}`)}
                            className="bg-white border border-slate-100 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                {/* Top badge row */}
                                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                  {r.isImportant && (
                                    <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                                  )}
                                  {r.isPinned && (
                                    <Pin size={12} className="fill-indigo-400 text-indigo-400 shrink-0" />
                                  )}
                                  <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border ${m.color} ${m.bg} ${m.border}`}>
                                    {r.recordId}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.bg} ${m.color}`}>
                                    {m.label}
                                  </span>
                                </div>

                                {/* Title */}
                                <p className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors mb-1.5">
                                  {r.title}
                                </p>

                                {/* Meta row */}
                                <div className="flex items-center gap-3 text-xs text-slate-400 mb-2 flex-wrap">
                                  {r.doctorName && (
                                    <span className="flex items-center gap-1">
                                      <Stethoscope size={11} className="text-slate-300" />
                                      {r.doctorName}
                                    </span>
                                  )}
                                  {(r.visitDate || r.created_at) && (
                                    <span className="flex items-center gap-1">
                                      <Calendar size={11} className="text-slate-300" />
                                      {formatLongDate(r.visitDate || r.created_at)}
                                    </span>
                                  )}
                                  {r.hospital && <span className="truncate">{r.hospital}</span>}
                                </div>

                                {/* Tags */}
                                {r.tags?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {r.tags.slice(0, 5).map(t => {
                                      const c = tagColor(t.color);
                                      return (
                                        <span
                                          key={t.id}
                                          className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}
                                        >
                                          <Hash size={8} />{t.name}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* File / Connection badges */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {r.originalFileName && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-50 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">
                                      {r.mimeType?.startsWith('image/') ? <FileImage size={9} /> : <FileArchive size={9} />}
                                      {r.mimeType === 'application/pdf' ? 'PDF' : r.mimeType?.startsWith('image/') ? 'Image' : 'File'}
                                    </span>
                                  )}
                                  {r.connectionCount > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                                      <Link2 size={9} /> {r.connectionCount} linked
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action: remove + chevron */}
                              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                <button
                                  onClick={e => { e.stopPropagation(); handleRemove(r.id); }}
                                  className="w-7 h-7 rounded-lg text-slate-200 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 size={13} />
                                </button>
                                <ChevronRight size={15} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          ADD NEW RECORD MODAL
      ══════════════════════════════════════ */}
      {showAddNew && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="font-black text-slate-800 text-lg">
                  {saveSuccess ? 'Added to Journey!' : addStep === 1 ? 'Select Record Type' : `New ${CATEGORY_META[selCategory]?.label}`}
                </h2>
                {!saveSuccess && (
                  <div className="flex items-center gap-1.5 mt-1">
                    {[1, 2].map(s => (
                      <div key={s} className={`h-1 rounded-full transition-all ${s === addStep ? 'w-8 bg-indigo-600' : s < addStep ? 'w-4 bg-indigo-300' : 'w-4 bg-slate-200'}`} />
                    ))}
                    <span className="text-[11px] text-slate-400 ml-1">Step {addStep} of 2</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => { setShowAddNew(false); resetAddForm(); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-7 py-6 overflow-y-auto">

              {/* Success */}
              {saveSuccess && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                  </div>
                  <p className="font-bold text-slate-800 mb-1">Record created and added!</p>
                  <p className="text-sm text-slate-400 mt-2 mb-6">The new record is now part of this medical journey.</p>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => { setShowAddNew(false); resetAddForm(); }}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all">
                      Done
                    </button>
                    <button onClick={resetAddForm}
                      className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                      Add Another
                    </button>
                  </div>
                </div>
              )}

              {/* Step 1 — Category picker */}
              {!saveSuccess && addStep === 1 && (
                <div className="space-y-3">
                  {(Object.entries(CATEGORY_META) as [CategoryType, typeof CATEGORY_META[string]][]).map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => { setSelCategory(key); setAddStep(2); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left hover:shadow-sm ${selCategory === key ? `${meta.bg} ${meta.border}` : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.bg} ${meta.color} [&>svg]:w-5 [&>svg]:h-5`}>
                        {meta.icon}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{meta.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{meta.prefix}-XXXXX</p>
                      </div>
                      <ChevronRight size={16} className="ml-auto text-slate-300" />
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2 — Record form */}
              {!saveSuccess && addStep === 2 && (
                <div className="space-y-4">
                  <button onClick={() => setAddStep(1)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors">
                    <ArrowLeft size={13} /> Back to type selection
                  </button>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fTitle}
                      onChange={e => setFTitle(e.target.value)}
                      placeholder={
                        selCategory === 'prescription' ? 'e.g., Diabetes Follow-up'
                        : selCategory === 'lab' ? 'e.g., HbA1c Test'
                        : selCategory === 'scan' ? 'e.g., Chest X-Ray'
                        : 'Record title'
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Doctor Name</label>
                      <input type="text" value={fDoctor} onChange={e => setFDoctor(e.target.value)} placeholder="Dr. Rajesh Kumar"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Specialization</label>
                      <input type="text" value={fSpec} onChange={e => setFSpec(e.target.value)} placeholder="Endocrinology"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Hospital / Clinic</label>
                      <input type="text" value={fHospital} onChange={e => setFHospital(e.target.value)} placeholder="Apollo Hospital"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Visit Date</label>
                      <input type="date" value={fDate} onChange={e => setFDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Personal Notes</label>
                    <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} rows={2}
                      placeholder="Doctor's advice, follow-up reminders, context…"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Tags <span className="text-slate-400 font-normal">(comma-separated)</span>
                    </label>
                    <input type="text" value={fTags} onChange={e => setFTags(e.target.value)}
                      placeholder="Diabetes, HbA1c, Follow-up"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
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
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Attach File <span className="text-slate-400 font-normal">(PDF or image, max 5MB)</span>
                    </label>
                    <input
                      type="file"
                      ref={fileRef}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 5 * 1024 * 1024) { setAddError('File must be under 5MB.'); return; }
                        setFFile(f); setAddError('');
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed transition-all ${fFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-indigo-400 bg-slate-50'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${fFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Upload size={15} />
                      </div>
                      <span className={`text-sm font-medium truncate ${fFile ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {fFile ? fFile.name : 'Click to upload file'}
                      </span>
                      {fFile && (
                        <X size={14} className="ml-auto text-slate-400 shrink-0"
                          onClick={e => { e.stopPropagation(); setFFile(null); }} />
                      )}
                    </button>
                  </div>

                  {isSubmitting && uploadProgress > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                        <span>Uploading…</span><span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {addError && (
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg font-medium">
                      {addError}
                    </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => { setShowAddNew(false); resetAddForm(); }}
                      className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitNew}
                      disabled={isSubmitting || !fTitle.trim()}
                      className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-sm transition-all shadow-md shadow-indigo-100 disabled:shadow-none">
                      {isSubmitting ? 'Saving…' : 'Save to Journey'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          ADD EXISTING RECORD MODAL
      ══════════════════════════════════════ */}
      {showAddExisting && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="font-black text-slate-800 text-lg">Add Existing Record</h2>
                <p className="text-xs text-slate-400 mt-0.5">Select records to include in this journey</p>
              </div>
              <button
                onClick={() => setShowAddExisting(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 pt-4 pb-3 shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={existingSearch}
                  onChange={e => setExistingSearch(e.target.value)}
                  placeholder="Search by title, doctor, ID, tag…"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-3 pb-4">
              {loadingAll ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredExisting.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-slate-400 text-sm">
                    {existingSearch
                      ? `No records match "${existingSearch}"`
                      : allRecords.filter(r => !r.isArchived).length === 0
                        ? 'No records found. Create records first from the Records page.'
                        : 'All your records are already in this collection.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredExisting.map(r => {
                    const m = fmt(r.category);
                    const isAdding = addingId === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleAddExisting(r)}
                        disabled={isAdding}
                        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-50 rounded-xl transition-colors text-left group disabled:opacity-60"
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${m.bg} ${m.color} ${m.border} [&>svg]:w-4 [&>svg]:h-4`}>
                          {m.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-slate-800 truncate">{r.title}</span>
                            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${m.color} ${m.bg} ${m.border}`}>
                              {r.recordId}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                            {r.doctorName && <span>{r.doctorName}</span>}
                            {r.visitDate && (
                              <span>· {new Date(r.visitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            )}
                            {r.tags?.slice(0, 2).map(t => {
                              const c = tagColor(t.color);
                              return (
                                <span key={t.id} className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${c.bg} ${c.text}`}>
                                  #{t.name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isAdding ? (
                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              <Plus size={13} />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
