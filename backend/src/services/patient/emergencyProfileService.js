import { pool } from '../../config/db.js';

const VALID_BLOOD_GROUPS = new Set(['A+','A-','B+','B-','AB+','AB-','O+','O-','UNKNOWN']);

// ── Read ──────────────────────────────────────────────────────────────────────

export const getEmergencyProfile = async (userId) => {
  const { rows: [row] } = await pool.query(
    `SELECT
       ep.blood_group, ep.allergies, ep.chronic_conditions,
       ep.current_medications, ep.donor_consent, ep.first_responder_note,
       ep.updated_at,
       u.name, u.age, u.gender, u.mediraksha_id, u.mrk_qr_payload,
       COALESCE(
         json_agg(
           json_build_object(
             'name',         ec.contact_name,
             'phone',        ec.contact_phone,
             'relationship', ec.relationship,
             'priority',     ec.priority
           ) ORDER BY ec.priority ASC
         ) FILTER (WHERE ec.id IS NOT NULL),
         '[]'
       ) AS emergency_contacts
     FROM "User" u
     LEFT JOIN emergency_profiles ep ON ep.user_id = u.id
     LEFT JOIN emergency_contacts ec ON ec.user_id = u.id
     WHERE u.id = $1
     GROUP BY ep.blood_group, ep.allergies, ep.chronic_conditions,
              ep.current_medications, ep.donor_consent, ep.first_responder_note,
              ep.updated_at, u.name, u.age, u.gender, u.mediraksha_id, u.mrk_qr_payload`,
    [userId]
  );
  return row || null;
};

// ── Upsert (create or update) ─────────────────────────────────────────────────

export const upsertEmergencyProfile = async (userId, data) => {
  if (data.blood_group !== undefined && !VALID_BLOOD_GROUPS.has(data.blood_group)) {
    throw Object.assign(new Error(`blood_group must be one of: ${[...VALID_BLOOD_GROUPS].join(', ')}`), { code: 'INVALID_BLOOD_GROUP' });
  }

  const FIELDS = [
    'blood_group', 'allergies', 'chronic_conditions',
    'current_medications', 'donor_consent', 'first_responder_note',
  ];

  const cols = FIELDS.filter(f => data[f] !== undefined);
  if (cols.length === 0) return null;

  const vals = cols.map(f => data[f]);
  vals.push(userId);

  const insertCols  = ['user_id', ...cols].join(', ');
  const insertPlaceholders = [`$${vals.length}`, ...cols.map((_, i) => `$${i + 1}`)].join(', ');
  const updateSets  = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');

  const { rows: [row] } = await pool.query(
    `INSERT INTO emergency_profiles (${insertCols})
     VALUES (${insertPlaceholders})
     ON CONFLICT (user_id) DO UPDATE
       SET ${updateSets}, updated_at = NOW()
     RETURNING *`,
    vals
  );

  return row;
};
