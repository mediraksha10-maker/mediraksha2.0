import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DB_URL,
})


const connectDB = async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to PostgreSQL database');
        client.release();
    } catch (err) {
        console.error('Error connecting to PostgreSQL database', err);
        process.exit(1);
    }   
}


export { connectDB, pool };