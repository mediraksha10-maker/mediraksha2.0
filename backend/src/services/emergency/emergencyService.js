import { pool } from '../../config/db.js';
import { recordEvent, EVENT_TYPES, getTimeline } from './timelineService.js';
import { generateToken, revokeAllTokensForCase } from './tokenService.js';
import { generateQRPayload } from './qrService.js';
import { queueFamilyNotifications } from './notificationService.js';
import { logAudit } from './auditService.js';

// ============================================================
// createEmergency
// ============================================================

export const createEmergency = async (userId, latitude, longitude, locationAccuracy, emergencyType) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Insert case row; emergency_id is set in the next step once we have the PK
    const { rows: [newCase] } = await client.query(
      `INSERT INTO emergency_cases
         (user_id, status, latitude, longitude, location_accuracy, emergency_type)
       VALUES ($1, 'CREATED', $2, $3, $4, $5)
       RETURNING id, created_at`,
      [userId, latitude, longitude, locationAccuracy ?? null, emergencyType ?? null]
    );

    // 2. Build human-readable ID from the auto-increment PK
    const year = new Date().getFullYear();
    const emergencyId = `EMG-${year}-${String(newCase.id).padStart(6, '0')}`;

    await client.query(
      `UPDATE emergency_cases SET emergency_id = $1 WHERE id = $2`,
      [emergencyId, newCase.id]
    );

    // 3. Timeline events
    await recordEvent(newCase.id, EVENT_TYPES.EMERGENCY_CREATED,
      { emergency_id: emergencyId, user_id: userId }, client);

    await recordEvent(newCase.id, EVENT_TYPES.LOCATION_CAPTURED,
      { latitude, longitude, accuracy: locationAccuracy ?? null }, client);

    // 4. Secure access token
    const tokenRecord = await generateToken(newCase.id, undefined, client);

    await recordEvent(newCase.id, EVENT_TYPES.TOKEN_CREATED,
      { token_id: tokenRecord.id, expires_at: tokenRecord.expires_at }, client);

    // 5. QR payload
    const qrPayload = generateQRPayload(emergencyId, tokenRecord.token);

    await recordEvent(newCase.id, EVENT_TYPES.QR_GENERATED,
      { qr_payload: qrPayload }, client);

    // 6. Family notifications
    const notifications = await queueFamilyNotifications(newCase.id, userId, client);

    if (notifications.length > 0) {
      await recordEvent(newCase.id, EVENT_TYPES.FAMILY_NOTIFIED,
        { contact_count: notifications.length, channel: 'sms' }, client);
    }

    // 7. Audit
    await logAudit(newCase.id, 'user', userId, 'EMERGENCY_CREATED',
      { emergency_id: emergencyId, latitude, longitude }, client);

    await client.query('COMMIT');

    return {
      case_id:                     newCase.id,   // internal PK — used by autoDispatch
      emergency_id:                emergencyId,
      status:                      'DISPATCHING',
      emergency_token:             tokenRecord.token,
      token_expires_at:            tokenRecord.expires_at,
      qr_payload:                  qrPayload,
      family_notifications_queued: notifications.length,
      created_at:                  newCase.created_at,
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// getEmergencyByEmergencyId
// ============================================================

export const getEmergencyByEmergencyId = async (emergencyId, requestingUserId) => {
  const { rows: [emergencyCase] } = await pool.query(
    `SELECT id, emergency_id, user_id, status,
            latitude, longitude, location_accuracy,
            emergency_type, created_at, updated_at, closed_at
     FROM emergency_cases
     WHERE emergency_id = $1`,
    [emergencyId]
  );

  if (!emergencyCase) return null;

  // Only the case owner may view — extend for hospital/doctor access via token later
  if (emergencyCase.user_id !== requestingUserId) return null;

  const { rows: [tokenRecord] } = await pool.query(
    `SELECT id, token, expires_at, revoked_at, created_at
     FROM emergency_access_tokens
     WHERE emergency_case_id = $1 AND revoked_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [emergencyCase.id]
  );

  const { rows: notificationSummary } = await pool.query(
    `SELECT channel, status, COUNT(*) AS count
     FROM emergency_notifications
     WHERE emergency_case_id = $1
     GROUP BY channel, status`,
    [emergencyCase.id]
  );

  const events = await getTimeline(emergencyCase.id);

  return {
    ...emergencyCase,
    token: tokenRecord ? {
      id: tokenRecord.id,
      token: tokenRecord.token,
      expires_at: tokenRecord.expires_at,
      is_active: !tokenRecord.revoked_at && new Date(tokenRecord.expires_at) > new Date(),
    } : null,
    notification_summary: notificationSummary,
    events,
  };
};

// ============================================================
// cancelEmergency
// ============================================================

export const cancelEmergency = async (emergencyId, requestingUserId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: [emergencyCase] } = await client.query(
      `SELECT id, user_id, status FROM emergency_cases WHERE emergency_id = $1 FOR UPDATE`,
      [emergencyId]
    );

    if (!emergencyCase) {
      await client.query('ROLLBACK');
      return { error: 'NOT_FOUND' };
    }

    if (emergencyCase.user_id !== requestingUserId) {
      await client.query('ROLLBACK');
      return { error: 'FORBIDDEN' };
    }

    if (emergencyCase.status === 'CANCELLED' || emergencyCase.status === 'COMPLETED') {
      await client.query('ROLLBACK');
      return { error: 'ALREADY_CLOSED', status: emergencyCase.status };
    }

    await client.query(
      `UPDATE emergency_cases
       SET status = 'CANCELLED', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [emergencyCase.id]
    );

    // Revoke all active tokens so QR codes stop working
    await revokeAllTokensForCase(emergencyCase.id, client);

    await recordEvent(emergencyCase.id, EVENT_TYPES.EMERGENCY_CANCELLED,
      { cancelled_by: requestingUserId, previous_status: emergencyCase.status }, client);

    await logAudit(emergencyCase.id, 'user', requestingUserId, 'EMERGENCY_CANCELLED',
      { previous_status: emergencyCase.status }, client);

    await client.query('COMMIT');

    return { success: true, emergency_id: emergencyId, status: 'CANCELLED' };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
