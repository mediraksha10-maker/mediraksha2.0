import { pool } from '../config/db.js';

const VALID_APPOINTMENT_STATUSES = new Set(['pending', 'confirmed', 'cancelled', 'completed']);

// GET /api/doctor/meetings/all
export const getAllMeetings = async (req, res) => {
  const doctorId = req.user.id;
  const { status, date } = req.query; // optional filters ?status=pending&date=2026-06-01

  if (status && !VALID_APPOINTMENT_STATUSES.has(status)) {
    return res.status(400).json({ success: false, message: 'Invalid appointment status' });
  }

  try {
    let query = `
      SELECT
        a.id AS "Id", a."appointmentDate", a."slotTime", a.status, a."reasonOfAppointment",
        a."created_at",
        u.id AS "patientId", u.name AS "patientName", u.email AS "patientEmail",
        u.number AS "patientContact", u.age AS "patientAge", u.gender AS "patientGender",
        s."bookingDate", s.status AS "slotStatus"
      FROM "Appointment" a
      JOIN "User" u ON a."userId" = u.id
      JOIN "Slot" s ON a."slotId" = s.id
      WHERE a."doctorId" = $1`;

    const params = [doctorId];
    let paramIndex = 2;

    if (status) {
      query += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (date) {
      query += ` AND a."appointmentDate" = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    query += ` ORDER BY a."appointmentDate" ASC, a."slotTime" ASC`;

    const { rows: appointments } = await pool.query(query, params);

    res.status(200).json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    console.error('getAllMeetings error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/doctor/meetings/:id
export const getMeetingById = async (req, res) => {
  const doctorId = req.user.id;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
  }

  try {
    const { rows: appointments } = await pool.query(
      `SELECT
        a.id AS "Id", a."appointmentDate", a."slotTime", a.status, a."reasonOfAppointment",
        a."requestGroupId", a."created_at", a."updated_at",
        u.id AS "patientId", u.name AS "patientName", u.email AS "patientEmail",
        u.number AS "patientContact", u.age AS "patientAge", u.gender AS "patientGender",
        s.id AS "slotId", s."bookingDate", s.status AS "slotStatus"
       FROM "Appointment" a
       JOIN "User" u ON a."userId" = u.id
       JOIN "Slot" s ON a."slotId" = s.id
       WHERE a.id = $1 AND a."doctorId" = $2`,
      [id, doctorId]
    );

    if (appointments.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    res.status(200).json({ success: true, data: appointments[0] });
  } catch (error) {
    console.error('getMeetingById error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/doctor/meetings/:id  — doctor denies/cancels an appointment
export const deleteMeeting = async (req, res) => {
  const doctorId = req.user.id;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: appointments } = await client.query(
      `SELECT id, "slotId", status, "userId" FROM "Appointment"
       WHERE id = $1 AND "doctorId" = $2
       FOR UPDATE`,
      [id, doctorId]
    );

    if (appointments.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const targetAppointment = appointments[0];

    if (targetAppointment.status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Cannot deny a completed appointment' });
    }

    if (targetAppointment.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Appointment is already cancelled' });
    }

    await client.query(
      `UPDATE "Appointment" SET status = 'cancelled', "updated_at" = NOW() WHERE id = $1`,
      [id]
    );

    await client.query(
      `UPDATE "Slot" SET status = 'available', "userId" = NULL, "updated_at" = NOW() WHERE id = $1`,
      [targetAppointment.slotId]
    );

    await client.query('COMMIT');

    res.status(200).json({ success: true, message: 'Appointment denied and slot released successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('deleteMeeting (doctor) error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};
