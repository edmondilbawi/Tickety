let apiUrl;

const setApiUrl = (url) => {
  apiUrl = url;
};

const request = async (
  pathname,
  {
    method = 'GET',
    token,
    body,
    rawBody,
    headers = {},
  } = {},
) => {
  if (!apiUrl) {
    throw new Error('Test API URL has not been configured');
  }

  const requestHeaders = { ...headers };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let requestBody;

  if (rawBody !== undefined) {
    requestBody = rawBody;
  } else if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(`${apiUrl}${pathname}`, {
    method,
    headers: requestHeaders,
    body: requestBody,
  });
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return {
    status: response.status,
    body: data,
    headers: response.headers,
  };
};

const register = (user) => request('/auth/register', {
  method: 'POST',
  body: user,
});

const login = (email, password) => request('/auth/login', {
  method: 'POST',
  body: { email, password },
});

const createEvent = (token, event) => request('/events', {
  method: 'POST',
  token,
  body: { category: 'other', ...event },
});

const createTicketType = (token, ticketType) => request('/ticket-types', {
  method: 'POST',
  token,
  body: ticketType,
});

export {
  createEvent,
  createTicketType,
  login,
  register,
  request,
  setApiUrl,
};
