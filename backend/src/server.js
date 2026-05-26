import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { pool, connectDB } from './config/db.js';

// routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import diseaseRoutes from './routes/diseaseRoutes.js';
import authVerify from './middlewares/authVerify.js';



dotenv.config();
const app = express();


// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));


// Define routes
app.get('/api', (req, res) => {
  res.status(200).send('Mediraksha API is running');
});
app.use('/api/auth', authRoutes);
app.use('/api/user',authVerify, userRoutes);
app.use('/api/doctor', authVerify, doctorRoutes);
app.use('/api/aichat', authverify, aiRoutes.js);
app.use('/api/hospital', authVerify, hospitalRoutes);
app.use('/api/disease', authVerify, diseaseRoutes);


// Start the server after connecting to the database
connectDB().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/api`);
  });
}).catch((err) => {
  console.error('Failed to connect to the database', err);
});