import { pool } from '../../config/db.js';

// All valid event types — extend here when new lifecycle stages are added
export const EVENT_TYPES = Object.freeze({
  EMERGENCY_CREATED:   'EMERGENCY_CREATED',
  LOCATION_CAPTURED:   'LOCATION_CAPTURED',
  TOKEN_CREATED:       'TOKEN_CREATED',
  QR_GENERATED:        'QR_GENERATED',
  FAMILY_NOTIFIED:     'FAMILY_NOTIFIED',
  STATUS_UPDATED:      'STATUS_UPDATED',
  EMERGENCY_CANCELLED: 'EMERGENCY_CANCELLED',
  EMERGENCY_COMPLETED: 'EMERGENCY_COMPLETED',
  HOSPITAL_ASSIGNED:   'HOSPITAL_ASSIGNED',
  // ── Week 3: Ambulance lifecycle events ───────────────────────────────────────
  AMBULANCE_MATCHED:   'AMBULANCE_MATCHED',   // system selected best ambulance
  AMBULANCE_ASSIGNED:  'AMBULANCE_ASSIGNED',  // assignment record created (PENDING)
  DRIVER_ACCEPTED:     'DRIVER_ACCEPTED',     // driver confirmed the trip
  DRIVER_REJECTED:     'DRIVER_REJECTED',     // driver declined — triggers re-match
  AMBULANCE_EN_ROUTE:  'AMBULANCE_EN_ROUTE',  // driver marked in-progress
  PATIENT_PICKED_UP:   'PATIENT_PICKED_UP',   // assignment completed
  PATIENT_ADMITTED:    'PATIENT_ADMITTED',    // hospital admitted the patient
  PATIENT_DROPPED:     'PATIENT_DROPPED',     // ambulance dropped at destination (non-hospital)
  TOKEN_REVOKED:          'TOKEN_REVOKED',
  ACCESS_GRANTED:         'ACCESS_GRANTED',
  // ── Week 4: Auto-dispatch + patient identification ────────────────────────────
  AUTO_DISPATCH_STARTED:  'AUTO_DISPATCH_STARTED',
  AUTO_DISPATCH_COMPLETED:'AUTO_DISPATCH_COMPLETED',
  PATIENT_IDENTIFIED:     'PATIENT_IDENTIFIED',
  UNKNOWN_PATIENT_ASSIGNED:'UNKNOWN_PATIENT_ASSIGNED',
  STAFF_TOKEN_ISSUED:     'STAFF_TOKEN_ISSUED',
  STAFF_TOKEN_REVOKED:    'STAFF_TOKEN_REVOKED',
});

export const recordEvent = async (emergencyCaseId, eventType, eventData = {}, client = null) => {
  const db = client || pool;
  const { rows } = await db.query(
    `INSERT INTO emergency_events (emergency_case_id, event_type, event_data)
     VALUES ($1, $2, $3)
     RETURNING id, event_type, event_data, created_at`,
    [emergencyCaseId, eventType, JSON.stringify(eventData)]
  );
  return rows[0];
};

export const getTimeline = async (emergencyCaseId) => {
  const { rows } = await pool.query(
    `SELECT id, event_type, event_data, created_at
     FROM emergency_events
     WHERE emergency_case_id = $1
     ORDER BY created_at ASC, id ASC`,
    [emergencyCaseId]
  );
  return rows;
};
