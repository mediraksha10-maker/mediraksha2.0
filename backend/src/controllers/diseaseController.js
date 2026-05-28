import { pool } from '../config/db.js';

export const getDiseases = async (req, res) => {
    try {
        // Implementation for fetching all diseases
        const response = await pool.query('SELECT * FROM "Disease"');
        const diseases = response.rows;
        res.json({data:diseases});
    } catch (err) {
        console.error('Error fetching diseases', err);
        res.status(500).json({ error: 'Internal server error' });
    }
  
};

export const getDiseaseById = async (req, res) => {
  try {
    // Implementation for fetching a disease by ID
    const { id } = req.params;
    const response = await pool.query('SELECT * FROM "Disease" WHERE id = $1', [id]);
    const disease = response.rows[0];

    if (disease) {
        return res.status(404).json({ error: 'Disease not found' });
    }

    res.json(disease);
  } catch (err) {
    console.error('Error fetching disease', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
