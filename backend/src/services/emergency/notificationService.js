import { pool } from '../../config/db.js';

// ============================================================
// Provider abstraction layer
// Swap in real SDKs (Twilio, Gupshup, FCM) per provider below.
// ============================================================

class NotificationProvider {
  get channel() { throw new Error('Provider must declare a channel name'); }

  // Returns { success: boolean, providerRef?: string }
  async send(to, message, metadata = {}) {
    throw new Error(`${this.constructor.name} must implement send()`);
  }
}

class SmsProvider extends NotificationProvider {
  get channel() { return 'sms'; }

  async send(to, message, metadata = {}) {
    // TODO: wire up Twilio / MSG91 / Fast2SMS
    console.log(`[SMS STUB] To=${to} | msg="${message}"`);
    return { success: true, providerRef: null };
  }
}

class WhatsAppProvider extends NotificationProvider {
  get channel() { return 'whatsapp'; }

  async send(to, message, metadata = {}) {
    // TODO: wire up Twilio WhatsApp / WATI / Gupshup
    console.log(`[WHATSAPP STUB] To=${to} | msg="${message}"`);
    return { success: true, providerRef: null };
  }
}

class PushProvider extends NotificationProvider {
  get channel() { return 'push'; }

  async send(to, message, metadata = {}) {
    // TODO: wire up Firebase FCM
    console.log(`[PUSH STUB] To=${to} | msg="${message}"`);
    return { success: true, providerRef: null };
  }
}

class EmailProvider extends NotificationProvider {
  get channel() { return 'email'; }

  async send(to, message, metadata = {}) {
    // TODO: wire up SendGrid / Nodemailer
    console.log(`[EMAIL STUB] To=${to} | msg="${message}"`);
    return { success: true, providerRef: null };
  }
}

const providers = {
  sms:      new SmsProvider(),
  whatsapp: new WhatsAppProvider(),
  push:     new PushProvider(),
  email:    new EmailProvider(),
};

// ============================================================
// Queue helpers — write notification intent to DB
// ============================================================

export const queueNotification = async (emergencyCaseId, contactId, channel, client = null) => {
  const db = client || pool;
  const { rows } = await db.query(
    `INSERT INTO emergency_notifications (emergency_case_id, contact_id, channel, status)
     VALUES ($1, $2, $3, 'queued')
     RETURNING id, channel, status, created_at`,
    [emergencyCaseId, contactId, channel]
  );
  return rows[0];
};

// Looks up all contacts for a user and queues an SMS notification for each.
export const queueFamilyNotifications = async (emergencyCaseId, userId, client = null) => {
  const db = client || pool;

  const { rows: contacts } = await db.query(
    `SELECT id, contact_name, contact_phone, relationship
     FROM emergency_contacts
     WHERE user_id = $1
     ORDER BY priority ASC`,
    [userId]
  );

  if (contacts.length === 0) return [];

  const queued = [];
  for (const contact of contacts) {
    const notification = await queueNotification(emergencyCaseId, contact.id, 'sms', db);
    queued.push({ contact, notification });
  }
  return queued;
};

// ============================================================
// Dispatcher — called by a background job when ready to send
// ============================================================

export const dispatchNotification = async (notificationId) => {
  const { rows } = await pool.query(
    `SELECT n.id, n.channel, n.emergency_case_id,
            ec.contact_phone, ec.contact_name,
            cases.emergency_id
     FROM emergency_notifications n
     JOIN emergency_contacts ec   ON ec.id = n.contact_id
     JOIN emergency_cases cases   ON cases.id = n.emergency_case_id
     WHERE n.id = $1 AND n.status = 'queued'`,
    [notificationId]
  );

  if (rows.length === 0) return null;

  const n = rows[0];
  const provider = providers[n.channel];
  if (!provider) throw new Error(`Unknown notification channel: ${n.channel}`);

  try {
    await provider.send(
      n.contact_phone,
      `EMERGENCY ALERT: Case ${n.emergency_id} has been triggered. Immediate response required.`,
      { emergency_id: n.emergency_id }
    );

    await pool.query(
      `UPDATE emergency_notifications SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [notificationId]
    );

    return { success: true, notificationId };
  } catch (err) {
    await pool.query(
      `UPDATE emergency_notifications SET status = 'failed' WHERE id = $1`,
      [notificationId]
    );
    return { success: false, notificationId, error: err.message };
  }
};
