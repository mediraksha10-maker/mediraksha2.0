import { pool } from '../../config/db.js';
import { recordAmbulanceEvent } from './ambulanceDataService.js';

// Location-update events are throttled so that ambulance_events doesn't get
// flooded during continuous GPS streaming (e.g. every 2 seconds from a driver app).
// A STATUS_CHANGED or assignment event still fires immediately regardless of throttle.
const LOCATION_EVENT_THROTTLE_MS = 30_000; // 30 seconds

// ── Update live location ──────────────────────────────────────────────────────

export const updateAmbulanceLocation = async (ambulanceId, locationData, actorId, client = null) => {
  const shouldCommit = !client;
  const db = shouldCommit ? await pool.connect() : client;

  try {
    if (shouldCommit) await db.query('BEGIN');

    const { latitude, longitude, speed = null, heading = null, accuracy = null } = locationData;

    const { rows: [current] } = await db.query(
      `SELECT id, current_status, last_location_update, is_active
       FROM ambulances WHERE id = $1`,
      [ambulanceId]
    );

    if (!current)       throw new Error(`Ambulance ${ambulanceId} not found`);
    if (!current.is_active) throw new Error(`Ambulance ${ambulanceId} is deactivated`);

    // Always write to the append-only location history
    const { rows: [locationRecord] } = await db.query(
      `INSERT INTO ambulance_locations (ambulance_id, latitude, longitude, speed, heading, accuracy)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [ambulanceId, latitude, longitude, speed, heading, accuracy]
    );

    // Denormalize current position onto the ambulance row for fast geospatial queries
    await db.query(
      `UPDATE ambulances
       SET current_latitude = $1, current_longitude = $2, last_location_update = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [latitude, longitude, ambulanceId]
    );

    // Throttled event write — avoids flooding ambulance_events with every GPS ping
    const lastUpdate  = current.last_location_update ? new Date(current.last_location_update).getTime() : 0;
    const shouldEmit  = (Date.now() - lastUpdate) >= LOCATION_EVENT_THROTTLE_MS;

    if (shouldEmit) {
      await recordAmbulanceEvent(ambulanceId, 'LOCATION_UPDATED', {
        latitude, longitude, speed, heading,
      }, 'driver', actorId, db);
    }

    if (shouldCommit) await db.query('COMMIT');
    return locationRecord;

  } catch (err) {
    if (shouldCommit) await db.query('ROLLBACK');
    throw err;
  } finally {
    if (shouldCommit) db.release();
  }
};

// ── Read current & historical location ───────────────────────────────────────

export const getLatestLocation = async (ambulanceId, client = null) => {
  const db = client || pool;

  const [{ rows: [currentRow] }, { rows: [historyRow] }] = await Promise.all([
    db.query(
      `SELECT current_latitude, current_longitude, last_location_update, current_status
       FROM ambulances WHERE id = $1`,
      [ambulanceId]
    ),
    db.query(
      `SELECT * FROM ambulance_locations WHERE ambulance_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
      [ambulanceId]
    ),
  ]);

  return {
    ambulance_id:  ambulanceId,
    current:       currentRow  || null,
    latest_record: historyRow  || null,
  };
};

export const getLocationHistory = async (ambulanceId, { fromTime = null, toTime = null, limit = 100 } = {}, client = null) => {
  const db = client || pool;

  const params     = [ambulanceId];
  const conditions = ['ambulance_id = $1'];

  if (fromTime) { params.push(fromTime); conditions.push(`recorded_at >= $${params.length}`); }
  if (toTime)   { params.push(toTime);   conditions.push(`recorded_at <= $${params.length}`); }

  params.push(Math.min(500, limit));

  const { rows } = await db.query(
    `SELECT * FROM ambulance_locations
     WHERE ${conditions.join(' AND ')}
     ORDER BY recorded_at DESC
     LIMIT $${params.length}`,
    params
  );

  return rows;
};
