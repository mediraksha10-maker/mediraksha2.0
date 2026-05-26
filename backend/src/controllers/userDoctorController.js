import { pool } from '../config/db.js';

// GET /api/user/doctor/my
// Returns the doctor registered to the logged-in user
export const getMyDoctor = async (req, res) => {
  const userId = req.user.id;

  try {
    const [user] = await pool.query(
      `SELECT registeredDoctorId FROM User WHERE Id = ?`,
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user[0].registeredDoctorId) {
      return res.status(404).json({ success: false, message: 'No doctor registered yet' });
    }

    const [doctor] = await pool.query(
      `SELECT Id, name, email, number, age, gender, hospital, speciality, created_at
       FROM Doctor
       WHERE Id = ?`,
      [user[0].registeredDoctorId]
    );

    if (doctor.length === 0) {
      return res.status(404).json({ success: false, message: 'Registered doctor no longer exists' });
    }

    res.status(200).json({ success: true, data: doctor[0] });
  } catch (error) {
    console.error('getMyDoctor error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/user/doctor/search/:name
// Search doctors by name (partial match), useful before registering one
export const getDoctorByName = async (req, res) => {
  const { name } = req.params;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
  }

  try {
    const [doctors] = await pool.query(
      `SELECT Id, name, email, number, age, gender, hospital, speciality
       FROM Doctor
       WHERE name LIKE ?
       ORDER BY name ASC`,
      [`%${name.trim()}%`]
    );

    if (doctors.length === 0) {
      return res.status(404).json({ success: false, message: 'No doctors found with that name' });
    }

    res.status(200).json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    console.error('getDoctorByName error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/user/doctor/:doctorId
// Get full details of a specific doctor + register them to the user if not already registered
export const getDoctorById = async (req, res) => {
  const userId = req.user.id;
  const { doctorId } = req.params;

  if (isNaN(doctorId)) {
    return res.status(400).json({ success: false, message: 'Invalid doctor ID' });
  }

  try {
    const [doctor] = await pool.query(
      `SELECT Id, name, email, number, age, gender, hospital, speciality, created_at
       FROM Doctor
       WHERE Id = ?`,
      [doctorId]
    );

    if (doctor.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Check current registered doctor on user
    const [user] = await pool.query(
      `SELECT registeredDoctorId FROM User WHERE Id = ?`,
      [userId]
    );

    let registered = false;
    let message = 'Doctor fetched successfully';

    if (!user[0].registeredDoctorId) {
      // No doctor registered yet — auto-register this one
      await pool.query(
        `UPDATE User SET registeredDoctorId = ? WHERE Id = ?`,
        [doctorId, userId]
      );
      registered = true;
      message = 'Doctor fetched and registered to your account';
    } else if (user[0].registeredDoctorId === parseInt(doctorId)) {
      registered = true;
      message = 'Doctor fetched (already your registered doctor)';
    }

    res.status(200).json({
      success: true,
      message,
      isRegisteredToYou: registered,
      data: doctor[0]
    });
  } catch (error) {
    console.error('getDoctorById error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// DELETE /api/user/doctor/:doctorId
// Remove the registered doctor from user's profile
export const removeRegisteredDoctor = async (req, res) => {
  const userId = req.user.id;
  const { doctorId } = req.params;

  if (isNaN(doctorId)) {
    return res.status(400).json({ success: false, message: 'Invalid doctor ID' });
  }

  try {
    const [user] = await pool.query(
      `SELECT registeredDoctorId FROM User WHERE Id = ?`,
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user[0].registeredDoctorId) {
      return res.status(400).json({ success: false, message: 'No doctor is currently registered' });
    }

    if (user[0].registeredDoctorId !== parseInt(doctorId)) {
      return res.status(403).json({ success: false, message: 'This doctor is not registered to your account' });
    }

    // Check for any pending/upcoming appointments with this doctor before removing
    const [activeAppointments] = await pool.query(
      `SELECT Id FROM Appointments
       WHERE userId = ? AND doctorId = ? AND status IN ('pending', 'confirmed')
       AND appointmentDate >= CURDATE()`,
      [userId, doctorId]
    );

    if (activeAppointments.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot remove doctor. You have ${activeAppointments.length} upcoming appointment(s). Cancel them first.`,
        activeAppointments: activeAppointments.length
      });
    }

    await pool.query(
      `UPDATE User SET registeredDoctorId = NULL WHERE Id = ?`,
      [userId]
    );

    res.status(200).json({ success: true, message: 'Doctor removed from your profile successfully' });
  } catch (error) {
    console.error('removeRegisteredDoctor error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};