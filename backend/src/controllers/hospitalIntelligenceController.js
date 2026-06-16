import { pool } from '../config/db.js';
import {
  createHospital,
  updateHospital,
  getHospitalById,
  addFacility,
  updateFacility,
  getFacilities,
  addDepartment,
  addContact,
  hospitalExists,
  VALID_HOSPITAL_TYPES,
  VALID_FACILITY_TYPES,
} from '../services/hospital/hospitalDataService.js';
import { findHospitalsNearby, searchHospitals } from '../services/hospital/hospitalSearchService.js';
import { matchHospitalForEmergency } from '../services/hospital/hospitalMatchingEngine.js';
import { bulkImportHospitals, getImportProvider } from '../services/hospital/hospitalImportInterface.js';

// ── Shared validators ─────────────────────────────────────────────────────────

const isValidCoord = (lat, lng) => {
  const la = parseFloat(lat), lo = parseFloat(lng);
  return !isNaN(la) && !isNaN(lo) && la >= -90 && la <= 90 && lo >= -180 && lo <= 180;
};

const EMERGENCY_ID_RE = /^EMG-\d{4}-\d{6}$/;

const parseIntParam = (v, fallback) => {
  const n = parseInt(v, 10);
  return isNaN(n) ? fallback : n;
};

// ── Hospital CRUD ─────────────────────────────────────────────────────────────

export const createHospitalHandler = async (req, res) => {
  try {
    const { hospital_name, hospital_type, latitude, longitude, ...rest } = req.body;

    if (!hospital_name?.trim()) {
      return res.status(400).json({ success: false, message: 'hospital_name is required' });
    }
    if (!hospital_type || !VALID_HOSPITAL_TYPES.has(hospital_type)) {
      return res.status(400).json({
        success: false,
        message: `hospital_type must be one of: ${[...VALID_HOSPITAL_TYPES].join(', ')}`,
      });
    }
    if (latitude === undefined || longitude === undefined || !isValidCoord(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required' });
    }

    if (rest.rating !== undefined) {
      const r = parseFloat(rest.rating);
      if (isNaN(r) || r < 0 || r > 5) {
        return res.status(400).json({ success: false, message: 'rating must be between 0 and 5' });
      }
    }

    const result = await createHospital(
      {
        hospital_name: hospital_name.trim(),
        hospital_type,
        latitude:      parseFloat(latitude),
        longitude:     parseFloat(longitude),
        ...rest,
      },
      req.user.id
    );

    return res.status(201).json({
      success: true,
      message: 'Hospital created',
      data: result,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Hospital code conflict — try again' });
    }
    console.error('createHospitalHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateHospitalHandler = async (req, res) => {
  try {
    const hospitalId = parseIntParam(req.params.id, NaN);
    if (isNaN(hospitalId)) return res.status(400).json({ success: false, message: 'Invalid hospital ID' });

    if (req.body.hospital_type && !VALID_HOSPITAL_TYPES.has(req.body.hospital_type)) {
      return res.status(400).json({
        success: false,
        message: `hospital_type must be one of: ${[...VALID_HOSPITAL_TYPES].join(', ')}`,
      });
    }

    const result = await updateHospital(hospitalId, req.body, req.user.id);
    if (!result) return res.status(404).json({ success: false, message: 'Hospital not found' });

    return res.status(200).json({ success: true, message: 'Hospital updated', data: result });
  } catch (err) {
    console.error('updateHospitalHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getHospitalHandler = async (req, res) => {
  try {
    const hospitalId = parseIntParam(req.params.id, NaN);
    if (isNaN(hospitalId)) return res.status(400).json({ success: false, message: 'Invalid hospital ID' });

    const hospital = await getHospitalById(hospitalId);
    if (!hospital) return res.status(404).json({ success: false, message: 'Hospital not found' });

    return res.status(200).json({ success: true, data: hospital });
  } catch (err) {
    console.error('getHospitalHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Geospatial search ─────────────────────────────────────────────────────────

export const getNearbyHospitalsHandler = async (req, res) => {
  try {
    const { latitude, longitude, radius = '10', hospital_type, facility_type, limit = '20' } = req.query;

    if (!latitude || !longitude || !isValidCoord(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required' });
    }

    const radiusKm = parseFloat(radius);
    if (isNaN(radiusKm) || radiusKm <= 0 || radiusKm > 100) {
      return res.status(400).json({ success: false, message: 'radius must be between 0.1 and 100 km' });
    }

    if (hospital_type && !VALID_HOSPITAL_TYPES.has(hospital_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid hospital_type. Valid: ${[...VALID_HOSPITAL_TYPES].join(', ')}`,
      });
    }

    if (facility_type && !VALID_FACILITY_TYPES.has(facility_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid facility_type. Valid: ${[...VALID_FACILITY_TYPES].join(', ')}`,
      });
    }

    const hospitals = await findHospitalsNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      radiusKm,
      {
        hospitalType: hospital_type ?? null,
        facilityType: facility_type ?? null,
        limit:        Math.min(50, parseIntParam(limit, 20)),
      }
    );

    return res.status(200).json({
      success: true,
      data: hospitals,
      count: hospitals.length,
      search: {
        latitude:  parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius_km: radiusKm,
      },
    });
  } catch (err) {
    console.error('getNearbyHospitalsHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const searchHospitalsHandler = async (req, res) => {
  try {
    const { city, facility, department, type, page = '1', limit = '20' } = req.query;

    if (type && !VALID_HOSPITAL_TYPES.has(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Valid: ${[...VALID_HOSPITAL_TYPES].join(', ')}`,
      });
    }

    if (facility && !VALID_FACILITY_TYPES.has(facility)) {
      return res.status(400).json({
        success: false,
        message: `Invalid facility. Valid: ${[...VALID_FACILITY_TYPES].join(', ')}`,
      });
    }

    const hospitals = await searchHospitals({
      city:          city?.trim()       ?? null,
      facilityType:  facility           ?? null,
      departmentName: department?.trim() ?? null,
      hospitalType:  type               ?? null,
      page:          Math.max(1, parseIntParam(page, 1)),
      limit:         Math.min(50, Math.max(1, parseIntParam(limit, 20))),
    });

    return res.status(200).json({ success: true, data: hospitals, count: hospitals.length });
  } catch (err) {
    console.error('searchHospitalsHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Facilities ────────────────────────────────────────────────────────────────

export const getHospitalFacilitiesHandler = async (req, res) => {
  try {
    const hospitalId = parseIntParam(req.params.id, NaN);
    if (isNaN(hospitalId)) return res.status(400).json({ success: false, message: 'Invalid hospital ID' });

    const facilities = await getFacilities(hospitalId);
    return res.status(200).json({ success: true, data: facilities, count: facilities.length });
  } catch (err) {
    console.error('getHospitalFacilitiesHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const addFacilityHandler = async (req, res) => {
  try {
    const hospitalId = parseIntParam(req.params.id, NaN);
    if (isNaN(hospitalId)) return res.status(400).json({ success: false, message: 'Invalid hospital ID' });

    const { facility_code, facility_name, facility_type, is_available } = req.body;

    if (!facility_code?.trim()) return res.status(400).json({ success: false, message: 'facility_code is required' });
    if (!facility_name?.trim()) return res.status(400).json({ success: false, message: 'facility_name is required' });
    if (!facility_type || !VALID_FACILITY_TYPES.has(facility_type)) {
      return res.status(400).json({
        success: false,
        message: `facility_type must be one of: ${[...VALID_FACILITY_TYPES].join(', ')}`,
      });
    }

    if (!(await hospitalExists(hospitalId))) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    const facility = await addFacility(hospitalId, {
      facility_code: facility_code.trim().toUpperCase(),
      facility_name: facility_name.trim(),
      facility_type,
      is_available,
    });

    return res.status(201).json({ success: true, message: 'Facility added', data: facility });
  } catch (err) {
    console.error('addFacilityHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const updateFacilityHandler = async (req, res) => {
  try {
    const hospitalId  = parseIntParam(req.params.id, NaN);
    const facilityId  = parseIntParam(req.params.facilityId, NaN);
    if (isNaN(hospitalId) || isNaN(facilityId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    if (req.body.is_available === undefined) {
      return res.status(400).json({ success: false, message: 'is_available is required' });
    }

    const facility = await updateFacility(facilityId, hospitalId, !!req.body.is_available);
    if (!facility) return res.status(404).json({ success: false, message: 'Facility not found' });

    return res.status(200).json({ success: true, message: 'Facility updated', data: facility });
  } catch (err) {
    console.error('updateFacilityHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Departments ───────────────────────────────────────────────────────────────

export const addDepartmentHandler = async (req, res) => {
  try {
    const hospitalId = parseIntParam(req.params.id, NaN);
    if (isNaN(hospitalId)) return res.status(400).json({ success: false, message: 'Invalid hospital ID' });

    const { department_name } = req.body;
    if (!department_name?.trim()) {
      return res.status(400).json({ success: false, message: 'department_name is required' });
    }

    if (!(await hospitalExists(hospitalId))) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    const dept = await addDepartment(hospitalId, department_name.trim());
    return res.status(201).json({ success: true, message: 'Department added', data: dept });
  } catch (err) {
    console.error('addDepartmentHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Contacts ──────────────────────────────────────────────────────────────────

export const addContactHandler = async (req, res) => {
  try {
    const hospitalId = parseIntParam(req.params.id, NaN);
    if (isNaN(hospitalId)) return res.status(400).json({ success: false, message: 'Invalid hospital ID' });

    if (!(await hospitalExists(hospitalId))) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    const contact = await addContact(hospitalId, req.body);
    return res.status(201).json({ success: true, message: 'Contact added', data: contact });
  } catch (err) {
    console.error('addContactHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Emergency–Hospital Matching ───────────────────────────────────────────────

export const matchHospitalForEmergencyHandler = async (req, res) => {
  try {
    const userId       = req.user.id;
    const { emergency_id } = req.params;

    if (!EMERGENCY_ID_RE.test(emergency_id)) {
      return res.status(400).json({ success: false, message: 'Invalid emergency ID format' });
    }

    const { rows: [emergencyCase] } = await pool.query(
      `SELECT id, user_id, status, latitude, longitude
       FROM emergency_cases WHERE emergency_id = $1`,
      [emergency_id]
    );

    if (!emergencyCase) {
      return res.status(404).json({ success: false, message: 'Emergency not found' });
    }
    if (emergencyCase.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized for this emergency' });
    }

    const radiusKm = req.body?.radius ? parseFloat(req.body.radius) : 10;

    const result = await matchHospitalForEmergency(
      emergencyCase.id,
      parseFloat(emergencyCase.latitude),
      parseFloat(emergencyCase.longitude),
      { radiusKm: isNaN(radiusKm) ? 10 : Math.min(Math.max(1, radiusKm), 50) }
    );

    if (!result.matched) {
      return res.status(404).json({ success: false, message: result.reason });
    }

    return res.status(200).json({
      success: true,
      message: 'Hospital matched successfully',
      data: result,
    });
  } catch (err) {
    if (err.message?.includes('status')) {
      return res.status(409).json({ success: false, message: err.message });
    }
    console.error('matchHospitalForEmergencyHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ── Bulk Import ───────────────────────────────────────────────────────────────

export const bulkImportHandler = async (req, res) => {
  try {
    const { provider, params } = req.body;

    if (!provider) {
      return res.status(400).json({ success: false, message: 'provider is required' });
    }

    // Verify provider exists before attempting import
    try { getImportProvider(provider); } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    const result = await bulkImportHospitals(
      provider,
      params ?? {},
      (data) => createHospital(data, req.user.id)
    );

    return res.status(200).json({
      success: true,
      message: `Import complete: ${result.imported} imported, ${result.failed} failed`,
      data: result,
    });
  } catch (err) {
    console.error('bulkImportHandler error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
