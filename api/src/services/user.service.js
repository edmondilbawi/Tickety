import * as userRepository from '../repositories/user.repository.js';

const MAX_INTEGER = 2147483647;

const notFound = () => {
  const error = new Error('User not found');
  error.status = 404;
  return error;
};

const isValidId = (id) => {
  const number = Number(id);
  return Number.isInteger(number) && number > 0 && number <= MAX_INTEGER;
};

const getUserById = async (id) => {
  if (!isValidId(id)) {
    throw notFound();
  }

  const user = await userRepository.getUserById(id);

  if (!user) {
    throw notFound();
  }

  return user;
};

export { getUserById };
