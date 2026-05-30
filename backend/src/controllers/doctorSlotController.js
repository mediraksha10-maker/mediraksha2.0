import { pool } from '../config/db.js';

const VALID_SLOT_STATUSES = new Set(['available', 'booked', 'blocked']);

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
};

// GET /api/doctor/slot/all
export async function getAllSlots(req, res) {
  const doctorId = req.user.id;
  const { status, fromDate } = req.query;

  try {
    const params = [doctorId];
    const conditions = ['"doctorId" = $1'];

    if (status) {
      if (!VALID_SLOT_STATUSES.has(status)) {
        return res.status(400).json({ success: false, message: 'Invalid slot status.' });
      }
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (fromDate) {
      const normalizedFromDate = normalizeDate(fromDate);
      if (!normalizedFromDate) {
        return res.status(400).json({ success: false, message: 'Invalid fromDate.' });
      }
      params.push(normalizedFromDate);
      conditions.push(`"bookingDate" >= $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT id, "userId", "doctorId", "bookingDate", status, created_at, updated_at
       FROM "Slot"
       WHERE ${conditions.join(' AND ')}
       ORDER BY "bookingDate" ASC, id ASC`,
      params
    );

    res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('getAllSlots error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// POST /api/doctor/slot/publish
// Body: { bookingDate: "YYYY-MM-DD" }
export async function addSlot(req, res) {
  const doctorId = req.user.id;
  const bookingDate = normalizeDate(req.body.bookingDate);

  if (!bookingDate) {
    return res.status(400).json({ success: false, message: 'bookingDate is required.' });
  }

  try {
    const { rows: duplicate } = await pool.query(
      `SELECT id FROM "Slot"
       WHERE "doctorId" = $1 AND "bookingDate" = $2 AND status = 'available'`,
      [doctorId, bookingDate]
    );

    if (duplicate.length > 0) {
      return res.status(409).json({ success: false, message: 'An available slot already exists for this date.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO "Slot" ("doctorId", "bookingDate", status)
       VALUES ($1, $2, 'available')
       RETURNING id, "userId", "doctorId", "bookingDate", status, created_at, updated_at`,
      [doctorId, bookingDate]
    );

    res.status(201).json({
      success: true,
      message: 'Slot published successfully',
      data: rows[0]
    });
  } catch (error) {
    console.error('addSlot error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// DELETE /api/doctor/slot/:id
export async function deleteSlot(req, res) {
  const doctorId = req.user.id;
  const { id } = req.params;

  try {
    const { rows: slots } = await pool.query(
      `SELECT id, status FROM "Slot" WHERE id = $1 AND "doctorId" = $2`,
      [id, doctorId]
    );

    if (slots.length === 0) {
      return res.status(404).json({ success: false, message: 'Slot not found.' });
    }

    if (slots[0].status === 'booked') {
      return res.status(400).json({ success: false, message: 'Booked slots cannot be deleted.' });
    }

    await pool.query(`DELETE FROM "Slot" WHERE id = $1 AND "doctorId" = $2`, [id, doctorId]);

    res.status(200).json({
      success: true,
      message: 'Slot deleted successfully',
      deletedSlotId: id
    });
  } catch (error) {
    console.error('deleteSlot error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
