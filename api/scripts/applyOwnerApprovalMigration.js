import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pool from '../src/config/database.js';

const getArgument = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};

const confirmedDatabase = getArgument('--database');
const configuredDatabase = process.env.DB_NAME;
const configuredHost = (process.env.DB_HOST || 'localhost').toLowerCase();
const localHosts = new Set(['localhost', '127.0.0.1', '::1']);

if (!configuredDatabase) {
  throw new Error('DB_NAME must be configured in api/.env');
}

if (!localHosts.has(configuredHost)) {
  throw new Error('Migration refused: DB_HOST must identify a local PostgreSQL server');
}

if (!confirmedDatabase || confirmedDatabase !== configuredDatabase) {
  throw new Error(
    'Migration refused: pass --database with the exact DB_NAME from api/.env',
  );
}

const migrationPath = fileURLToPath(new URL(
  '../sql/migrations/001_owner_approval_interests.sql',
  import.meta.url,
));

try {
  const databaseResult = await pool.query('SELECT current_database() AS name');
  const connectedDatabase = databaseResult.rows[0]?.name;

  if (connectedDatabase !== configuredDatabase) {
    throw new Error(
      `Migration refused: connected to ${connectedDatabase}, expected ${configuredDatabase}`,
    );
  }

  const sql = await readFile(migrationPath, 'utf8');
  await pool.query(sql);
  console.log(`Applied Owner/approval/interests migration to ${connectedDatabase}.`);
} finally {
  await pool.end();
}
