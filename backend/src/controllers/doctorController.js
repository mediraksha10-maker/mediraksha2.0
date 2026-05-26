import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';

// GET /api/doctor/info/detail
export const getDoctorDetail = async (req, res) => {
  const doctorId = req.user.id;

  try {
    const [doctor] = await pool.query(
      `SELECT Id, name, email, number, age, gender, hospital, speciality, created_at, updated_at
       FROM Doctor
       WHERE Id = ?`,
      [doctorId]
    );

    if (doctor.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.status(200).json({ success: true, data: doctor[0] });
  } catch (error) {
    console.error('getDoctorDetail error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// PATCH /api/doctor/info/update
// Body: any subset of { name, number, age, gender, hospital, speciality, password }
export const updateDoctorDetail = async (req, res) => {
  const doctorId = req.user.id;
  const { name, number, age, gender, hospital, speciality, password } = req.body;

  const allowedFields = { name, number, age, gender, hospital, speciality };
  const updates = {};

  // Only include fields that were actually sent
  for (const [key, value] of Object.entries(allowedFields)) {
    if (value !== undefined && value !== null && value !== '') {
      updates[key] = value;
    }
  }

  // Handle password separately — hash before storing
  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    updates.password = await bcrypt.hash(password, 10);
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: 'No valid fields provided to update' });
  }

  try {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), doctorId];

    await pool.query(
      `UPDATE Doctor SET ${fields}, updated_at = NOW() WHERE Id = ?`,
      values
    );

    // Return fresh record (exclude password)
    const [updated] = await pool.query(
      `SELECT Id, name, email, number, age, gender, hospital, speciality, updated_at
       FROM Doctor WHERE Id = ?`,
      [doctorId]
    );

    res.status(200).json({ success: true, message: 'Profile updated successfully', data: updated[0] });
  } catch (error) {
    console.error('updateDoctorDetail error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/doctor/info/delete
export const deleteDoctorAccount = async (req, res) => {
  const doctorId = req.user.id;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Block deletion if active upcoming appointments exist
    const [active] = await conn.query(
      `SELECT Id FROM Appointments
       WHERE doctorId = ? AND status IN ('pending', 'confirmed')
       AND appointmentDate >= CURDATE()`,
      [doctorId]
    );

    if (active.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: `Cannot delete account. ${active.length} upcoming appointment(s) still pending. Resolve them first.`,
      });
    }

    // Detach any users who had this doctor registered
    await conn.query(
      `UPDATE User SET registeredDoctorId = NULL WHERE registeredDoctorId = ?`,
      [doctorId]
    );

    // Free all slots
    await conn.query(`DELETE FROM Slots WHERE doctorId = ?`, [doctorId]);

    // Delete all appointments (historical)
    await conn.query(`DELETE FROM Appointments WHERE doctorId = ?`, [doctorId]);

    // Delete doctor
    await conn.query(`DELETE FROM Doctor WHERE Id = ?`, [doctorId]);

    await conn.commit();

    res.clearCookie('token');
    res.status(200).json({ success: true, message: 'Doctor account deleted successfully' });
  } catch (error) {
    await conn.rollback();
    console.error('deleteDoctorAccount error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    conn.release();
  }
};