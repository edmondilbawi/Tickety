import { getAuthorizationHeaders } from './authService.js';
import handleResponse from './handleResponse.js';

const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Error('VITE_API_URL is not configured');
  }

  return `${apiUrl}/bookings`;
};

const createBooking = async (items) => {
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      ...getAuthorizationHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items }),
  });

  return handleResponse(response);
};

const getMyBookings = async () => {
  const response = await fetch(`${getApiUrl()}/my`, {
    headers: getAuthorizationHeaders(),
  });
  const data = await handleResponse(response);

  if (!Array.isArray(data)) {
    throw new Error('The bookings response must be an array');
  }

  return data;
};

const getBookingById = async (id) => {
  const response = await fetch(`${getApiUrl()}/${id}`, {
    headers: getAuthorizationHeaders(),
  });

  return handleResponse(response);
};

const cancelBooking = async (id) => {
  const response = await fetch(`${getApiUrl()}/${id}/cancel`, {
    method: 'POST',
    headers: getAuthorizationHeaders(),
  });
  return handleResponse(response);
};

const getOrganizerBookings = async () => {
  const response = await fetch(`${getApiUrl()}/organizer`, {
    headers: getAuthorizationHeaders(),
  });
  const data = await handleResponse(response);

  if (!Array.isArray(data)) {
    throw new Error('The organizer bookings response must be an array');
  }

  return data;
};

export {
  cancelBooking,
  createBooking,
  getBookingById,
  getMyBookings,
  getOrganizerBookings,
};
