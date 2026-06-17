import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import seed from './seed.js'
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
const __dirname = path.resolve();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Define API routes
app.get('/api', (req, res) => {
  res.status(200).send('Mediraksha API is running');
});
app.use('/api/auth', authRoutes);
app.use('/api/user', authVerify, userRoutes);
app.use('/api/doctor', authVerify, doctorRoutes);
app.use('/api/chat', aiRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/disease', diseaseRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// Start the server after connecting to the database
connectDB().then(() => {
  seed();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/api`);
  });
}).catch((err) => {
  console.error('Failed to connect to the database', err);
});