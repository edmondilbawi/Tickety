import { pathToFileURL } from 'node:url';
import pg from 'pg';
import getDatabaseOptions from './databaseOptions.js';
import {
  assertSafeTestEnvironment,
} from './testEnvironment.js';

const { Client } = pg;
const SAFE_DATABASE_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;

const createTestDatabase = async () => {
  assertSafeTestEnvironment();

  const testDatabase = process.env.DB_NAME;
  const adminDatabase = process.env.DB_ADMIN_NAME || 'postgres';

  if (!SAFE_DATABASE_NAME.test(testDatabase)) {
    throw new Error('Test database name contains unsupported characters');
  }

  if (adminDatabase === testDatabase) {
    throw new Error('DB_ADMIN_NAME must differ from the test database name');
  }

  const client = new Client(getDatabaseOptions(adminDatabase));

  try {
    await client.connect();
    const existing = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [testDatabase],
    );

    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${testDatabase}"`);
      console.log(`Created disposable test database: ${testDatabase}`);
    } else {
      console.log(`Disposable test database already exists: ${testDatabase}`);
    }
  } finally {
    await client.end();
  }
};

const isMainModule = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  createTestDatabase().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

export default createTestDatabase;
