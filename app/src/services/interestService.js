import { getAuthorizationHeaders } from './authService.js';
import handleResponse from './handleResponse.js';

const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Error('VITE_API_URL is not configured');
  }

  return `${apiUrl}/interests`;
};

const getMyInterests = async () => {
  const response = await fetch(`${getApiUrl()}/my`, {
    headers: getAuthorizationHeaders(),
  });
  const data = await handleResponse(response);

  if (!Array.isArray(data)) {
    throw new Error('The interests response must be an array');
  }

  return data;
};

const addInterest = async (eventId) => {
  const response = await fetch(`${getApiUrl()}/${eventId}`, {
    method: 'POST',
    headers: getAuthorizationHeaders(),
  });
  return handleResponse(response);
};

const removeInterest = async (eventId) => {
  const response = await fetch(`${getApiUrl()}/${eventId}`, {
    method: 'DELETE',
    headers: getAuthorizationHeaders(),
  });
  return handleResponse(response);
};

export { addInterest, getMyInterests, removeInterest };
