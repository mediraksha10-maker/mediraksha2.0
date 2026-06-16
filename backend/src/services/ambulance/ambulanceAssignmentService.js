import { pool } from '../../config/db.js';
import { logAmbulanceAudit, recordAmbulanceEvent } from './ambulanceDataService.js';
import { transitionAmbulanceStatus } from './ambulanceStatusEngine.js';
import { recordEvent, EVENT_TYPES } from '../emergency/timelineService.js';

// ── Valid assignment status transitions ───────────────────────────────────────
//
//   PENDING → ACCEPTED  (driver accepts)
//   PENDING → REJECTED  (driver rejects — ambulance released back to AVAILABLE)
//   ACCEPTED → IN_PROGRESS (driver marks en-route)
//   IN_PROGRESS → COMPLETED (patient picked up / trip finished)
//   ACCEPTED | IN_PROGRESS → CANCELLED (ops cancels)

const ASSIGNMENT_TRANSITIONS = Object.freeze({
  PENDING:     ['ACCEPTED', 'REJECTED'],
  ACCEPTED:    ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
});

// ── Queries ───────────────────────────────────────────────────────────────────

export const getAssignmentById = async (assignmentId, client = null) => {
  const db = client || pool;
  const { rows: [assignment] } = await db.query(
    `SELECT aa.*,
       a.ambulance_code, a.ambulance_type, a.current_status AS ambulance_current_status,
       d.driver_name, d.phone AS driver_phone, d.status AS driver_status,
       ec.emergency_id
     FROM ambulance_assignments aa
     JOIN ambulances a           ON a.id  = aa.ambulance_id
     LEFT JOIN ambulance_drivers d ON d.id  = aa.driver_id
     JOIN emergency_cases ec     ON ec.id = aa.emergency_case_id
     WHERE aa.id = $1`,
    [assignmentId]
  );
  return assignment || null;
};

export const getAssignmentsByEmergency = async (emergencyCaseId, client = null) => {
  const db = client || pool;
  const { rows } = await db.query(
    `SELECT aa.*,
       a.ambulance_code, a.ambulance_type,
       d.driver_name, d.phone AS driver_phone
     FROM ambulance_assignments aa
     JOIN ambulances a           ON a.id = aa.ambulance_id
     LEFT JOIN ambulance_drivers d ON d.id = aa.driver_id
     WHERE aa.emergency_case_id = $1
     ORDER BY aa.assigned_at DESC`,
    [emergencyCaseId]
  );
  return rows;
};

// ── Driver actions ────────────────────────────────────────────────────────────

export const acceptAssignment = async (assignmentId, driverId, client = null) => {
  const shouldCommit = !client;
  const db = shouldCommit ? await pool.connect() : client;

  try {
    if (shouldCommit) await db.query('BEGIN');

    const { rows: [assignment] } = await db.query(
      `SELECT * FROM ambulance_assignments WHERE id = $1 FOR UPDATE`,
      [assignmentId]
    );

    if (!assignment) throw new Error('Assignment not found');
    if (assignment.assignment_status !== 'PENDING') {
      throw new Error(`Assignment is already ${assignment.assignment_status}`);
    }

    const { rows: [updated] } = await db.query(
      `UPDATE ambulance_assignments
       SET assignment_status = 'ACCEPTED', accepted_at = NOW(), driver_id = $1
       WHERE id = $2 RETURNING *`,
      [driverId, assignmentId]
    );

    await recordEvent(assignment.emergency_case_id, EVENT_TYPES.DRIVER_ACCEPTED, {
      assignment_id: assignmentId,
      ambulance_id:  assignment.ambulance_id,
      driver_id:     driverId,
    }, db);

    await recordAmbulanceEvent(assignment.ambulance_id, 'ASSIGNMENT_ACCEPTED', {
      assignment_id: assignmentId, emergency_case_id: assignment.emergency_case_id,
    }, 'driver', driverId, db);

    await logAmbulanceAudit(assignment.ambulance_id, assignmentId, 'driver', driverId, 'DRIVER_ACCEPTED', {}, db);

    if (shouldCommit) await db.query('COMMIT');
    return updated;

  } catch (err) {
    if (shouldCommit) await db.query('ROLLBACK');
    throw err;
  } finally {
    if (shouldCommit) db.release();
  }
};

export const rejectAssignment = async (assignmentId, driverId, reason = null, client = null) => {
  const shouldCommit = !client;
  const db = shouldCommit ? await pool.connect() : client;

  try {
    if (shouldCommit) await db.query('BEGIN');

    const { rows: [assignment] } = await db.query(
      `SELECT * FROM ambulance_assignments WHERE id = $1 FOR UPDATE`,
      [assignmentId]
    );

    if (!assignment) throw new Error('Assignment not found');
    if (assignment.assignment_status !== 'PENDING') {
      throw new Error(`Assignment is already ${assignment.assignment_status}`);
    }

    const { rows: [updated] } = await db.query(
      `UPDATE ambulance_assignments
       SET assignment_status = 'REJECTED', rejected_at = NOW(), rejection_reason = $1
       WHERE id = $2 RETURNING *`,
      [reason, assignmentId]
    );

    // Release ambulance back to AVAILABLE so it can be matched to another emergency
    await transitionAmbulanceStatus(assignment.ambulance_id, 'AVAILABLE', driverId, 'driver', db);

    await recordEvent(assignment.emergency_case_id, EVENT_TYPES.DRIVER_REJECTED, {
      assignment_id: assignmentId,
      ambulance_id:  assignment.ambulance_id,
      driver_id:     driverId,
      reason,
    }, db);

    await recordAmbulanceEvent(assignment.ambulance_id, 'ASSIGNMENT_REJECTED', {
      assignment_id: assignmentId, reason,
    }, 'driver', driverId, db);

    await logAmbulanceAudit(assignment.ambulance_id, assignmentId, 'driver', driverId, 'DRIVER_REJECTED', { reason }, db);

    if (shouldCommit) await db.query('COMMIT');
    return updated;

  } catch (err) {
    if (shouldCommit) await db.query('ROLLBACK');
    throw err;
  } finally {
    if (shouldCommit) db.release();
  }
};

// ── Operations team / system status updates ───────────────────────────────────

export const updateAssignmentStatus = async (assignmentId, newStatus, metadata = {}, actorId, actorType = 'system', client = null) => {
  const shouldCommit = !client;
  const db = shouldCommit ? await pool.connect() : client;

  try {
    if (shouldCommit) await db.query('BEGIN');

    const { rows: [assignment] } = await db.query(
      `SELECT * FROM ambulance_assignments WHERE id = $1 FOR UPDATE`,
      [assignmentId]
    );

    if (!assignment) throw new Error('Assignment not found');

    const allowed = ASSIGNMENT_TRANSITIONS[assignment.assignment_status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(
        `Invalid assignment transition: ${assignment.assignment_status} → ${newStatus}. ` +
        `Allowed: ${(allowed || []).join(', ')}`
      );
    }

    // Timestamp columns that record when each milestone occurred
    const TIMESTAMP_FIELDS = {
      IN_PROGRESS: 'en_route_at',
      COMPLETED:   'completed_at',
      CANCELLED:   'cancelled_at',
    };

    const tsField = TIMESTAMP_FIELDS[newStatus];

    const { rows: [updated] } = await db.query(
      `UPDATE ambulance_assignments
       SET assignment_status = $1${tsField ? `, ${tsField} = NOW()` : ''}
       WHERE id = $2 RETURNING *`,
      [newStatus, assignmentId]
    );

    // Mirror assignment milestones into the emergency timeline
    const EMERGENCY_EVENT_MAP = {
      IN_PROGRESS: EVENT_TYPES.AMBULANCE_EN_ROUTE,
      COMPLETED:   EVENT_TYPES.PATIENT_PICKED_UP,
    };
    if (EMERGENCY_EVENT_MAP[newStatus]) {
      await recordEvent(assignment.emergency_case_id, EMERGENCY_EVENT_MAP[newStatus], {
        assignment_id: assignmentId, ambulance_id: assignment.ambulance_id, ...metadata,
      }, db);
    }

    // Mirror into ambulance's own event log
    const AMBULANCE_EVENT_MAP = {
      IN_PROGRESS: 'EN_ROUTE',
      COMPLETED:   'PATIENT_PICKED_UP',
      CANCELLED:   'ASSIGNMENT_CANCELLED',
    };
    if (AMBULANCE_EVENT_MAP[newStatus]) {
      await recordAmbulanceEvent(assignment.ambulance_id, AMBULANCE_EVENT_MAP[newStatus], {
        assignment_id: assignmentId, ...metadata,
      }, actorType, actorId, db);
    }

    // Free the ambulance when the trip ends
    if (newStatus === 'COMPLETED' || newStatus === 'CANCELLED') {
      await transitionAmbulanceStatus(assignment.ambulance_id, 'AVAILABLE', actorId, actorType, db);
    }

    await logAmbulanceAudit(
      assignment.ambulance_id, assignmentId, actorType, actorId, `ASSIGNMENT_${newStatus}`, metadata, db
    );

    if (shouldCommit) await db.query('COMMIT');
    return updated;

  } catch (err) {
    if (shouldCommit) await db.query('ROLLBACK');
    throw err;
  } finally {
    if (shouldCommit) db.release();
  }
};
