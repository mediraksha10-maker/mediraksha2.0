import pool from '../config/db.js';

export const getHospitals = async (req, res) => {
    try {
        // Implementation for fetching all hospitals
        const [hospitals] = await pool.query('SELECT * FROM hospitals');

        res.json(hospitals);
    } catch (err) {
        console.error('Error fetching hospitals', err);
        res.status(500).json({ error: 'Internal server error' });
    }
  
};

export const getHospitalById = async (req, res) => {
  try {
    // Implementation for fetching a hospital by ID
    const { id } = req.params;
    const [hospital] = await pool.query('SELECT * FROM hospitals WHERE id = ?', [id]);

    if (hospital.length === 0) {
        return res.status(404).json({ error: 'Hospital not found' });
    }

    res.json(hospital[0]);
  } catch (err) {
    console.error('Error fetching hospital', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};