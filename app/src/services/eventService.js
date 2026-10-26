import handleResponse from './handleResponse.js';
import { getAuthorizationHeaders } from './authService.js';

const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Error('VITE_API_URL is not configured');
  }

  return `${apiUrl}/events`;
};

const getEvents = async (filters = {}) => {
  const parameters = new URLSearchParams();

  Object.entries(filters).forEach(([name, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      parameters.set(name, value);
    }
  });

  const query = parameters.toString();
  const response = await fetch(`${getApiUrl()}${query ? `?${query}` : ''}`);
  const data = await handleResponse(response);

  if (!Array.isArray(data)) {
    throw new Error('The events response must be an array');
  }

  return data;
};

const getMyEvents = async () => {
  const response = await fetch(`${getApiUrl()}/mine`, {
    headers: getAuthorizationHeaders(),
  });
  const data = await handleResponse(response);

  if (!Array.isArray(data)) {
    throw new Error('The organizer events response must be an array');
  }

  return data;
};

const getEventById = async (id) => {
  const response = await fetch(`${getApiUrl()}/${id}`, {
    headers: getAuthorizationHeaders(),
  });
  return handleResponse(response);
};

const createEvent = async (event) => {
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  return handleResponse(response);
};

const updateEvent = async (id, event) => {
  const response = await fetch(`${getApiUrl()}/${id}`, {
    method: 'PUT',
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  return handleResponse(response);
};

const deleteEvent = async (id) => {
  const response = await fetch(`${getApiUrl()}/${id}`, {
    method: 'DELETE',
    headers: getAuthorizationHeaders(),
  });

  return handleResponse(response);
};

export {
  createEvent,
  deleteEvent,
  getEventById,
  getEvents,
  getMyEvents,
  updateEvent,
};
