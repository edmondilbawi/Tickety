import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const apiRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const testEnvPath = process.env.TEST_ENV_FILE
  ? path.resolve(process.cwd(), process.env.TEST_ENV_FILE)
  : path.join(apiRoot, '.env.test');

process.env.NODE_ENV = 'test';

dotenv.config({ path: testEnvPath, quiet: true });
dotenv.config({ path: path.join(apiRoot, '.env'), quiet: true });

// Local demo delivery overrides must not leak into baseline test expectations.
process.env.SMTP_TEST_RECIPIENT = '';

const assertSafeTestEnvironment = () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test database commands require NODE_ENV=test');
  }

  if (!process.env.DB_NAME || !process.env.DB_NAME.endsWith('_test')) {
    throw new Error(
      'Refusing destructive test setup: DB_NAME must end with "_test"',
    );
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set to a test-only value');
  }

  if (
    !process.env.TEST_USER_PASSWORD
    || process.env.TEST_USER_PASSWORD.length < 12
    || !/[a-z]/.test(process.env.TEST_USER_PASSWORD)
    || !/[A-Z]/.test(process.env.TEST_USER_PASSWORD)
    || !/\d/.test(process.env.TEST_USER_PASSWORD)
    || !/[^A-Za-z0-9]/.test(process.env.TEST_USER_PASSWORD)
  ) {
    throw new Error(
      'TEST_USER_PASSWORD must be 12+ characters with uppercase, lowercase, number and symbol',
    );
  }
};

export { apiRoot, assertSafeTestEnvironment, testEnvPath };
