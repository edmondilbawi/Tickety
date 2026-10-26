const USER_ROLES = ['customer', 'organizer', 'owner'];
const MINIMUM_PASSWORD_LENGTH = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validatePassword = (password) => {
  const errors = [];

  if (typeof password !== 'string' || password.length < MINIMUM_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters`);
    return errors;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must include a lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must include an uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must include a number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must include a special character');
  }

  return errors;
};

const validateUser = (user = {}) => {
  const errors = [];
  const firstName =
    typeof user.firstName === 'string' ? user.firstName.trim() : '';
  const lastName =
    typeof user.lastName === 'string' ? user.lastName.trim() : '';
  const email = typeof user.email === 'string' ? user.email.trim() : '';
  const password = typeof user.password === 'string' ? user.password : '';
  const role = typeof user.role === 'string' ? user.role.trim() : '';

  if (!firstName) {
    errors.push('First name is required');
  }

  if (!lastName) {
    errors.push('Last name is required');
  }

  if (!email) {
    errors.push('Email is required');
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push('Email must be valid');
  }

  errors.push(...validatePassword(password));

  if (!USER_ROLES.includes(role)) {
    errors.push(`Role must be one of: ${USER_ROLES.join(', ')}`);
  }

  return errors;
};

const validateLogin = (credentials = {}) => {
  const errors = [];
  const email =
    typeof credentials.email === 'string' ? credentials.email.trim() : '';
  const password =
    typeof credentials.password === 'string' ? credentials.password : '';

  if (!email) {
    errors.push('Email is required');
  }

  if (!password) {
    errors.push('Password is required');
  }

  return errors;
};

export { validateLogin, validatePassword };
export default validateUser;
