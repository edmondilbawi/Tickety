import { clearAuthToken } from './tokenStorage.js';

const handleUnauthorized = () => {
  clearAuthToken();

  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

async function handleResponse(response) {
  if (response.status === 401) {
    handleUnauthorized();
  }

  if (response.status === 204) {
    return null;
  }

  let data;

  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    throw new Error('The server did not return valid JSON');
  }

  if (!response.ok) {
    const validationMessage =
      Array.isArray(data?.errors) && data.errors.length > 0
        ? data.errors.join(', ')
        : null;
    const message =
      validationMessage
      || data?.message
      || data?.error
      || `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

export default handleResponse;
