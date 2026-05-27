import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { pool, types } = pkg;

// Override the default parser for numeric types to return strings
types.setTypeParser(1082, (val) => val);

const pool = new pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },  
});

pool.on("connect", () => {
    console.log("Connected to Neon Postgress");
});

pool.on("error", (err) => {
    console.error("Unexpected Postgress error:", err);
    process.exit(-1);
});

export default pool;