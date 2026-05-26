import pool from '../db.js';

export const getDiseases = async (req, res) => {
    try {
        // Implementation for fetching all diseases
        const [diseases] = await pool.query('SELECT * FROM diseases');

        res.json(diseases);
    } catch (err) {
        console.error('Error fetching diseases', err);
        res.status(500).json({ error: 'Internal server error' });
    }
  
};

export const getDiseaseById = async (req, res) => {
  try {
    // Implementation for fetching a disease by ID
    const { id } = req.params;
    const [disease] = await pool.query('SELECT * FROM diseases WHERE id = ?', [id]);

    if (disease.length === 0) {
        return res.status(404).json({ error: 'Disease not found' });
    }

    res.json(disease[0]);
  } catch (err) {
    console.error('Error fetching disease', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
