import { pool } from '../../config/db.js';
import { findAmbulancesNearby }                    from './ambulanceSearchService.js';
import { rankAmbulances, DEFAULT_WEIGHTS, CRITICAL_WEIGHTS } from './ambulanceRankingEngine.js';
import { transitionAmbulanceStatus }               from './ambulanceStatusEngine.js';
import { logAmbulanceAudit, recordAmbulanceEvent } from './ambulanceDataService.js';
import { recordEvent, EVENT_TYPES }                from '../emergency/timelineService.js';
import { logAudit }                                from '../emergency/auditService.js';

const DEFAULT_RADIUS_KM  = 10;
const EXPANDED_RADIUS_KM = 30;
const RANKING_LOG_TOP_N  = 5;

// Emergency statuses that indicate the incident is fully resolved — re-matching blocked
const TERMINAL_STATUSES = new Set(['PATIENT_PICKED_UP', 'PATIENT_ADMITTED', 'COMPLETED', 'CANCELLED']);

// ── Store top-N ranking candidates for ML / post-mortem analytics ─────────────

const saveRankingLog = async (emergencyCaseId, ranked, radiusKm, client) => {
  if (!ranked.length) return;
  await logAmbulanceAudit(
    ranked[0].id, null, 'system', null, 'RANKING_LOG',
    {
      emergency_case_id: emergencyCaseId,
      radius_km:         radiusKm,
      candidates:        ranked.slice(0, RANKING_LOG_TOP_N).map(a => ({
        ambulance_id:   a.id,
        ambulance_code: a.ambulance_code,
        ambulance_type: a.ambulance_type,
        distance_km:    a.distance_km,
        score:          a.score,
        rank:           a.rank_position,
      })),
    },
    client
  );
};

// ── Main matching function ────────────────────────────────────────────────────

export const matchAmbulanceForEmergency = async (emergencyCaseId, lat, lng, options = {}) => {
  const {
    radiusKm      = DEFAULT_RADIUS_KM,
    requiredType  = null,   // 'ICU' | 'CARDIAC' | 'ALS' | 'BLS'
    ownershipType = null,
  } = options;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock the emergency case row
    const { rows: [emergencyCase] } = await client.query(
      `SELECT id, status, emergency_id FROM emergency_cases WHERE id = $1 FOR UPDATE`,
      [emergencyCaseId]
    );

    if (!emergencyCase) throw new Error('Emergency case not found');

    if (TERMINAL_STATUSES.has(emergencyCase.status)) {
      throw new Error(`Emergency has reached terminal status: ${emergencyCase.status}`);
    }

    // 2. Block if there's already a live (non-rejected/cancelled) assignment
    const { rows: [existingAssignment] } = await client.query(
      `SELECT id, assignment_status FROM ambulance_assignments
       WHERE emergency_case_id = $1
         AND assignment_status NOT IN ('REJECTED', 'CANCELLED')
       LIMIT 1`,
      [emergencyCaseId]
    );

    if (existingAssignment) {
      throw new Error(
        `Emergency already has an active ambulance assignment (${existingAssignment.assignment_status})`
      );
    }

    // 3. Search nearby AVAILABLE ambulances
    let ambulances = await findAmbulancesNearby(lat, lng, radiusKm, {
      status:        'AVAILABLE',
      ambulanceType: requiredType,
      ownershipType,
      limit:         20,
    });

    let effectiveRadius = radiusKm;

    // Auto-expand radius when the primary search yields nothing
    if (ambulances.length === 0 && radiusKm < EXPANDED_RADIUS_KM) {
      ambulances = await findAmbulancesNearby(lat, lng, EXPANDED_RADIUS_KM, {
        status: 'AVAILABLE',
        ownershipType,
        limit:  20,
      });
      effectiveRadius = EXPANDED_RADIUS_KM;
    }

    if (ambulances.length === 0) {
      await client.query('ROLLBACK');
      return {
        matched:      false,
        reason:       `No available ambulances found within ${EXPANDED_RADIUS_KM} km`,
        emergency_id: emergencyCase.emergency_id,
      };
    }

    // 4. Rank — use CRITICAL_WEIGHTS when a specific ambulance type is required
    const context = { radiusKm: effectiveRadius, requiredType };
    const weights = requiredType ? CRITICAL_WEIGHTS : DEFAULT_WEIGHTS;
    const ranked  = rankAmbulances(ambulances, context, weights);

    await saveRankingLog(emergencyCaseId, ranked, effectiveRadius, client);

    const best = ranked[0];

    // 5. Create assignment record (PENDING — awaiting driver acceptance)
    const { rows: [assignment] } = await client.query(
      `INSERT INTO ambulance_assignments (emergency_case_id, ambulance_id, assignment_status)
       VALUES ($1, $2, 'PENDING')
       RETURNING *`,
      [emergencyCaseId, best.id]
    );

    // 6. Transition ambulance: AVAILABLE → ASSIGNED
    await transitionAmbulanceStatus(best.id, 'ASSIGNED', null, 'system', client);

    // 7. Update emergency case status to AMBULANCE_ASSIGNED (idempotent guard)
    await client.query(
      `UPDATE emergency_cases SET status = 'AMBULANCE_ASSIGNED'
       WHERE id = $1 AND status NOT IN ('PATIENT_PICKED_UP', 'PATIENT_ADMITTED', 'COMPLETED', 'CANCELLED')`,
      [emergencyCaseId]
    );

    // 8. Emergency timeline events
    await recordEvent(emergencyCaseId, EVENT_TYPES.AMBULANCE_MATCHED, {
      ambulance_id:        best.id,
      ambulance_code:      best.ambulance_code,
      ambulance_type:      best.ambulance_type,
      distance_km:         best.distance_km,
      score:               best.score,
      candidates_evaluated: ranked.length,
      radius_km:           effectiveRadius,
    }, client);

    await recordEvent(emergencyCaseId, EVENT_TYPES.AMBULANCE_ASSIGNED, {
      assignment_id: assignment.id,
      ambulance_id:  best.id,
      ambulance_code: best.ambulance_code,
    }, client);

    // 9. Ambulance's own event log
    await recordAmbulanceEvent(best.id, 'ASSIGNMENT_CREATED', {
      assignment_id:     assignment.id,
      emergency_case_id: emergencyCaseId,
      emergency_id:      emergencyCase.emergency_id,
    }, 'system', null, client);

    // 10. Dual audit trail
    await logAudit(emergencyCaseId, 'system', null, 'AMBULANCE_MATCHED', {
      ambulance_id:   best.id,
      ambulance_code: best.ambulance_code,
      assignment_id:  assignment.id,
      distance_km:    best.distance_km,
      score:          best.score,
      radius_km:      effectiveRadius,
    }, client);

    await logAmbulanceAudit(best.id, assignment.id, 'system', null, 'AMBULANCE_ASSIGNED', {
      emergency_case_id: emergencyCaseId,
      emergency_id:      emergencyCase.emergency_id,
    }, client);

    await client.query('COMMIT');

    return {
      matched:    true,
      assignment,
      ambulance:  best,
      ranking_context: {
        radius_km:            effectiveRadius,
        candidates_evaluated: ranked.length,
        required_type:        requiredType,
        weights_used:         weights,
      },
      emergency_id: emergencyCase.emergency_id,
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
