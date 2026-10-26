import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import pool from '../src/config/database.js';
import * as userRepository from '../src/repositories/user.repository.js';

const getEmailArgument = () => {
  const emailIndex = process.argv.indexOf('--email');
  const value = emailIndex >= 0 ? process.argv[emailIndex + 1] : '';
  const email = value?.trim().toLowerCase();

  if (!email) {
    throw new Error(
      'Usage: npm run owner:promote -- --email someone@example.com',
    );
  }

  return email;
};

const promoteOwnerByEmail = async (rawEmail) => {
  const email = rawEmail?.trim().toLowerCase();

  if (!email) {
    throw new Error('An email is required');
  }

  const user = await userRepository.getUserByEmail(email);

  if (!user) {
    throw new Error(`No existing user was found for ${email}`);
  }

  return userRepository.updateUserRole(user.id, 'owner');
};

const isMainModule = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  try {
    const owner = await promoteOwnerByEmail(getEmailArgument());
    console.log(`Promoted ${owner.email} to Owner.`);
  } finally {
    await pool.end();
  }
}

export { promoteOwnerByEmail };
