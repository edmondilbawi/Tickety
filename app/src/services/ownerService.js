import { getAuthorizationHeaders } from './authService.js';
import handleResponse from './handleResponse.js';

const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Error('VITE_API_URL is not configured');
  }

  return `${apiUrl}/owner`;
};

const getOrganizers = async () => {
  const response = await fetch(`${getApiUrl()}/organizers`, {
    headers: getAuthorizationHeaders(),
  });
  return handleResponse(response);
};

const createOrganizer = async (organizer) => {
  const response = await fetch(`${getApiUrl()}/organizers`, {
    method: 'POST',
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(organizer),
  });
  return handleResponse(response);
};

const getOwnerEvents = async (approvalStatus = 'pending') => {
  const parameters = new URLSearchParams({ approvalStatus });
  const response = await fetch(`${getApiUrl()}/events?${parameters}`, {
    headers: getAuthorizationHeaders(),
  });
  return handleResponse(response);
};

const approveEvent = async (id) => {
  const response = await fetch(`${getApiUrl()}/events/${id}/approve`, {
    method: 'POST',
    headers: getAuthorizationHeaders(),
  });
  return handleResponse(response);
};

const rejectEvent = async (id, reason) => {
  const response = await fetch(`${getApiUrl()}/events/${id}/reject`, {
    method: 'POST',
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });
  return handleResponse(response);
};

export {
  approveEvent,
  createOrganizer,
  getOrganizers,
  getOwnerEvents,
  rejectEvent,
};
