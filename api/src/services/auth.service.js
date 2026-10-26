import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userRepository from '../repositories/user.repository.js';
import validateUser, { validateLogin } from '../validators/user.validator.js';

const BCRYPT_ROUNDS = 10;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const UNIQUE_VIOLATION = '23505';

const validationError = (errors) => {
  const error = new Error('Validation failed');
  error.status = 400;
  error.errors = errors;
  return error;
};

const duplicateEmail = () => {
  const error = new Error('An account with this email already exists');
  error.status = 409;
  return error;
};

const invalidCredentials = () => {
  const error = new Error('Invalid email or password');
  error.status = 401;
  return error;
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    const error = new Error('Authentication is not configured');
    error.status = 500;
    throw error;
  }

  return secret;
};

const normalizeRegistration = (user = {}, role) => ({
  firstName:
    typeof user.firstName === 'string' ? user.firstName.trim() : user.firstName,
  lastName:
    typeof user.lastName === 'string' ? user.lastName.trim() : user.lastName,
  email:
    typeof user.email === 'string'
      ? user.email.trim().toLowerCase()
      : user.email,
  password: user.password,
  role,
});

const toSafeUser = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const createAccount = async (registrationData, role) => {
  const user = normalizeRegistration(registrationData, role);
  const errors = validateUser(user);

  if (errors.length > 0) {
    throw validationError(errors);
  }

  const existingUser = await userRepository.getUserByEmail(user.email);

  if (existingUser) {
    throw duplicateEmail();
  }

  const passwordHash = await bcrypt.hash(user.password, BCRYPT_ROUNDS);

  try {
    return await userRepository.createUser({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      passwordHash,
      role: user.role,
    });
  } catch (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw duplicateEmail();
    }

    throw error;
  }
};

const register = async (registrationData) => {
  return createAccount(registrationData, 'customer');
};

const login = async (loginData = {}) => {
  const credentials = {
    email:
      typeof loginData.email === 'string'
        ? loginData.email.trim().toLowerCase()
        : loginData.email,
    password: loginData.password,
  };
  const errors = validateLogin(credentials);

  if (errors.length > 0) {
    throw validationError(errors);
  }

  const user = await userRepository.getUserByEmail(credentials.email);

  if (!user || !BCRYPT_HASH_PATTERN.test(user.password)) {
    throw invalidCredentials();
  }

  const passwordMatches = await bcrypt.compare(
    credentials.password,
    user.password,
  );

  if (!passwordMatches) {
    throw invalidCredentials();
  }

  const safeUser = toSafeUser(user);
  const token = jwt.sign(
    {
      role: safeUser.role,
      email: safeUser.email,
    },
    getJwtSecret(),
    {
      subject: String(safeUser.id),
      expiresIn: '2h',
    },
  );

  return { token, user: safeUser };
};

export { BCRYPT_ROUNDS, createAccount, login, register };
