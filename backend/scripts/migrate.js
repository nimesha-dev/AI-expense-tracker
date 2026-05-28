import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DROP_ALL = `
  DROP TABLE IF EXISTS ai_insights CASCADE;
  DROP TABLE IF EXISTS budgets CASCADE;
  DROP TABLE IF EXISTS transactions CASCADE;
  DROP TABLE IF EXISTS categories CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
`;

  //CASCADE KEY WORD - make sure foreign keys don't block the code

  const runMigration = async () => {
    const shouldReset = process.argv.includes('--reset');
    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');

    try {
        if (shouldReset) {
            console.log('Dropping exisiting tables......');
            await pool.query(DROP_ALL);
        }

        console.log('Reading schema from ${schemaPath}');
        const schema = await fs.readFile(schemaPath, 'utf-8');

        console.log('Running migration.....');
        await pool.guery(schema);

        console.log('Migration complete. Table created');
    } catch(error) {
        console.error('Migration Failed:', error.message);
        process.exitCode = 1;
    }  finally {
        await pool.end();
    }
};


runMigration();