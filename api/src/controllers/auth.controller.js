import * as authService from '../services/auth.service.js';
import * as userService from '../services/user.service.js';

const sendError = (response, error) => {
  const status = error.status || 500;

  if (Array.isArray(error.errors)) {
    return response.status(status).json({ errors: error.errors });
  }

  response.status(status).json({
    message: error.status ? error.message : 'Internal server error',
  });
};

const register = async (request, response) => {
  try {
    const user = await authService.register(request.body);
    response.status(201).json(user);
  } catch (error) {
    sendError(response, error);
  }
};

const login = async (request, response) => {
  try {
    const result = await authService.login(request.body);
    response.status(200).json(result);
  } catch (error) {
    sendError(response, error);
  }
};

const getCurrentUser = async (request, response) => {
  try {
    const user = await userService.getUserById(request.user.id);
    response.status(200).json(user);
  } catch (error) {
    sendError(response, error);
  }
};

export { getCurrentUser, login, register };
