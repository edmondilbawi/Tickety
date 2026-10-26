import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import resetTestDatabase from './setup/resetTestDatabase.js';
import './setup/testEnvironment.js';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const runTests = () => new Promise((resolve, reject) => {
  const child = spawn(
    process.execPath,
    [
      '--test',
      '--test-concurrency=1',
      'tests/integration.test.js',
    ],
    {
      cwd: apiRoot,
      env: process.env,
      stdio: 'inherit',
    },
  );

  child.once('error', reject);
  child.once('exit', (code) => resolve(code ?? 1));
});

let exitCode = 1;

try {
  await resetTestDatabase();
  exitCode = await runTests();
} catch (error) {
  console.error(error.message);
} finally {
  try {
    await resetTestDatabase();
  } catch (cleanupError) {
    console.error(`Test cleanup failed: ${cleanupError.message}`);
    exitCode = 1;
  }
}

process.exitCode = exitCode;
