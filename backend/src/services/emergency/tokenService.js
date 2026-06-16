import { randomBytes } from 'crypto';
import { pool } from '../../config/db.js';

const DEFAULT_EXPIRY_HOURS = parseInt(process.env.EMERGENCY_TOKEN_EXPIRY_HOURS || '24', 10);

export const generateToken = async (emergencyCaseId, expiryHours = DEFAULT_EXPIRY_HOURS, client = null) => {
  // 48 random bytes → 64-char base64url string, URL-safe and cryptographically secure
  const token = randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

  const db = client || pool;
  const { rows } = await db.query(
    `INSERT INTO emergency_access_tokens (emergency_case_id, token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, token, expires_at, created_at`,
    [emergencyCaseId, token, expiresAt]
  );
  return rows[0];
};

export const validateToken = async (token) => {
  const { rows } = await pool.query(
    `SELECT t.id, t.token, t.emergency_case_id, t.expires_at, t.revoked_at,
            ec.emergency_id, ec.status AS case_status
     FROM emergency_access_tokens t
     JOIN emergency_cases ec ON ec.id = t.emergency_case_id
     WHERE t.token = $1`,
    [token]
  );

  if (rows.length === 0) return { valid: false, reason: 'Token not found' };

  const record = rows[0];

  if (record.revoked_at)                         return { valid: false, reason: 'Token has been revoked' };
  if (new Date(record.expires_at) < new Date())  return { valid: false, reason: 'Token has expired' };

  return { valid: true, data: record };
};

export const revokeAllTokensForCase = async (emergencyCaseId, client = null) => {
  const db = client || pool;
  const { rows } = await db.query(
    `UPDATE emergency_access_tokens
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE emergency_case_id = $1 AND revoked_at IS NULL
     RETURNING id`,
    [emergencyCaseId]
  );
  return rows;
};
