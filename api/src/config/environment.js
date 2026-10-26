import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const apiRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

dotenv.config({ path: path.join(apiRoot, '.env'), quiet: true });

const validateRuntimeConfig = () => {
  if (!process.env.JWT_SECRET?.trim()) {
    throw new Error('JWT_SECRET is required');
  }
};

export { apiRoot, validateRuntimeConfig };
