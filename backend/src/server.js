import express from 'express';
import dotenv from 'dotenv';
import { pool, connectDB } from './config/db.js';

dotenv.config();


const app = express();

app.get('/api', (req, res) => {
  res.status(200).send('Mediraksha API is running');
});

app.get('/api/sql', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({ time: result.rows[0].now });
  } catch (err) {
    console.error('Error executing SQL query', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

console.log(process.env.DB_URL);
connectDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/api`);
  });
}).catch((err) => {
  console.error('Failed to connect to the database', err);
});