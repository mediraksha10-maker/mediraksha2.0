import { pool } from '../config/db.js';

export const getHospitals = async (req, res) => {
    try {
        // Implementation for fetching all hospitals
        const response = await pool.query('SELECT * FROM "Hospital"');
        const hospitals = response.rows;
        res.json({data: hospitals});
    } catch (err) {
        console.error('Error fetching hospitals', err);
        res.status(500).json({ error: 'Internal server error' });
    }
  
};

export const getHospitalById = async (req, res) => {
  try {
    // Implementation for fetching a hospital by ID
    const { id } = req.params;
    const response = await pool.query('SELECT * FROM "Hospital" WHERE id = $1', [id]);

    const hospital = response.rows[0];
    if (hospital) {
        return res.status(404).json({ error: 'Hospital not found' });
    }

    res.json(hospital);
  } catch (err) {
    console.error('Error fetching hospital', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};