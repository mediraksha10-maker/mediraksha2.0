import { pool }                          from '../../config/db.js';
import { matchHospitalForEmergency }     from '../hospital/hospitalMatchingEngine.js';
import { matchAmbulanceForEmergency }    from '../ambulance/ambulanceMatchingEngine.js';
import { recordEvent, EVENT_TYPES }      from './timelineService.js';

// ── Auto-dispatch ─────────────────────────────────────────────────────────────
//
// Runs fire-and-forget after createEmergency commits.
// Never throws — all errors are logged and surfaced via dispatch_*_status columns.
// Hospital is matched first, ambulance second, to avoid concurrent FOR UPDATE
// conflicts on the same emergency_cases row.

export const autoDispatch = async (emergencyCaseId, lat, lng) => {
  try {
    // Mark both as SEARCHING before attempting
    await pool.query(
      `UPDATE emergency_cases
       SET dispatch_hospital_status  = 'SEARCHING',
           dispatch_ambulance_status = 'SEARCHING',
           dispatch_started_at       = NOW()
       WHERE id = $1`,
      [emergencyCaseId]
    );

    await recordEvent(emergencyCaseId, EVENT_TYPES.AUTO_DISPATCH_STARTED, { lat, lng });

    // ── Hospital first ────────────────────────────────────────────────────────
    let hospitalMatched = false;
    try {
      const hr = await matchHospitalForEmergency(emergencyCaseId, lat, lng, { radiusKm: 50 });
      hospitalMatched = !!hr.matched;
    } catch (err) {
      console.error(`[autoDispatch] hospital match failed for case ${emergencyCaseId}:`, err.message);
    }

    await pool.query(
      `UPDATE emergency_cases SET dispatch_hospital_status = $1 WHERE id = $2`,
      [hospitalMatched ? 'MATCHED' : 'FAILED', emergencyCaseId]
    );

    // ── Ambulance second ──────────────────────────────────────────────────────
    let ambulanceMatched = false;
    try {
      const ar = await matchAmbulanceForEmergency(emergencyCaseId, lat, lng, { radiusKm: 10 });
      ambulanceMatched = !!ar.matched;
    } catch (err) {
      console.error(`[autoDispatch] ambulance match failed for case ${emergencyCaseId}:`, err.message);
    }

    await pool.query(
      `UPDATE emergency_cases SET dispatch_ambulance_status = $1 WHERE id = $2`,
      [ambulanceMatched ? 'MATCHED' : 'FAILED', emergencyCaseId]
    );

    // ── Mark dispatch complete ────────────────────────────────────────────────
    await pool.query(
      `UPDATE emergency_cases SET dispatch_completed_at = NOW() WHERE id = $1`,
      [emergencyCaseId]
    );

    await recordEvent(emergencyCaseId, EVENT_TYPES.AUTO_DISPATCH_COMPLETED, {
      hospital_matched:  hospitalMatched,
      ambulance_matched: ambulanceMatched,
    });

  } catch (err) {
    // Top-level guard: even if recordEvent or the status updates throw, we log and exit cleanly
    console.error(`[autoDispatch] fatal error for case ${emergencyCaseId}:`, err);
  }
};
