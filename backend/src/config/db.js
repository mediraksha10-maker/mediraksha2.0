import pkg from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

dns.setDefaultResultOrder('ipv4first'); 

const { Pool } = pkg;

const isLocalhost = process.env.DB_URL.includes('localhost') || process.env.DB_URL.includes('127.0.0.1') || process.env.DB_URL.includes('database');

const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: isLocalhost ? false : {
        rejectUnauthorized: false
    }
});

const connectDB = async () => {
    try {
        const client = await pool.connect();
        console.log('PostgreSQL Connected Successfully to Cloud/Docker!');
        client.release();
    } catch (err) {
        console.error('Error connecting to PostgreSQL database:', err.message);
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    }   
}

export { connectDB, pool };