import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';
import pool from '../src/config/database.js';
import * as userRepository from '../src/repositories/user.repository.js';
import { BCRYPT_ROUNDS } from '../src/services/auth.service.js';
import { validatePassword } from '../src/validators/user.validator.js';

const getEmailArgument = () => {
  const emailIndex = process.argv.indexOf('--email');
  const value = emailIndex >= 0 ? process.argv[emailIndex + 1] : '';
  const email = value?.trim().toLowerCase();

  if (!email) {
    throw new Error(
      'Usage: npm run user:reset-password -- --email someone@example.com',
    );
  }

  return email;
};

const resetUserPassword = async (rawEmail, newPassword) => {
  const email = rawEmail?.trim().toLowerCase();

  if (!email) {
    throw new Error('An email is required');
  }

  const errors = validatePassword(newPassword);
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }

  const user = await userRepository.getUserByEmail(email);
  if (!user) {
    throw new Error(`No existing user was found for ${email}`);
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  return userRepository.updateUserPassword(user.id, passwordHash);
};

const isMainModule = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  try {
    const user = await resetUserPassword(
      getEmailArgument(),
      process.env.RESET_USER_PASSWORD,
    );
    console.log(`Reset password for ${user.email}. Role remains ${user.role}.`);
  } finally {
    await pool.end();
  }
}

export { resetUserPassword };
