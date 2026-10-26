import handleResponse from './handleResponse.js';
import { getAuthorizationHeaders } from './authService.js';

const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Error('VITE_API_URL is not configured');
  }

  return `${apiUrl}/ticket-types`;
};

const getTicketTypes = async () => {
  const response = await fetch(getApiUrl(), {
    headers: getAuthorizationHeaders(),
  });
  const data = await handleResponse(response);

  if (!Array.isArray(data)) {
    throw new Error('The ticket types response must be an array');
  }

  return data;
};

const getTicketTypeById = async (id) => {
  const response = await fetch(`${getApiUrl()}/${id}`, {
    headers: getAuthorizationHeaders(),
  });
  return handleResponse(response);
};

const getTicketTypesByEventId = async (eventId) => {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Error('VITE_API_URL is not configured');
  }

  const response = await fetch(`${apiUrl}/events/${eventId}/ticket-types`, {
    headers: getAuthorizationHeaders(),
  });
  const data = await handleResponse(response);

  if (!Array.isArray(data)) {
    throw new Error('The event ticket types response must be an array');
  }

  return data;
};

const createTicketType = async (ticketType) => {
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ticketType),
  });

  return handleResponse(response);
};

const updateTicketType = async (id, ticketType) => {
  const response = await fetch(`${getApiUrl()}/${id}`, {
    method: 'PUT',
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ticketType),
  });

  return handleResponse(response);
};

const deleteTicketType = async (id) => {
  const response = await fetch(`${getApiUrl()}/${id}`, {
    method: 'DELETE',
    headers: getAuthorizationHeaders(),
  });

  return handleResponse(response);
};

export {
  createTicketType,
  deleteTicketType,
  getTicketTypeById,
  getTicketTypes,
  getTicketTypesByEventId,
  updateTicketType,
};
