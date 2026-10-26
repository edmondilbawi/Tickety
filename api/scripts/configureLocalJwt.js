import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const envPath = path.join(apiRoot, '.env');

let envContent = '';

try {
  envContent = await readFile(envPath, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error;
  }
}

const jwtLinePattern = /^JWT_SECRET\s*=\s*(.*)$/m;
const existingMatch = envContent.match(jwtLinePattern);
const fileSecretExists = Boolean(existingMatch?.[1]?.trim());

if (process.env.JWT_SECRET?.trim()) {
  console.log('JWT_SECRET is already supplied by the runtime environment.');
} else if (fileSecretExists) {
  console.log('JWT_SECRET is already configured in api/.env.');
} else {
  const generatedSecret = randomBytes(32).toString('hex');
  const jwtLine = `JWT_SECRET=${generatedSecret}`;

  if (existingMatch) {
    envContent = envContent.replace(jwtLinePattern, jwtLine);
  } else {
    const separator = envContent && !envContent.endsWith('\n') ? '\n' : '';
    envContent = `${envContent}${separator}${jwtLine}\n`;
  }

  await writeFile(envPath, envContent, { encoding: 'utf8', mode: 0o600 });
  console.log('Generated and stored a local JWT_SECRET in api/.env (value hidden).');
}
