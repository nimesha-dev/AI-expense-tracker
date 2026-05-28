import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Pool, types } = pkg;

// Parse numeric values as floats instead of strings
types.setTypeParser(1082, (val) => val); // Date

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
    console.log('Connected to Neon Postgres');
});

pool.on('error', (err) => {
    console.error('Unexpected Postgres error:', err);
    process.exit(-1);
});

export default pool;