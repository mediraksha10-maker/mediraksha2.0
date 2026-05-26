import { pool } from '../config/db.js';

// GET /api/doctor/meetings/all
export const getAllMeetings = async (req, res) => {
  const doctorId = req.user.id;
  const { status, date } = req.query; // optional filters ?status=pending&date=2025-06-01

  try {
    let query = `
      SELECT
        a.Id, a.appointmentDate, a.slotTime, a.status, a.reasonOfAppointment,
        a.created_at,
        u.Id AS patientId, u.name AS patientName, u.email AS patientEmail,
        u.number AS patientContact, u.age AS patientAge, u.gender AS patientGender,
        s.bookingDate, s.status AS slotStatus
      FROM Appointments a
      JOIN User u ON a.userId = u.Id
      JOIN Slots s ON a.slotId = s.Id
      WHERE a.doctorId = ?`;

    const params = [doctorId];

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }
    if (date) {
      query += ` AND a.appointmentDate = ?`;
      params.push(date);
    }

    query += ` ORDER BY a.appointmentDate ASC, a.slotTime ASC`;

    const [appointments] = await pool.query(query, params);

    if (appointments.length === 0) {
      return res.status(404).json({ success: false, message: 'No appointments found' });
    }

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

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
  }

  try {
    const [appointment] = await pool.query(
      `SELECT
        a.Id, a.appointmentDate, a.slotTime, a.status, a.reasonOfAppointment,
        a.RequestGroupId, a.created_at, a.updated_at,
        u.Id AS patientId, u.name AS patientName, u.email AS patientEmail,
        u.number AS patientContact, u.age AS patientAge, u.gender AS patientGender,
        s.Id AS slotId, s.bookingDate, s.status AS slotStatus
       FROM Appointments a
       JOIN User u ON a.userId = u.Id
       JOIN Slots s ON a.slotId = s.Id
       WHERE a.Id = ? AND a.doctorId = ?`,
      [id, doctorId]
    );

    if (appointment.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    res.status(200).json({ success: true, data: appointment[0] });
  } catch (error) {
    console.error('getMeetingById error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/doctor/meetings/:id  — doctor denies/cancels an appointment
export const deleteMeeting = async (req, res) => {
  const doctorId = req.user.id;
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid appointment ID' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [appointment] = await conn.query(
      `SELECT Id, slotId, status, userId FROM Appointments
       WHERE Id = ? AND doctorId = ?`,
      [id, doctorId]
    );

    if (appointment.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment[0].status === 'completed') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Cannot deny a completed appointment' });
    }

    if (appointment[0].status === 'cancelled') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Appointment is already cancelled' });
    }

    // Mark appointment as cancelled instead of hard delete — preserves history
    await conn.query(
      `UPDATE Appointments SET status = 'cancelled', updated_at = NOW() WHERE Id = ?`,
      [id]
    );

    // Free the slot back to available
    await conn.query(
      `UPDATE Slots SET status = 'available', userId = NULL WHERE Id = ?`,
      [appointment[0].slotId]
    );

    await conn.commit();

    res.status(200).json({ success: true, message: 'Appointment denied and slot released successfully' });
  } catch (error) {
    await conn.rollback();
    console.error('deleteMeeting (doctor) error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    conn.release();
  }
};