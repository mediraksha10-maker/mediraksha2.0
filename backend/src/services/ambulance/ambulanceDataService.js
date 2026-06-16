import { pool } from '../../config/db.js';

export const VALID_AMBULANCE_TYPES    = new Set(['BLS', 'ALS', 'CARDIAC', 'ICU']);
export const VALID_OWNERSHIP_TYPES    = new Set(['PRIVATE', 'HOSPITAL', 'GOVERNMENT', 'PARTNER']);
export const VALID_AMBULANCE_STATUSES = new Set(['AVAILABLE', 'ASSIGNED', 'BUSY', 'OFFLINE', 'MAINTENANCE']);

// ── Code generator ────────────────────────────────────────────────────────────

const generateAmbulanceCode = (id) => `AMB-${String(id).padStart(6, '0')}`;

// ── Ambulance CRUD ────────────────────────────────────────────────────────────

export const createAmbulance = async (data, actorId, client = null) => {
  const db = client || pool;
  const { registration_number, ambulance_type, ownership_type = 'PRIVATE', hospital_id = null } = data;

  // Insert with a placeholder code, then update with the ID-derived code
  const { rows: [row] } = await db.query(
    `INSERT INTO ambulances
       (ambulance_code, registration_number, ambulance_type, ownership_type, hospital_id)
     VALUES ('TEMP', $1, $2, $3, $4)
     RETURNING id, created_at`,
    [registration_number, ambulance_type, ownership_type, hospital_id]
  );

  const code = generateAmbulanceCode(row.id);

  const { rows: [ambulance] } = await db.query(
    `UPDATE ambulances SET ambulance_code = $1 WHERE id = $2 RETURNING *`,
    [code, row.id]
  );

  await recordAmbulanceEvent(ambulance.id, 'AMBULANCE_REGISTERED', {
    ambulance_code: code, registration_number, ambulance_type,
  }, 'admin', actorId, db);

  await logAmbulanceAudit(ambulance.id, null, 'admin', actorId, 'AMBULANCE_REGISTERED', {
    ambulance_code: code, registration_number,
  }, db);

  return ambulance;
};

export const updateAmbulance = async (id, data, actorId, client = null) => {
  const db = client || pool;

  const ALLOWED = ['registration_number', 'ambulance_type', 'ownership_type', 'hospital_id', 'is_active'];
  const sets = [];
  const vals = [];

  for (const key of ALLOWED) {
    if (data[key] !== undefined) {
      sets.push(`${key} = $${vals.length + 1}`);
      vals.push(data[key]);
    }
  }

  if (sets.length === 0) return null;

  sets.push('updated_at = NOW()');
  vals.push(id);

  const { rows: [row] } = await db.query(
    `UPDATE ambulances SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
    vals
  );

  if (row) {
    await logAmbulanceAudit(id, null, 'admin', actorId, 'AMBULANCE_UPDATED', data, db);
  }

  return row || null;
};

export const getAmbulanceById = async (id, client = null) => {
  const db = client || pool;

  const { rows: [ambulance] } = await db.query(
    `SELECT a.*,
       h.hospital_name,
       (SELECT json_agg(d ORDER BY d.created_at)
        FROM ambulance_drivers d
        WHERE d.ambulance_id = a.id AND d.is_active = TRUE) AS active_drivers
     FROM ambulances a
     LEFT JOIN hospitals h ON h.id = a.hospital_id
     WHERE a.id = $1`,
    [id]
  );

  return ambulance || null;
};

export const ambulanceExists = async (id, client = null) => {
  const db = client || pool;
  const { rows: [row] } = await db.query(
    `SELECT id FROM ambulances WHERE id = $1 AND is_active = TRUE`,
    [id]
  );
  return !!row;
};

// ── Driver management ─────────────────────────────────────────────────────────

export const addDriver = async (ambulanceId, data, actorId, client = null) => {
  const db = client || pool;
  const { driver_name, phone, license_number, user_id = null } = data;

  const { rows: [driver] } = await db.query(
    `INSERT INTO ambulance_drivers (ambulance_id, driver_name, phone, license_number, user_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [ambulanceId, driver_name.trim(), phone.trim(), license_number.trim().toUpperCase(), user_id]
  );

  await recordAmbulanceEvent(ambulanceId, 'DRIVER_ASSIGNED', {
    driver_id: driver.id, driver_name: driver.driver_name,
  }, 'admin', actorId, db);

  await logAmbulanceAudit(ambulanceId, null, 'admin', actorId, 'DRIVER_ASSIGNED', {
    driver_id: driver.id, driver_name: driver.driver_name,
  }, db);

  return driver;
};

export const getDriversByAmbulance = async (ambulanceId, activeOnly = true, client = null) => {
  const db = client || pool;
  const { rows } = await db.query(
    `SELECT * FROM ambulance_drivers WHERE ambulance_id = $1${activeOnly ? ' AND is_active = TRUE' : ''} ORDER BY created_at`,
    [ambulanceId]
  );
  return rows;
};

export const getDriverById = async (driverId, client = null) => {
  const db = client || pool;
  const { rows: [driver] } = await db.query(
    `SELECT d.*, a.ambulance_code, a.current_status AS ambulance_status, a.id AS ambulance_db_id
     FROM ambulance_drivers d
     JOIN ambulances a ON a.id = d.ambulance_id
     WHERE d.id = $1`,
    [driverId]
  );
  return driver || null;
};

// Resolves the driver record from a logged-in user (driver app authentication)
export const getDriverByUserId = async (userId, client = null) => {
  const db = client || pool;
  const { rows: [driver] } = await db.query(
    `SELECT d.*, a.ambulance_code, a.current_status AS ambulance_status, a.id AS ambulance_db_id
     FROM ambulance_drivers d
     JOIN ambulances a ON a.id = d.ambulance_id
     WHERE d.user_id = $1 AND d.is_active = TRUE
     ORDER BY d.created_at DESC
     LIMIT 1`,
    [userId]
  );
  return driver || null;
};

// ── Audit & event helpers ─────────────────────────────────────────────────────

export const logAmbulanceAudit = async (ambulanceId, assignmentId, actorType, actorId, action, metadata = {}, client = null) => {
  const db = client || pool;
  await db.query(
    `INSERT INTO ambulance_audit_logs (ambulance_id, assignment_id, actor_type, actor_id, action, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [ambulanceId, assignmentId, actorType, actorId, action, JSON.stringify(metadata)]
  );
};

export const recordAmbulanceEvent = async (ambulanceId, eventType, eventData = {}, actorType = null, actorId = null, client = null) => {
  const db = client || pool;
  await db.query(
    `INSERT INTO ambulance_events (ambulance_id, event_type, event_data, actor_type, actor_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [ambulanceId, eventType, JSON.stringify(eventData), actorType, actorId]
  );
};
