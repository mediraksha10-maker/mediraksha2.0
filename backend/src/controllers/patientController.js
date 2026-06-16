import { pool }                                                      from '../config/db.js';
import { getEmergencyProfile, upsertEmergencyProfile }              from '../services/patient/emergencyProfileService.js';
import {
  identifyByQR, identifyByMrkId, identifyByContact, assignUnknownPatient,
} from '../services/patient/patientIdentificationService.js';

const EMERGENCY_ID_RE = /^EMG-\d{4}-\d{6}$/;

// ── GET /patient/mrk-id ───────────────────────────────────────────────────────

export const getMrkIdHandler = async (req, res) => {
  try {
    const { rows: [user] } = await pool.query(
      `SELECT mediraksha_id, mrk_qr_payload FROM "User" WHERE id = $1`,
      [req.user.id]
    );
    return res.status(200).json({
      success: true,
      data: {
        mediraksha_id: user?.mediraksha_id ?? null,
        qr_payload:    user?.mrk_qr_payload ?? null,
      },
    });
  } catch (err) {
    console.error('getMrkIdHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── GET /patient/emergency-profile ────────────────────────────────────────────

export const getEmergencyProfileHandler = async (req, res) => {
  try {
    const profile = await getEmergencyProfile(req.user.id);
    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    console.error('getEmergencyProfileHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── PUT /patient/emergency-profile ────────────────────────────────────────────

export const upsertEmergencyProfileHandler = async (req, res) => {
  try {
    const updated = await upsertEmergencyProfile(req.user.id, req.body);
    if (!updated) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }
    return res.status(200).json({ success: true, message: 'Emergency profile updated', data: updated });
  } catch (err) {
    if (err.code === 'INVALID_BLOOD_GROUP') {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('upsertEmergencyProfileHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── POST /emergency/:emergency_id/identify ────────────────────────────────────

export const identifyPatientHandler = async (req, res) => {
  try {
    const { emergency_id } = req.params;

    if (!EMERGENCY_ID_RE.test(emergency_id)) {
      return res.status(400).json({ success: false, message: 'Invalid emergency ID format' });
    }

    const { rows: [ec] } = await pool.query(
      `SELECT id FROM emergency_cases WHERE emergency_id = $1`,
      [emergency_id]
    );
    if (!ec) return res.status(404).json({ success: false, message: 'Emergency not found' });

    const { method, mrk_id, qr_data, name, phone, age, gender, description } = req.body;

    let result;
    switch (method) {
      case 'qr':
        if (!qr_data)
          return res.status(400).json({ success: false, message: 'qr_data required for method=qr' });
        result = await identifyByQR(ec.id, qr_data);
        break;

      case 'mrk_id':
        if (!mrk_id)
          return res.status(400).json({ success: false, message: 'mrk_id required for method=mrk_id' });
        result = await identifyByMrkId(ec.id, mrk_id);
        break;

      case 'contact':
        result = await identifyByContact(ec.id, { name, phone });
        break;

      case 'unknown':
        result = await assignUnknownPatient(ec.id, { name, age, gender, phone, description });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'method must be one of: qr | mrk_id | contact | unknown',
        });
    }

    return res.status(result.success ? 200 : 422).json({ success: result.success, data: result });

  } catch (err) {
    console.error('identifyPatientHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
