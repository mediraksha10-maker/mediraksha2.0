import { pool }                   from '../../config/db.js';
import { recordEvent, EVENT_TYPES } from '../emergency/timelineService.js';

// ── Level 1: QR Scan ──────────────────────────────────────────────────────────
// QR payload: { "patient_id": "MRK-XXXXXX", "v": 1 }

export const identifyByQR = async (emergencyCaseId, qrRaw) => {
  let payload;
  try {
    payload = typeof qrRaw === 'string' ? JSON.parse(qrRaw) : qrRaw;
  } catch {
    return { success: false, reason: 'Invalid QR payload — cannot parse JSON' };
  }

  const mrkId = payload?.patient_id;
  if (!mrkId) return { success: false, reason: 'QR payload missing patient_id field' };

  return identifyByMrkId(emergencyCaseId, mrkId, 1);
};

// ── Level 2: MRK ID Lookup ────────────────────────────────────────────────────

export const identifyByMrkId = async (emergencyCaseId, rawId, _level = 2) => {
  const mrkId = rawId?.toUpperCase?.().trim();
  if (!mrkId || !/^MRK-\d{6}$/.test(mrkId)) {
    return { success: false, reason: 'Invalid MediRaksha ID format — expected MRK-XXXXXX' };
  }

  const { rows: [user] } = await pool.query(
    `SELECT id, name, mediraksha_id FROM "User" WHERE mediraksha_id = $1`,
    [mrkId]
  );

  if (!user) return { success: false, reason: 'No patient found with this MediRaksha ID' };

  await _linkPatient(emergencyCaseId, user.id, _level);

  return {
    success: true,
    level:           _level,
    patient_user_id: user.id,
    name:            user.name,
    mrk_id:          user.mediraksha_id,
  };
};

// ── Level 3: Contact Recovery (low-confidence) ────────────────────────────────

export const identifyByContact = async (emergencyCaseId, { name, phone }) => {
  if (!phone?.trim()) {
    return { success: false, reason: 'Phone number is required for contact recovery' };
  }

  // Try exact match on the User.number field
  const { rows: [user] } = await pool.query(
    `SELECT id, name, number FROM "User" WHERE number = $1 LIMIT 1`,
    [phone.trim()]
  );

  if (user) {
    await _linkPatient(emergencyCaseId, user.id, 3);
    return {
      success:              true,
      level:                3,
      patient_user_id:      user.id,
      name:                 user.name,
      confidence:           'LOW',
      requires_verification: true,
      note: 'Low-confidence match via phone. Hospital staff should verify identity.',
    };
  }

  return {
    success: false,
    reason:  'No registered account found with this phone number',
    partial: { reported_name: name ?? null, reported_phone: phone },
  };
};

// ── Level 4: Unknown Patient Mode ─────────────────────────────────────────────
// Always succeeds. Creates a UNK-YYYY-NNNNNN record and attaches to emergency.

export const assignUnknownPatient = async (emergencyCaseId, details = {}) => {
  const year = new Date().getFullYear();
  const { rows: [{ nextval }] } = await pool.query(`SELECT nextval('unknown_patient_seq')`);
  const unknownId = `UNK-${year}-${String(nextval).padStart(6, '0')}`;

  await pool.query(
    `INSERT INTO unknown_patients
       (unknown_id, emergency_case_id, reported_name, approximate_age, reported_gender, reported_phone, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      unknownId,
      emergencyCaseId,
      details.name        ?? null,
      details.age         ?? null,
      details.gender      ?? null,
      details.phone       ?? null,
      details.description ?? null,
    ]
  );

  await pool.query(
    `UPDATE emergency_cases
     SET patient_id_level = 4, patient_unknown_id = $1
     WHERE id = $2`,
    [unknownId, emergencyCaseId]
  );

  await recordEvent(emergencyCaseId, EVENT_TYPES.UNKNOWN_PATIENT_ASSIGNED, {
    unknown_id: unknownId,
    ...details,
  });

  return { success: true, level: 4, unknown_id: unknownId };
};

// ── Internal: link identified patient to emergency ────────────────────────────

const _linkPatient = async (emergencyCaseId, patientUserId, level) => {
  await pool.query(
    `UPDATE emergency_cases
     SET patient_user_id = $1, patient_id_level = $2
     WHERE id = $3`,
    [patientUserId, level, emergencyCaseId]
  );

  await recordEvent(emergencyCaseId, EVENT_TYPES.PATIENT_IDENTIFIED, {
    patient_user_id:      patientUserId,
    identification_level: level,
  });
};
