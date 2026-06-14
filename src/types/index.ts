// ── Slot status ──────────────────────────────────────
export type SlotStatus = 'available' | 'booked';

// ── A single time slot ───────────────────────────────
export type TimeSlot = {
  id: string;
  date: string;      // "YYYY-MM-DD"
  time: string;      // "HH:MM"
  endTime: string;   // "HH:MM"
  status: SlotStatus;
};

// ── Slots grouped by date ────────────────────────────
export type SlotGroup = {
  date: string;
  label: string;
  slots: TimeSlot[];
};

// ── Publish mode ─────────────────────────────────────
export type PublishMode = 'single' | 'weekly';

// ── Toast notification ───────────────────────────────
export type AppToast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};
