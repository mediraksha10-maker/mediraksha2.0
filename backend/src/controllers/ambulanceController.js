import { pool } from '../config/db.js';
import {
  createAmbulance, updateAmbulance, getAmbulanceById,
  addDriver, getDriversByAmbulance, getDriverByUserId,
  ambulanceExists,
  VALID_AMBULANCE_TYPES, VALID_OWNERSHIP_TYPES, VALID_AMBULANCE_STATUSES,
} from '../services/ambulance/ambulanceDataService.js';
import { findAmbulancesNearby }            from '../services/ambulance/ambulanceSearchService.js';
import { transitionAmbulanceStatus, getAllowedTransitions } from '../services/ambulance/ambulanceStatusEngine.js';
import { updateAmbulanceLocation, getLatestLocation, getLocationHistory } from '../services/ambulance/ambulanceLocationService.js';
import { matchAmbulanceForEmergency }      from '../services/ambulance/ambulanceMatchingEngine.js';
import {
  getAssignmentById, getAssignmentsByEmergency,
  acceptAssignment, rejectAssignment, updateAssignmentStatus,
} from '../services/ambulance/ambulanceAssignmentService.js';

// ── Shared helpers ────────────────────────────────────────────────────────────

const EMERGENCY_ID_RE = /^EMG-\d{4}-\d{6}$/;

const isValidCoord = (lat, lng) => {
  const la = parseFloat(lat), lo = parseFloat(lng);
  return !isNaN(la) && !isNaN(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
};

const parseIntParam = (v, fallback) => {
  const n = parseInt(v, 10);
  return isNaN(n) ? fallback : n;
};

// ── Ambulance registry ────────────────────────────────────────────────────────

export const createAmbulanceHandler = async (req, res) => {
  try {
    const { registration_number, ambulance_type, ownership_type, hospital_id } = req.body;

    if (!registration_number?.trim()) {
      return res.status(400).json({ success: false, message: 'registration_number is required' });
    }
    if (!ambulance_type || !VALID_AMBULANCE_TYPES.has(ambulance_type)) {
      return res.status(400).json({
        success: false,
        message: `ambulance_type must be one of: ${[...VALID_AMBULANCE_TYPES].join(', ')}`,
      });
    }
    if (ownership_type && !VALID_OWNERSHIP_TYPES.has(ownership_type)) {
      return res.status(400).json({
        success: false,
        message: `ownership_type must be one of: ${[...VALID_OWNERSHIP_TYPES].join(', ')}`,
      });
    }

    const ambulance = await createAmbulance(
      { registration_number: registration_number.trim(), ambulance_type, ownership_type, hospital_id },
      req.user.id
    );

    return res.status(201).json({ success: true, message: 'Ambulance registered', data: ambulance });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Registration number already exists' });
    }
    console.error('createAmbulanceHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateAmbulanceHandler = async (req, res) => {
  try {
    const id = parseIntParam(req.params.id, NaN);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ambulance ID' });

    if (req.body.ambulance_type && !VALID_AMBULANCE_TYPES.has(req.body.ambulance_type)) {
      return res.status(400).json({
        success: false,
        message: `ambulance_type must be one of: ${[...VALID_AMBULANCE_TYPES].join(', ')}`,
      });
    }
    if (req.body.ownership_type && !VALID_OWNERSHIP_TYPES.has(req.body.ownership_type)) {
      return res.status(400).json({
        success: false,
        message: `ownership_type must be one of: ${[...VALID_OWNERSHIP_TYPES].join(', ')}`,
      });
    }

    const result = await updateAmbulance(id, req.body, req.user.id);
    if (!result) return res.status(404).json({ success: false, message: 'Ambulance not found' });

    return res.status(200).json({ success: true, message: 'Ambulance updated', data: result });
  } catch (err) {
    console.error('updateAmbulanceHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getAmbulanceHandler = async (req, res) => {
  try {
    const id = parseIntParam(req.params.id, NaN);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ambulance ID' });

    const ambulance = await getAmbulanceById(id);
    if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found' });

    return res.status(200).json({ success: true, data: ambulance });
  } catch (err) {
    console.error('getAmbulanceHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Status management ─────────────────────────────────────────────────────────

export const changeAmbulanceStatusHandler = async (req, res) => {
  try {
    const id = parseIntParam(req.params.id, NaN);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ambulance ID' });

    const { status } = req.body;
    if (!status || !VALID_AMBULANCE_STATUSES.has(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${[...VALID_AMBULANCE_STATUSES].join(', ')}`,
      });
    }

    const updated = await transitionAmbulanceStatus(id, status, req.user.id, 'admin');
    return res.status(200).json({
      success: true,
      message: `Status changed to ${status}`,
      data: {
        id: updated.id,
        ambulance_code:  updated.ambulance_code,
        current_status:  updated.current_status,
        allowed_next:    getAllowedTransitions(updated.current_status),
      },
    });
  } catch (err) {
    if (err.message?.startsWith('Invalid status transition')) {
      return res.status(409).json({ success: false, message: err.message });
    }
    console.error('changeAmbulanceStatusHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Driver management ─────────────────────────────────────────────────────────

export const addDriverHandler = async (req, res) => {
  try {
    const ambulanceId = parseIntParam(req.params.id, NaN);
    if (isNaN(ambulanceId)) return res.status(400).json({ success: false, message: 'Invalid ambulance ID' });

    const { driver_name, phone, license_number, user_id } = req.body;
    if (!driver_name?.trim())   return res.status(400).json({ success: false, message: 'driver_name is required' });
    if (!phone?.trim())         return res.status(400).json({ success: false, message: 'phone is required' });
    if (!license_number?.trim()) return res.status(400).json({ success: false, message: 'license_number is required' });

    if (!(await ambulanceExists(ambulanceId))) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }

    const driver = await addDriver(ambulanceId, { driver_name, phone, license_number, user_id }, req.user.id);
    return res.status(201).json({ success: true, message: 'Driver added', data: driver });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'License number already registered' });
    }
    console.error('addDriverHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getDriversHandler = async (req, res) => {
  try {
    const ambulanceId = parseIntParam(req.params.id, NaN);
    if (isNaN(ambulanceId)) return res.status(400).json({ success: false, message: 'Invalid ambulance ID' });

    const drivers = await getDriversByAmbulance(ambulanceId);
    return res.status(200).json({ success: true, data: drivers, count: drivers.length });
  } catch (err) {
    console.error('getDriversHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Location tracking ─────────────────────────────────────────────────────────

export const updateLocationHandler = async (req, res) => {
  try {
    const ambulanceId = parseIntParam(req.params.id, NaN);
    if (isNaN(ambulanceId)) return res.status(400).json({ success: false, message: 'Invalid ambulance ID' });

    const { latitude, longitude, speed, heading, accuracy } = req.body;

    if (latitude === undefined || longitude === undefined || !isValidCoord(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required' });
    }

    // Drivers can only update location for their own ambulance
    if (req.driverRecord) {
      if (req.driverRecord.ambulance_db_id !== ambulanceId) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this ambulance' });
      }
    } else if (!(await ambulanceExists(ambulanceId))) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }

    const record = await updateAmbulanceLocation(
      ambulanceId,
      { latitude: parseFloat(latitude), longitude: parseFloat(longitude), speed, heading, accuracy },
      req.user.id
    );

    return res.status(200).json({ success: true, message: 'Location updated', data: record });
  } catch (err) {
    console.error('updateLocationHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getLocationHandler = async (req, res) => {
  try {
    const ambulanceId = parseIntParam(req.params.id, NaN);
    if (isNaN(ambulanceId)) return res.status(400).json({ success: false, message: 'Invalid ambulance ID' });

    const location = await getLatestLocation(ambulanceId);
    if (!location.current) return res.status(404).json({ success: false, message: 'Ambulance not found' });

    return res.status(200).json({ success: true, data: location });
  } catch (err) {
    console.error('getLocationHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getLocationHistoryHandler = async (req, res) => {
  try {
    const ambulanceId = parseIntParam(req.params.id, NaN);
    if (isNaN(ambulanceId)) return res.status(400).json({ success: false, message: 'Invalid ambulance ID' });

    const { from, to, limit = '100' } = req.query;
    const records = await getLocationHistory(ambulanceId, {
      fromTime: from ?? null,
      toTime:   to   ?? null,
      limit:    Math.min(500, parseIntParam(limit, 100)),
    });

    return res.status(200).json({ success: true, data: records, count: records.length });
  } catch (err) {
    console.error('getLocationHistoryHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Ambulance search ──────────────────────────────────────────────────────────

export const getNearbyAmbulancesHandler = async (req, res) => {
  try {
    const { latitude, longitude, radius = '10', ambulance_type, ownership_type, status, limit = '20' } = req.query;

    if (!latitude || !longitude || !isValidCoord(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required' });
    }

    const radiusKm = parseFloat(radius);
    if (isNaN(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
      return res.status(400).json({ success: false, message: 'radius must be between 0.1 and 100 km' });
    }

    if (ambulance_type && !VALID_AMBULANCE_TYPES.has(ambulance_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ambulance_type. Valid: ${[...VALID_AMBULANCE_TYPES].join(', ')}`,
      });
    }
    if (ownership_type && !VALID_OWNERSHIP_TYPES.has(ownership_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ownership_type. Valid: ${[...VALID_OWNERSHIP_TYPES].join(', ')}`,
      });
    }
    if (status && !VALID_AMBULANCE_STATUSES.has(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid: ${[...VALID_AMBULANCE_STATUSES].join(', ')}`,
      });
    }

    const ambulances = await findAmbulancesNearby(
      parseFloat(latitude), parseFloat(longitude), radiusKm,
      {
        status:        status        ?? 'AVAILABLE',
        ambulanceType: ambulance_type ?? null,
        ownershipType: ownership_type ?? null,
        limit:         Math.min(50, parseIntParam(limit, 20)),
      }
    );

    return res.status(200).json({
      success: true,
      data:    ambulances,
      count:   ambulances.length,
      search:  { latitude: parseFloat(latitude), longitude: parseFloat(longitude), radius_km: radiusKm },
    });
  } catch (err) {
    console.error('getNearbyAmbulancesHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Assignments ───────────────────────────────────────────────────────────────

export const getAssignmentHandler = async (req, res) => {
  try {
    const id = parseIntParam(req.params.id, NaN);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid assignment ID' });

    const assignment = await getAssignmentById(id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    return res.status(200).json({ success: true, data: assignment });
  } catch (err) {
    console.error('getAssignmentHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateAssignmentStatusHandler = async (req, res) => {
  try {
    const id = parseIntParam(req.params.id, NaN);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid assignment ID' });

    const { status, reason, notes } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'status is required' });

    const DRIVER_ACTIONS = ['ACCEPTED', 'REJECTED'];
    const OPS_ACTIONS    = ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

    // Drivers accept/reject their own assignments
    if (DRIVER_ACTIONS.includes(status)) {
      if (!req.driverRecord) {
        return res.status(403).json({ success: false, message: 'Only drivers can accept or reject assignments' });
      }

      // Verify the driver is linked to the ambulance in this assignment
      const assignment = await getAssignmentById(id);
      if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

      if (assignment.ambulance_id !== req.driverRecord.ambulance_db_id) {
        return res.status(403).json({ success: false, message: 'This assignment is not for your ambulance' });
      }

      let updated;
      if (status === 'ACCEPTED') {
        updated = await acceptAssignment(id, req.driverRecord.id);
      } else {
        updated = await rejectAssignment(id, req.driverRecord.id, reason ?? null);
      }

      return res.status(200).json({ success: true, message: `Assignment ${status.toLowerCase()}`, data: updated });
    }

    // OPS / system status updates
    if (OPS_ACTIONS.includes(status)) {
      const updated = await updateAssignmentStatus(
        id, status, { notes: notes ?? null }, req.user.id, 'admin'
      );
      return res.status(200).json({ success: true, message: `Assignment status → ${status}`, data: updated });
    }

    return res.status(400).json({
      success: false,
      message: `status must be one of: ${[...DRIVER_ACTIONS, ...OPS_ACTIONS].join(', ')}`,
    });
  } catch (err) {
    if (err.message?.includes('transition') || err.message?.includes('already')) {
      return res.status(409).json({ success: false, message: err.message });
    }
    console.error('updateAssignmentStatusHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Emergency-ambulance matching ──────────────────────────────────────────────

export const matchAmbulanceForEmergencyHandler = async (req, res) => {
  try {
    const userId       = req.user.id;
    const { emergency_id } = req.params;

    if (!EMERGENCY_ID_RE.test(emergency_id)) {
      return res.status(400).json({ success: false, message: 'Invalid emergency ID format' });
    }

    const { rows: [emergencyCase] } = await pool.query(
      `SELECT id, user_id, status, latitude, longitude FROM emergency_cases WHERE emergency_id = $1`,
      [emergency_id]
    );

    if (!emergencyCase) return res.status(404).json({ success: false, message: 'Emergency not found' });

    if (emergencyCase.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this emergency' });
    }

    const radiusKm     = req.body?.radius      ? parseFloat(req.body.radius)     : 10;
    const requiredType = req.body?.ambulance_type ?? null;

    if (requiredType && !VALID_AMBULANCE_TYPES.has(requiredType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ambulance_type. Valid: ${[...VALID_AMBULANCE_TYPES].join(', ')}`,
      });
    }

    const result = await matchAmbulanceForEmergency(
      emergencyCase.id,
      parseFloat(emergencyCase.latitude),
      parseFloat(emergencyCase.longitude),
      {
        radiusKm:     isNaN(radiusKm) ? 10 : Math.min(Math.max(1, radiusKm), 30),
        requiredType: requiredType ?? null,
      }
    );

    if (!result.matched) {
      return res.status(404).json({ success: false, message: result.reason });
    }

    return res.status(200).json({
      success: true,
      message: 'Ambulance matched successfully',
      data:    result,
    });
  } catch (err) {
    if (err.message?.includes('terminal status') || err.message?.includes('active ambulance')) {
      return res.status(409).json({ success: false, message: err.message });
    }
    console.error('matchAmbulanceForEmergencyHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
