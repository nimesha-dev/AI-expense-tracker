import dotenv from 'dotenv';
import pkg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';

// Load default .env first (project root). If DATABASE_URL isn't set,
// attempt to load a `.env` located next to this file (backend/utils/.env).
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '.env') });
}

const { Pool, types } = pkg;

// Parse numeric values as floats instead of strings
types.setTypeParser(1082, (val) => val); // Date

const useSsl = process.env.NODE_ENV === 'production';

const poolConfig = {
    connectionString: process.env.DATABASE_URL,
};

if (useSsl) {
    poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
    console.log('Connected to Neon Postgres');
});

pool.on('error', (err) => {
    console.error('Unexpected Postgres error:', err);
    process.exit(-1);
});

export default pool;