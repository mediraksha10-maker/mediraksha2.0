import { pool } from '../config/db.js';

// GET /api/doctor/user/my  — all patients registered to this doctor
export const getAllPatients = async (req, res) => {
  const doctorId = req.user.id;

  try {
    const [patients] = await pool.query(
      `SELECT
        u.Id, u.name, u.email, u.number, u.age, u.gender,
        COUNT(a.Id) AS totalAppointments,
        MAX(a.appointmentDate) AS lastAppointmentDate
       FROM User u
       LEFT JOIN Appointments a ON a.userId = u.Id AND a.doctorId = ?
       WHERE u.registeredDoctorId = ?
       GROUP BY u.Id
       ORDER BY u.name ASC`,
      [doctorId, doctorId]
    );

    if (patients.length === 0) {
      return res.status(404).json({ success: false, message: 'No patients registered yet' });
    }

    res.status(200).json({ success: true, count: patients.length, data: patients });
  } catch (error) {
    console.error('getAllPatients error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/doctor/user/:id  — single patient detail + their appointment history with this doctor
export const getPatientById = async (req, res) => {
  const doctorId = req.user.id;
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid patient ID' });
  }

  try {
    // Verify the patient is actually registered to this doctor
    const [user] = await pool.query(
      `SELECT Id, name, email, number, age, gender, created_at
       FROM User
       WHERE Id = ? AND registeredDoctorId = ?`,
      [id, doctorId]
    );

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found or not registered to you' });
    }

    // Fetch appointment history with this doctor
    const [appointments] = await pool.query(
      `SELECT
        a.Id, a.appointmentDate, a.slotTime, a.status,
        a.reasonOfAppointment, a.created_at
       FROM Appointments a
       WHERE a.userId = ? AND a.doctorId = ?
       ORDER BY a.appointmentDate DESC`,
      [id, doctorId]
    );

    res.status(200).json({
      success: true,
      data: {
        patient: user[0],
        appointmentHistory: appointments,
        totalAppointments: appointments.length,
      },
    });
  } catch (error) {
    console.error('getPatientById error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/doctor/user/:id  — remove patient registration from this doctor
export const removePatient = async (req, res) => {
  const doctorId = req.user.id;
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid patient ID' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [user] = await conn.query(
      `SELECT Id, registeredDoctorId FROM User WHERE Id = ?`,
      [id]
    );

    if (user.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (user[0].registeredDoctorId !== doctorId) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'This patient is not registered to you' });
    }

    // Block removal if active upcoming appointments exist
    const [active] = await conn.query(
      `SELECT Id FROM Appointments
       WHERE userId = ? AND doctorId = ?
       AND status IN ('pending', 'confirmed')
       AND appointmentDate >= CURDATE()`,
      [id, doctorId]
    );

    if (active.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: `Cannot remove patient. ${active.length} upcoming appointment(s) still active.`,
        activeAppointments: active.length,
      });
    }

    // Detach patient from this doctor
    await conn.query(
      `UPDATE User SET registeredDoctorId = NULL WHERE Id = ?`,
      [id]
    );

    await conn.commit();

    res.status(200).json({ success: true, message: 'Patient removed from your profile successfully' });
  } catch (error) {
    await conn.rollback();
    console.error('removePatient error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    conn.release();
  }
};