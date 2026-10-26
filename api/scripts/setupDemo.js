import {
  assertNotProduction,
  getDemoAccounts,
  getLocalDemoApiUrl,
} from './demoEnvironment.js';

assertNotProduction();

if (process.env.DEMO_SETUP_CONFIRM !== 'CREATE_DEMO_DATA') {
  throw new Error(
    'Set DEMO_SETUP_CONFIRM=CREATE_DEMO_DATA in .env.demo to continue',
  );
}

const apiUrl = getLocalDemoApiUrl();
const accounts = getDemoAccounts();

const apiRequest = async (pathname, { method = 'GET', token, body } = {}) => {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${apiUrl}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  return { status: response.status, body: data };
};

const loginAccount = async (account) => {
  const login = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: account.email, password: account.password },
  });

  if (login.status !== 200) {
    throw new Error(
      `Demo login failed for ${account.email}; check .env.demo credentials`,
    );
  }

  return login.body;
};

const registerCustomerAndLogin = async (account) => {
  const registration = await apiRequest('/auth/register', {
    method: 'POST',
    body: account,
  });

  if (![201, 409].includes(registration.status)) {
    throw new Error(
      `Demo registration failed for ${account.email} (${registration.status})`,
    );
  }

  return loginAccount(account);
};

const ownerLogin = await loginAccount(accounts.owner);

if (ownerLogin.user.role !== 'owner') {
  throw new Error('DEMO_OWNER_EMAIL must belong to an Owner account');
}

const organizerCreation = await apiRequest('/owner/organizers', {
  method: 'POST',
  token: ownerLogin.token,
  body: accounts.organizer,
});

if (![201, 409].includes(organizerCreation.status)) {
  throw new Error(
    `Demo Organizer creation failed (${organizerCreation.status})`,
  );
}

const organizerLogin = await loginAccount(accounts.organizer);
await registerCustomerAndLogin(accounts.customer);

const eventTitle = process.env.DEMO_EVENT_TITLE?.trim()
  || '[DEMO] Tickety Showcase';
const ownedEvents = await apiRequest('/events/mine', {
  token: organizerLogin.token,
});

if (ownedEvents.status !== 200) {
  throw new Error(`Could not load demo organizer Events (${ownedEvents.status})`);
}

let demoEvent = ownedEvents.body.find((event) => event.title === eventTitle);

if (!demoEvent) {
  const defaultDate = new Date(Date.now() + (14 * 24 * 60 * 60 * 1000));
  const eventDate = process.env.DEMO_EVENT_DATE?.trim()
    || defaultDate.toISOString();
  const created = await apiRequest('/events', {
    method: 'POST',
    token: organizerLogin.token,
    body: {
      title: eventTitle,
      description: 'Development-only Event prepared for the classroom demo.',
      location: 'Beirut',
      eventDate,
      status: 'active',
    },
  });

  if (created.status !== 201) {
    throw new Error(`Could not create the demo Event (${created.status})`);
  }

  demoEvent = created.body;
}

const ticketTypes = await apiRequest(`/events/${demoEvent.id}/ticket-types`, {
  token: organizerLogin.token,
});

if (ticketTypes.status !== 200) {
  throw new Error(`Could not load demo Ticket Types (${ticketTypes.status})`);
}

const approval = await apiRequest(`/owner/events/${demoEvent.id}/approve`, {
  method: 'POST',
  token: ownerLogin.token,
});

if (approval.status !== 200) {
  throw new Error(`Could not approve the demo Event (${approval.status})`);
}

const desiredTicketTypes = [
  { name: 'General', price: 25, quantity: 25 },
  { name: 'VIP', price: 50, quantity: 10 },
];

for (const ticketType of desiredTicketTypes) {
  const exists = ticketTypes.body.some((existing) => (
    existing.name === ticketType.name
  ));

  if (!exists) {
    const created = await apiRequest('/ticket-types', {
      method: 'POST',
      token: organizerLogin.token,
      body: { ...ticketType, eventId: demoEvent.id },
    });

    if (created.status !== 201) {
      throw new Error(
        `Could not create demo Ticket Type ${ticketType.name} (${created.status})`,
      );
    }
  }
}

console.log('Demo data is ready.');
console.log(`Organizer: ${accounts.organizer.email}`);
console.log(`Customer: ${accounts.customer.email}`);
console.log(`Event: ${demoEvent.title} (ID ${demoEvent.id})`);
console.log('Passwords remain only in the ignored .env.demo file.');
