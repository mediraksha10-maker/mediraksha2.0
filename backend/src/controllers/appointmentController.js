import { pool } from '../config/db.js';

// GET /api/user/meetings/all
export const getAllMeetings = async (req, res) => {
  const userId = req.user.id;

  try {
    const [appointments] = await pool.query(
      `SELECT 
        a.Id, a.appointmentDate, a.slotTime, a.status, a.reasonOfAppointment,
        d.name AS doctorName, d.speciality, d.hospital,
        s.bookingDate, s.status AS slotStatus
       FROM Appointments a
       JOIN Doctor d ON a.doctorId = d.Id
       JOIN Slots s ON a.slotId = s.Id
       WHERE a.userId = ?
       ORDER BY a.appointmentDate DESC, a.slotTime ASC`,
      [userId]
    );

    if (appointments.length === 0) {
      return res.status(404).json({ success: false, message: 'No appointments found' });
    }

    res.status(200).json({ success: true, data: appointments });
  } catch (error) {
    console.error('getAllMeetings error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/user/meetings/:id
export const getMeetingById = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const [appointment] = await pool.query(
      `SELECT 
        a.Id, a.appointmentDate, a.slotTime, a.status, a.reasonOfAppointment,
        d.name AS doctorName, d.speciality, d.hospital, d.number AS doctorContact,
        s.bookingDate, s.status AS slotStatus
       FROM Appointments a
       JOIN Doctor d ON a.doctorId = d.Id
       JOIN Slots s ON a.slotId = s.Id
       WHERE a.Id = ? AND a.userId = ?`,
      [id, userId]
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

// DELETE /api/user/meetings/:id
export const deleteMeeting = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    // Verify ownership before deletion
    const [appointment] = await pool.query(
      `SELECT Id, slotId, status FROM Appointments WHERE Id = ? AND userId = ?`,
      [id, userId]
    );

    if (appointment.length === 0) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment[0].status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed appointment' });
    }

    // Free up the slot back to available
    await pool.query(
      `UPDATE Slots SET status = 'available' WHERE Id = ?`,
      [appointment[0].slotId]
    );

    await pool.query(`DELETE FROM Appointments WHERE Id = ?`, [id]);

    res.status(200).json({ success: true, message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('deleteMeeting error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/user/meetings/book
// Body: { doctorId, slotId, appointmentDate, reasonOfAppointment }
export const bookMeeting = async (req, res) => {
  const userId = req.user.id;
  const { doctorId, slotId, appointmentDate, reasonOfAppointment } = req.body;

  if (!doctorId || !slotId || !appointmentDate) {
    return res.status(400).json({ success: false, message: 'doctorId, slotId, and appointmentDate are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the slot row to prevent race conditions
    const [slot] = await conn.query(
      `SELECT Id, status, bookingDate FROM Slots 
       WHERE Id = ? AND doctorId = ? AND status = 'available'
       FOR UPDATE`,
      [slotId, doctorId]
    );

    if (slot.length === 0) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'Slot is no longer available' });
    }

    // Check user does not already have an appointment with same doctor on same date
    const [duplicate] = await conn.query(
      `SELECT Id FROM Appointments 
       WHERE userId = ? AND doctorId = ? AND appointmentDate = ? AND status != 'cancelled'`,
      [userId, doctorId, appointmentDate]
    );

    if (duplicate.length > 0) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'You already have an appointment with this doctor on the selected date' });
    }

    // Mark slot as booked
    await conn.query(
      `UPDATE Slots SET status = 'booked', userId = ? WHERE Id = ?`,
      [userId, slotId]
    );

    // Create the appointment
    const [result] = await conn.query(
      `INSERT INTO Appointments (userId, doctorId, slotId, appointmentDate, reasonOfAppointment, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, doctorId, slotId, appointmentDate, reasonOfAppointment || null]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: { appointmentId: result.insertId }
    });
  } catch (error) {
    await conn.rollback();
    console.error('bookMeeting error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    conn.release();
  }
};

// GET /api/user/meetings/slot/:doctorId
// Query params: ?date=YYYY-MM-DD (optional, defaults to today onwards)
export const getAvailableSlots = async (req, res) => {
  const { doctorId } = req.params;
  const { date } = req.query;

  // If a specific date is passed use it, otherwise return all future available slots
  const fromDate = date || new Date().toISOString().split('T')[0];

  try {
    const [doctor] = await pool.query(
      `SELECT Id, name, speciality, hospital FROM Doctor WHERE Id = ?`,
      [doctorId]
    );

    if (doctor.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const [slots] = await pool.query(
      `SELECT Id, bookingDate, status, created_at
       FROM Slots
       WHERE doctorId = ? AND status = 'available' AND bookingDate >= ?
       ORDER BY bookingDate ASC`,
      [doctorId, fromDate]
    );

    res.status(200).json({
      success: true,
      doctor: doctor[0],
      availableSlots: slots,
      count: slots.length
    });
  } catch (error) {
    console.error('getAvailableSlots error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};