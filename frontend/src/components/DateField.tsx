import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const YEAR_PAGE = 12;

const pad2 = (n: number) => String(n).padStart(2, '0');
const toISO = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseISO = (s: string): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

type Level = 'day' | 'month' | 'year';

/** A real calendar popover for picking a date: opens on the current month,
 *  and the "August 2026" header drills down into a year grid then a month
 *  grid for fast long-range navigation, instead of clicking prev/next
 *  one step at a time or fighting the browser's native date picker. */
export default function DateField({
  value, onChange, id, max,
}: { value: string; onChange: (v: string) => void; id?: string; max?: string }) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<Level>('day');
  const selected = parseISO(value);
  const maxDate = max ? parseISO(max) : null;
  const [viewDate, setViewDate] = useState(() => selected || new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { setViewDate(selected || new Date()); setLevel('day'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);

  const formatted = selected
    ? selected.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isDisabled = (d: Date) => (maxDate ? d > maxDate : false);

  /* ─── day grid ─── */
  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const dayCells: { date: Date; inMonth: boolean }[] = [];
  for (let i = startOffset - 1; i >= 0; i--) dayCells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) dayCells.push({ date: new Date(year, month, d), inMonth: true });
  for (let d = 1; dayCells.length < 42; d++) dayCells.push({ date: new Date(year, month + 1, d), inMonth: false });

  const selectDay = (d: Date) => {
    if (isDisabled(d)) return;
    onChange(toISO(d));
    setOpen(false);
  };

  /* ─── year grid (12 per page) ─── */
  const yearBase = Math.floor(year / YEAR_PAGE) * YEAR_PAGE;
  const yearCells = Array.from({ length: YEAR_PAGE }, (_, i) => yearBase + i);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between gap-2 bg-slate-50 border rounded-xl pl-3.5 pr-3 py-2.5 text-sm text-left transition-all ${open ? 'border-indigo-400 ring-2 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}
      >
        <span className={formatted ? 'text-slate-800 font-medium' : 'text-slate-400'}>
          {formatted || 'Select a date'}
        </span>
        <Calendar size={14} className="text-indigo-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-30 w-56 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-300/30 p-2.5">

          {/* ─── DAY VIEW ─── */}
          {level === 'day' && (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                  <ChevronLeft size={13} />
                </button>
                <button type="button" onClick={() => setLevel('month')}
                  className="text-xs font-bold text-slate-800 hover:text-indigo-600 px-1.5 py-0.5 rounded-md hover:bg-indigo-50 transition-colors">
                  {MONTH_NAMES[month]} {year}
                </button>
                <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                  <ChevronRight size={13} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-[9px] font-bold text-slate-400 py-0.5">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {dayCells.map(({ date, inMonth }, i) => {
                  const disabled = isDisabled(date);
                  const isSelected = !!selected && isSameDay(date, selected);
                  const isToday = isSameDay(date, today);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectDay(date)}
                      className={[
                        'h-6 rounded-md text-[11px] font-semibold transition-colors',
                        !inMonth ? 'text-slate-300' : disabled ? 'text-slate-200 cursor-not-allowed' : 'text-slate-700 hover:bg-indigo-50',
                        isSelected ? '!bg-indigo-600 !text-white' : '',
                        isToday && !isSelected ? 'ring-1 ring-inset ring-indigo-300' : '',
                      ].join(' ')}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false); }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 px-1.5 py-1 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <X size={11} /> Clear
                </button>
                <button
                  type="button"
                  disabled={isDisabled(today)}
                  onClick={() => selectDay(today)}
                  className="text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 disabled:text-slate-300 disabled:hover:bg-transparent px-2 py-1 rounded-md transition-colors"
                >
                  Today
                </button>
              </div>
            </>
          )}

          {/* ─── MONTH VIEW ─── */}
          {level === 'month' && (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <button type="button" onClick={() => setViewDate(new Date(year - 1, month, 1))}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                  <ChevronLeft size={13} />
                </button>
                <button type="button" onClick={() => setLevel('year')}
                  className="text-xs font-bold text-slate-800 hover:text-indigo-600 px-1.5 py-0.5 rounded-md hover:bg-indigo-50 transition-colors">
                  {year}
                </button>
                <button type="button" onClick={() => setViewDate(new Date(year + 1, month, 1))}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                  <ChevronRight size={13} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MONTH_SHORT.map((label, i) => {
                  const isCurrent = year === today.getFullYear() && i === today.getMonth();
                  const isSelectedMonth = !!selected && selected.getFullYear() === year && selected.getMonth() === i;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => { setViewDate(new Date(year, i, 1)); setLevel('day'); }}
                      className={[
                        'py-2 rounded-md text-[11px] font-semibold transition-colors',
                        isSelectedMonth ? '!bg-indigo-600 !text-white' : 'text-slate-700 hover:bg-indigo-50',
                        isCurrent && !isSelectedMonth ? 'ring-1 ring-inset ring-indigo-300' : '',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ─── YEAR VIEW ─── */}
          {level === 'year' && (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <button type="button" onClick={() => setViewDate(new Date(year - YEAR_PAGE, month, 1))}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                  <ChevronLeft size={13} />
                </button>
                <span className="text-xs font-bold text-slate-800">{yearBase} – {yearBase + YEAR_PAGE - 1}</span>
                <button type="button" onClick={() => setViewDate(new Date(year + YEAR_PAGE, month, 1))}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                  <ChevronRight size={13} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {yearCells.map(y => {
                  const isCurrent = y === today.getFullYear();
                  const isSelectedYear = !!selected && selected.getFullYear() === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => { setViewDate(new Date(y, month, 1)); setLevel('month'); }}
                      className={[
                        'py-2 rounded-md text-[11px] font-semibold transition-colors',
                        isSelectedYear ? '!bg-indigo-600 !text-white' : 'text-slate-700 hover:bg-indigo-50',
                        isCurrent && !isSelectedYear ? 'ring-1 ring-inset ring-indigo-300' : '',
                      ].join(' ')}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
