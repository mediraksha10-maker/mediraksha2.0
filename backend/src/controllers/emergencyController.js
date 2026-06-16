import { pool } from '../config/db.js';
import {
  createEmergency,
  getEmergencyByEmergencyId,
  cancelEmergency,
} from '../services/emergency/emergencyService.js';
import { getTimeline } from '../services/emergency/timelineService.js';
import { validateToken } from '../services/emergency/tokenService.js';
import { logAudit } from '../services/emergency/auditService.js';
import { autoDispatch } from '../services/emergency/autoDispatchService.js';

// ── Helpers ─────────────────────────────────────────────────

const EMERGENCY_ID_RE = /^EMG-\d{4}-\d{6}$/;

const isValidCoordinate = (lat, lng) => {
  const la = parseFloat(lat);
  const lo = parseFloat(lng);
  return !isNaN(la) && !isNaN(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
};

// ── Emergency Cases ─────────────────────────────────────────

export const triggerEmergency = async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, location_accuracy, emergency_type } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
    }

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates. latitude must be between -90 and 90, longitude between -180 and 180',
      });
    }

    if (location_accuracy !== undefined && isNaN(parseFloat(location_accuracy))) {
      return res.status(400).json({ success: false, message: 'location_accuracy must be a number' });
    }

    const result = await createEmergency(
      userId,
      parseFloat(latitude),
      parseFloat(longitude),
      location_accuracy != null ? parseFloat(location_accuracy) : null,
      emergency_type || null
    );

    // Fire auto-dispatch in background — NEVER await this, response must be instant
    const { case_id, ...responseData } = result;
    setImmediate(() => {
      autoDispatch(case_id, parseFloat(latitude), parseFloat(longitude))
        .catch(err => console.error(`[triggerEmergency] auto-dispatch failed for case ${case_id}:`, err.message));
    });

    return res.status(201).json({
      success: true,
      message: 'Emergency created — dispatch initiated',
      data: { ...responseData, dispatch_status: 'DISPATCHING' },
    });

  } catch (error) {
    console.error('triggerEmergency error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getEmergencyDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { emergency_id } = req.params;

    if (!EMERGENCY_ID_RE.test(emergency_id)) {
      return res.status(400).json({ success: false, message: 'Invalid emergency ID format' });
    }

    const result = await getEmergencyByEmergencyId(emergency_id, userId);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }

    return res.status(200).json({ success: true, data: result });

  } catch (error) {
    console.error('getEmergencyDetails error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getEmergencyTimeline = async (req, res) => {
  try {
    const userId = req.user.id;
    const { emergency_id } = req.params;

    if (!EMERGENCY_ID_RE.test(emergency_id)) {
      return res.status(400).json({ success: false, message: 'Invalid emergency ID format' });
    }

    const { rows: [emergencyCase] } = await pool.query(
      `SELECT id, user_id FROM emergency_cases WHERE emergency_id = $1`,
      [emergency_id]
    );

    if (!emergencyCase || emergencyCase.user_id !== userId) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }

    const events = await getTimeline(emergencyCase.id);

    return res.status(200).json({
      success: true,
      data: { emergency_id, event_count: events.length, events },
    });

  } catch (error) {
    console.error('getEmergencyTimeline error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const cancelEmergencyHandler = async (req, res) => {
  try {
    const userId = req.user.id;
    const { emergency_id } = req.params;

    if (!EMERGENCY_ID_RE.test(emergency_id)) {
      return res.status(400).json({ success: false, message: 'Invalid emergency ID format' });
    }

    const result = await cancelEmergency(emergency_id, userId);

    if (result.error === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }
    if (result.error === 'FORBIDDEN') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this emergency' });
    }
    if (result.error === 'ALREADY_CLOSED') {
      return res.status(409).json({
        success: false,
        message: `Emergency is already ${result.status.toLowerCase()}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Emergency cancelled successfully',
      data: result,
    });

  } catch (error) {
    console.error('cancelEmergencyHandler error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const validateEmergencyToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 32) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    const result = await validateToken(token);

    if (!result.valid) {
      return res.status(401).json({ success: false, message: result.reason });
    }

    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        emergency_id: result.data.emergency_id,
        case_status:  result.data.case_status,
        expires_at:   result.data.expires_at,
      },
    });

  } catch (error) {
    console.error('validateEmergencyToken error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Dispatch Status (polled by frontend every 2s) ───────────

export const getDispatchStatusHandler = async (req, res) => {
  try {
    const userId = req.user.id;
    const { emergency_id } = req.params;

    if (!EMERGENCY_ID_RE.test(emergency_id)) {
      return res.status(400).json({ success: false, message: 'Invalid emergency ID format' });
    }

    const { rows: [ec] } = await pool.query(
      `SELECT id, user_id, status,
              dispatch_hospital_status, dispatch_ambulance_status,
              dispatch_started_at, dispatch_completed_at,
              patient_user_id, patient_id_level, patient_unknown_id
       FROM emergency_cases WHERE emergency_id = $1`,
      [emergency_id]
    );

    if (!ec || ec.user_id !== userId) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }

    // Latest matched hospital — read from ranking log (rank 1 = best match)
    let hospital = null;
    if (ec.dispatch_hospital_status === 'MATCHED') {
      const { rows: [ha] } = await pool.query(
        `SELECT h.id, h.hospital_name AS name,
                h.city, h.latitude, h.longitude, h.phone,
                rl.distance_km
         FROM hospital_ranking_logs rl
         JOIN hospitals h ON h.id = rl.hospital_id
         WHERE rl.emergency_case_id = $1 AND rl.rank_position = 1
         ORDER BY rl.created_at DESC LIMIT 1`,
        [ec.id]
      );
      hospital = ha ?? null;
    }

    // Latest active ambulance assignment
    let ambulance = null;
    if (ec.dispatch_ambulance_status === 'MATCHED') {
      const { rows: [aa] } = await pool.query(
        `SELECT aa.id AS assignment_id, aa.assignment_status,
                a.ambulance_code, a.ambulance_type, a.registration_number,
                a.current_latitude, a.current_longitude
         FROM ambulance_assignments aa
         JOIN ambulances a ON a.id = aa.ambulance_id
         WHERE aa.emergency_case_id = $1
           AND aa.assignment_status NOT IN ('REJECTED','CANCELLED')
         ORDER BY aa.created_at DESC LIMIT 1`,
        [ec.id]
      );
      ambulance = aa ?? null;
    }

    return res.status(200).json({
      success: true,
      data: {
        emergency_id,
        status: ec.status,
        dispatch: {
          hospital:     { status: ec.dispatch_hospital_status  ?? 'PENDING', detail: hospital },
          ambulance:    { status: ec.dispatch_ambulance_status ?? 'PENDING', detail: ambulance },
          started_at:   ec.dispatch_started_at,
          completed_at: ec.dispatch_completed_at,
        },
        patient: {
          identification_level: ec.patient_id_level,
          patient_user_id:      ec.patient_user_id,
          unknown_id:           ec.patient_unknown_id,
        },
      },
    });

  } catch (err) {
    console.error('getDispatchStatusHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Emergency Contacts ──────────────────────────────────────

const VALID_PHONE_RE = /^\+?[\d\s\-().]{7,20}$/;

export const addEmergencyContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contact_name, contact_phone, relationship, priority } = req.body;

    if (!contact_name?.trim()) {
      return res.status(400).json({ success: false, message: 'contact_name is required' });
    }
    if (!contact_phone?.trim() || !VALID_PHONE_RE.test(contact_phone.trim())) {
      return res.status(400).json({ success: false, message: 'A valid contact_phone is required' });
    }

    const parsedPriority = priority !== undefined ? parseInt(priority, 10) : 1;
    if (isNaN(parsedPriority) || parsedPriority < 1 || parsedPriority > 10) {
      return res.status(400).json({ success: false, message: 'priority must be an integer between 1 and 10' });
    }

    const { rows } = await pool.query(
      `INSERT INTO emergency_contacts (user_id, contact_name, contact_phone, relationship, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, contact_name, contact_phone, relationship, priority, created_at`,
      [userId, contact_name.trim(), contact_phone.trim(), relationship?.trim() || null, parsedPriority]
    );

    return res.status(201).json({ success: true, message: 'Emergency contact added', data: rows[0] });

  } catch (error) {
    console.error('addEmergencyContact error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getEmergencyContacts = async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      `SELECT id, contact_name, contact_phone, relationship, priority, created_at
       FROM emergency_contacts
       WHERE user_id = $1
       ORDER BY priority ASC, created_at ASC`,
      [userId]
    );

    return res.status(200).json({ success: true, data: rows, count: rows.length });

  } catch (error) {
    console.error('getEmergencyContacts error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateEmergencyContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const contactId = parseInt(req.params.id, 10);

    if (isNaN(contactId)) {
      return res.status(400).json({ success: false, message: 'Invalid contact ID' });
    }

    const { rows: [existing] } = await pool.query(
      `SELECT id FROM emergency_contacts WHERE id = $1 AND user_id = $2`,
      [contactId, userId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Emergency contact not found' });
    }

    const { contact_name, contact_phone, relationship, priority } = req.body;

    const updates = [];
    const values  = [];

    if (contact_name !== undefined) {
      if (!contact_name.trim()) {
        return res.status(400).json({ success: false, message: 'contact_name cannot be empty' });
      }
      updates.push(`contact_name = $${values.length + 1}`);
      values.push(contact_name.trim());
    }

    if (contact_phone !== undefined) {
      if (!VALID_PHONE_RE.test(contact_phone.trim())) {
        return res.status(400).json({ success: false, message: 'Invalid contact_phone format' });
      }
      updates.push(`contact_phone = $${values.length + 1}`);
      values.push(contact_phone.trim());
    }

    if (relationship !== undefined) {
      updates.push(`relationship = $${values.length + 1}`);
      values.push(relationship?.trim() || null);
    }

    if (priority !== undefined) {
      const p = parseInt(priority, 10);
      if (isNaN(p) || p < 1 || p > 10) {
        return res.status(400).json({ success: false, message: 'priority must be between 1 and 10' });
      }
      updates.push(`priority = $${values.length + 1}`);
      values.push(p);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(contactId);
    const { rows } = await pool.query(
      `UPDATE emergency_contacts SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING id, contact_name, contact_phone, relationship, priority, created_at`,
      values
    );

    return res.status(200).json({ success: true, message: 'Emergency contact updated', data: rows[0] });

  } catch (error) {
    console.error('updateEmergencyContact error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteEmergencyContact = async (req, res) => {
  try {
    const userId    = req.user.id;
    const contactId = parseInt(req.params.id, 10);

    if (isNaN(contactId)) {
      return res.status(400).json({ success: false, message: 'Invalid contact ID' });
    }

    const { rows } = await pool.query(
      `DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2 RETURNING id`,
      [contactId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Emergency contact not found' });
    }

    return res.status(200).json({ success: true, message: 'Emergency contact removed' });

  } catch (error) {
    console.error('deleteEmergencyContact error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
