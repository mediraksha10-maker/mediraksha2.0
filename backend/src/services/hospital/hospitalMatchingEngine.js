import { pool } from '../../config/db.js';
import { findHospitalsNearby } from './hospitalSearchService.js';
import { rankHospitals, DEFAULT_WEIGHTS } from './hospitalRankingEngine.js';
import { recordEvent, EVENT_TYPES } from '../emergency/timelineService.js';
import { logAudit } from '../emergency/auditService.js';

const DEFAULT_RADIUS_KM     = 10;
const EXPANDED_RADIUS_KM    = 50;  // fallback if no results in primary radius
const RANKING_LOG_TOP_N     = 5;   // persist scores for top-N candidates

// ── Persist ranking decisions ─────────────────────────────────────────────────

const saveRankingLogs = async (emergencyCaseId, rankedHospitals, client) => {
  const topN = rankedHospitals.slice(0, RANKING_LOG_TOP_N);
  for (const h of topN) {
    await client.query(
      `INSERT INTO hospital_ranking_logs
         (emergency_case_id, hospital_id, distance_km,
          distance_score, facility_score, rating_score, total_score, rank_position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        emergencyCaseId,
        h.id,
        h.distance_km,
        h.scores.distance       ?? 0,
        h.scores.facility_match ?? 0,
        h.scores.rating         ?? 0,
        h.scores.total_score,
        h.rank_position,
      ]
    );
  }
};

// ── Main matching function ────────────────────────────────────────────────────

export const matchHospitalForEmergency = async (emergencyCaseId, latitude, longitude, options = {}) => {
  const {
    radiusKm     = DEFAULT_RADIUS_KM,
    weights      = DEFAULT_WEIGHTS,
  } = options;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock emergency case row to prevent race conditions
    const { rows: [emergencyCase] } = await client.query(
      `SELECT id, status FROM emergency_cases WHERE id = $1 FOR UPDATE`,
      [emergencyCaseId]
    );

    if (!emergencyCase) throw new Error('Emergency case not found');

    const terminalStatuses = ['HOSPITAL_IDENTIFIED', 'AMBULANCE_ASSIGNED', 'PATIENT_PICKED_UP', 'PATIENT_ADMITTED', 'COMPLETED', 'CANCELLED'];
    if (terminalStatuses.includes(emergencyCase.status)) {
      throw new Error(`Cannot match hospital: case is already in status '${emergencyCase.status}'`);
    }

    // 2. Search nearby hospitals (expand radius if no results)
    let hospitals = await findHospitalsNearby(latitude, longitude, radiusKm);
    let effectiveRadius = radiusKm;

    if (hospitals.length === 0 && radiusKm < EXPANDED_RADIUS_KM) {
      hospitals      = await findHospitalsNearby(latitude, longitude, EXPANDED_RADIUS_KM);
      effectiveRadius = EXPANDED_RADIUS_KM;
    }

    if (hospitals.length === 0) {
      await client.query('ROLLBACK');
      return { matched: false, reason: 'No active hospitals found within search radius' };
    }

    // 3. Rank all candidates
    const context = { radius_km: effectiveRadius };
    const ranked  = rankHospitals(hospitals, context, weights);

    // 4. Persist top-N scoring decisions for analytics and iteration
    await saveRankingLogs(emergencyCaseId, ranked, client);

    // 5. Select best hospital
    const best = ranked[0];

    // 6. Advance emergency status
    await client.query(
      `UPDATE emergency_cases
       SET status = 'HOSPITAL_IDENTIFIED', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [emergencyCaseId]
    );

    // 7. Record timeline event
    await recordEvent(
      emergencyCaseId,
      EVENT_TYPES.HOSPITAL_ASSIGNED,
      {
        hospital_id:   best.id,
        hospital_code: best.hospital_code,
        hospital_name: best.hospital_name,
        distance_km:   best.distance_km,
        total_score:   best.scores.total_score,
        candidates:    ranked.length,
      },
      client
    );

    // 8. Audit
    await logAudit(
      emergencyCaseId, 'system', null, 'HOSPITAL_MATCHED',
      {
        hospital_id:      best.id,
        hospital_name:    best.hospital_name,
        effective_radius: effectiveRadius,
        candidates:       ranked.length,
      },
      client
    );

    await client.query('COMMIT');

    return {
      matched:          true,
      hospital:         best,
      search_radius_km: effectiveRadius,
      candidates_found: ranked.length,
      ranking_summary: ranked.slice(0, RANKING_LOG_TOP_N).map(h => ({
        hospital_id:   h.id,
        hospital_code: h.hospital_code,
        hospital_name: h.hospital_name,
        distance_km:   h.distance_km,
        total_score:   h.scores.total_score,
        rank_position: h.rank_position,
      })),
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
