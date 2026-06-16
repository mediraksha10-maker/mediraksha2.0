import { pool } from '../../config/db.js';

const VALID_ACTOR_TYPES = new Set(['user', 'system', 'doctor', 'hospital', 'admin']);

export const logAudit = async (emergencyCaseId, actorType, actorId, action, metadata = {}, client = null) => {
  if (!VALID_ACTOR_TYPES.has(actorType)) {
    throw new Error(`Invalid actor type: ${actorType}`);
  }

  const db = client || pool;
  const { rows } = await db.query(
    `INSERT INTO emergency_audit_logs (emergency_case_id, actor_type, actor_id, action, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [emergencyCaseId, actorType, actorId || null, action, JSON.stringify(metadata)]
  );
  return rows[0];
};
