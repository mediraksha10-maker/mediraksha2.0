import { pool } from '../../config/db.js';
import { recordAmbulanceEvent, logAmbulanceAudit } from './ambulanceDataService.js';

// ── State machine ─────────────────────────────────────────────────────────────
//
// Ambulance status transitions:
//
//   OFFLINE ──────┐
//      │          │
//      ▼          ▼
//   AVAILABLE → ASSIGNED → BUSY → AVAILABLE
//      │           │
//      ▼           ▼
//  MAINTENANCE  AVAILABLE (if driver rejects)
//
// MAINTENANCE and OFFLINE are "out of service" states;
// AVAILABLE is the only state eligible for assignment.

const VALID_TRANSITIONS = Object.freeze({
  AVAILABLE:   ['ASSIGNED', 'OFFLINE', 'MAINTENANCE'],
  ASSIGNED:    ['AVAILABLE', 'BUSY', 'OFFLINE'],
  BUSY:        ['AVAILABLE', 'OFFLINE'],
  OFFLINE:     ['AVAILABLE', 'MAINTENANCE'],
  MAINTENANCE: ['AVAILABLE', 'OFFLINE'],
});

export const isValidTransition = (from, to) =>
  VALID_TRANSITIONS[from]?.includes(to) ?? false;

export const getAllowedTransitions = (currentStatus) =>
  VALID_TRANSITIONS[currentStatus] ?? [];

// ── Atomic status transition ──────────────────────────────────────────────────

export const transitionAmbulanceStatus = async (
  ambulanceId, newStatus, actorId, actorType = 'system', client = null
) => {
  const shouldCommit = !client;
  const db = shouldCommit ? await pool.connect() : client;

  try {
    if (shouldCommit) await db.query('BEGIN');

    const { rows: [current] } = await db.query(
      `SELECT id, current_status, is_active FROM ambulances WHERE id = $1 FOR UPDATE`,
      [ambulanceId]
    );

    if (!current) throw new Error(`Ambulance ${ambulanceId} not found`);
    if (!current.is_active) throw new Error(`Ambulance ${ambulanceId} is deactivated`);

    // No-op for idempotency — same transition is not an error
    if (current.current_status === newStatus) {
      if (shouldCommit) await db.query('COMMIT');
      return current;
    }

    if (!isValidTransition(current.current_status, newStatus)) {
      throw new Error(
        `Invalid status transition: ${current.current_status} → ${newStatus}. ` +
        `Allowed from ${current.current_status}: ${(VALID_TRANSITIONS[current.current_status] || []).join(', ')}`
      );
    }

    const { rows: [updated] } = await db.query(
      `UPDATE ambulances SET current_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newStatus, ambulanceId]
    );

    await recordAmbulanceEvent(ambulanceId, 'STATUS_CHANGED', {
      from: current.current_status, to: newStatus,
    }, actorType, actorId, db);

    await logAmbulanceAudit(ambulanceId, null, actorType, actorId, 'STATUS_CHANGED', {
      from: current.current_status, to: newStatus,
    }, db);

    if (shouldCommit) await db.query('COMMIT');
    return updated;

  } catch (err) {
    if (shouldCommit) await db.query('ROLLBACK');
    throw err;
  } finally {
    if (shouldCommit) db.release();
  }
};
