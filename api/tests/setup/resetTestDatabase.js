import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import getDatabaseOptions from './databaseOptions.js';
import {
  apiRoot,
  assertSafeTestEnvironment,
} from './testEnvironment.js';

const { Client } = pg;

const resetTestDatabase = async () => {
  assertSafeTestEnvironment();

  const schemaPath = path.join(apiRoot, 'sql', 'schema.sql');
  const schemaSql = await readFile(schemaPath, 'utf8');
  const client = new Client(getDatabaseOptions());

  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query(schemaSql);
    await client.query('COMMIT');
    console.log(`Reset disposable test database: ${process.env.DB_NAME}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
};

const isMainModule = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  resetTestDatabase().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

export default resetTestDatabase;
