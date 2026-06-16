import { pool } from '../../config/db.js';

// Sequential parameter builder — same pattern as hospitalSearchService.js.
// Prevents off-by-one bugs when building variable-length WHERE clauses.
const makeParams = () => {
  const list = [];
  const p = (val) => { list.push(val); return `$${list.length}`; };
  return { list, p };
};

// ── Nearby ambulance search (Haversine + bounding-box pre-filter) ─────────────
//
// Architecture:
//   1. Bounding-box WHERE on (current_latitude, current_longitude) — uses the
//      partial index idx_ambulances_geo_available for AVAILABLE ambulances.
//   2. Subquery computes Haversine distance for every row that passes the box.
//   3. Outer WHERE discards rows outside the true circular radius.
//   4. ORDER BY distance_km ASC surfaces closest first.
//
// This avoids a full-table Haversine scan while remaining PostGIS-free.

export const findAmbulancesNearby = async (lat, lng, radiusKm = 10, options = {}) => {
  const {
    status       = 'AVAILABLE',   // null → search all statuses (admin use)
    ambulanceType = null,
    ownershipType = null,
    limit         = 20,
  } = options;

  const { list, p } = makeParams();

  const latP = p(lat);
  const lngP = p(lng);
  const radP = p(radiusKm);

  const latRad   = lat * (Math.PI / 180);
  const latDelta = radiusKm / 111.0;
  const lngDelta = radiusKm / (111.0 * Math.cos(latRad));

  const latDP = p(latDelta);
  const lngDP = p(lngDelta);

  const conditions = [
    `a.is_active = TRUE`,
    `a.current_latitude  IS NOT NULL`,
    `a.current_longitude IS NOT NULL`,
    `a.current_latitude  BETWEEN (${latP}::numeric - ${latDP}::numeric) AND (${latP}::numeric + ${latDP}::numeric)`,
    `a.current_longitude BETWEEN (${lngP}::numeric - ${lngDP}::numeric) AND (${lngP}::numeric + ${lngDP}::numeric)`,
  ];

  if (status)        conditions.push(`a.current_status  = ${p(status)}::ambulance_status_enum`);
  if (ambulanceType) conditions.push(`a.ambulance_type  = ${p(ambulanceType)}::ambulance_type_enum`);
  if (ownershipType) conditions.push(`a.ownership_type  = ${p(ownershipType)}::ownership_type_enum`);

  const limP = p(Math.min(50, limit));

  // Active driver subquery — pulled via correlated scalar subquery to avoid JOIN fan-out
  const driverIdSub   = `(SELECT d.id FROM ambulance_drivers d WHERE d.ambulance_id = a.id AND d.is_active = TRUE AND d.status = 'ONLINE' LIMIT 1)`;
  const driverNameSub = `(SELECT d.driver_name FROM ambulance_drivers d WHERE d.ambulance_id = a.id AND d.is_active = TRUE AND d.status = 'ONLINE' LIMIT 1)`;

  const haversine = `
    ROUND(
      6371.0 * ACOS(
        LEAST(1.0, GREATEST(-1.0,
          COS(RADIANS(${latP}::numeric)) * COS(RADIANS(a.current_latitude))
          * COS(RADIANS(a.current_longitude) - RADIANS(${lngP}::numeric))
          + SIN(RADIANS(${latP}::numeric)) * SIN(RADIANS(a.current_latitude))
        ))
      )::numeric, 3
    )
  `;

  const sql = `
    SELECT * FROM (
      SELECT
        a.*,
        h.hospital_name,
        ${driverIdSub}   AS online_driver_id,
        ${driverNameSub} AS online_driver_name,
        ${haversine}     AS distance_km
      FROM ambulances a
      LEFT JOIN hospitals h ON h.id = a.hospital_id
      WHERE ${conditions.join('\n        AND ')}
    ) sub
    WHERE sub.distance_km <= ${radP}::numeric
    ORDER BY sub.distance_km ASC
    LIMIT ${limP}
  `;

  const { rows } = await pool.query(sql, list);
  return rows;
};
