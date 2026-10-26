import handleResponse from './handleResponse.js';
import {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from './tokenStorage.js';

const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Error('VITE_API_URL is not configured');
  }

  return `${apiUrl}/auth`;
};

const getAuthorizationHeaders = () => {
  const token = getAuthToken();

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
};

const register = async (user) => {
  const response = await fetch(`${getApiUrl()}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  });

  return handleResponse(response);
};

const login = async (credentials) => {
  const response = await fetch(`${getApiUrl()}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  return handleResponse(response);
};

const getCurrentUser = async () => {
  const response = await fetch(`${getApiUrl()}/me`, {
    headers: getAuthorizationHeaders(),
  });

  return handleResponse(response);
};

export {
  clearAuthToken,
  getAuthToken,
  getAuthorizationHeaders,
  getCurrentUser,
  login,
  register,
  setAuthToken,
};
