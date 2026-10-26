import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

dotenv.config({ path: path.join(apiRoot, '.env.demo'), quiet: true });
dotenv.config({ path: path.join(apiRoot, '.env'), quiet: true });

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const requireDemoEmail = (name) => {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value || !value.includes('demo') || !value.endsWith('@example.com')) {
    throw new Error(`${name} must be a demo-only @example.com address`);
  }

  return value;
};

const requireDemoPassword = (name) => {
  const value = process.env[name];

  if (
    !value
    || value.length < 12
    || !/[a-z]/.test(value)
    || !/[A-Z]/.test(value)
    || !/\d/.test(value)
    || !/[^A-Za-z0-9]/.test(value)
  ) {
    throw new Error(
      `${name} must be 12+ characters with uppercase, lowercase, number and symbol in .env.demo`,
    );
  }

  return value;
};

const requireEmail = (name) => {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value || !value.includes('@')) {
    throw new Error(`${name} must contain a configured email address`);
  }

  return value;
};

const assertNotProduction = () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo commands are disabled when NODE_ENV=production');
  }
};

const getDemoAccounts = () => ({
  owner: {
    email: requireEmail('DEMO_OWNER_EMAIL'),
    password: requireDemoPassword('DEMO_OWNER_PASSWORD'),
  },
  organizer: {
    firstName: 'Demo',
    lastName: 'Organizer',
    email: requireDemoEmail('DEMO_ORGANIZER_EMAIL'),
    password: requireDemoPassword('DEMO_ORGANIZER_PASSWORD'),
  },
  customer: {
    firstName: 'Demo',
    lastName: 'Customer',
    email: requireDemoEmail('DEMO_CUSTOMER_EMAIL'),
    password: requireDemoPassword('DEMO_CUSTOMER_PASSWORD'),
  },
});

const getLocalDemoApiUrl = () => {
  const url = new URL(
    process.env.DEMO_API_URL || 'http://localhost:3000/api',
  );

  if (!LOCAL_HOSTS.has(url.hostname) || url.protocol !== 'http:') {
    throw new Error('DEMO_API_URL must use HTTP on localhost');
  }

  return url.toString().replace(/\/$/, '');
};

const assertLocalDatabase = () => {
  const databaseHost = process.env.DB_HOST || 'localhost';

  if (!LOCAL_HOSTS.has(databaseHost)) {
    throw new Error('Demo reset is limited to a local PostgreSQL host');
  }

  if (!process.env.DB_NAME) {
    throw new Error('DB_NAME is required');
  }
};

export {
  assertLocalDatabase,
  assertNotProduction,
  getDemoAccounts,
  getLocalDemoApiUrl,
};
