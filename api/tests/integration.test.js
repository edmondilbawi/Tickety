import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import './setup/testEnvironment.js';
import {
  getMailTransporter,
  setMailTransporterForTests,
} from '../src/config/mail.js';
import {
  resolveMailDelivery,
  sendSmtpTest,
} from '../src/services/email.service.js';
import {
  createEvent,
  createTicketType,
  login,
  register,
  request,
  setApiUrl,
} from './helpers/apiClient.js';

const testPassword = process.env.TEST_USER_PASSWORD;

const credentials = {
  customerA: {
    firstName: 'Test',
    lastName: 'Customer A',
    email: 'customer.a@test.tickety.local',
    password: testPassword,
    role: 'customer',
  },
  customerB: {
    firstName: 'Test',
    lastName: 'Customer B',
    email: 'customer.b@test.tickety.local',
    password: testPassword,
    role: 'customer',
  },
  organizerA: {
    firstName: 'Test',
    lastName: 'Organizer A',
    email: 'organizer.a@test.tickety.local',
    password: testPassword,
    role: 'organizer',
  },
  organizerB: {
    firstName: 'Test',
    lastName: 'Organizer B',
    email: 'organizer.b@test.tickety.local',
    password: testPassword,
    role: 'organizer',
  },
  owner: {
    firstName: 'Test',
    lastName: 'Owner',
    email: 'owner@test.tickety.local',
    password: testPassword,
    role: 'customer',
  },
};

const state = {
  users: {},
  tokens: {},
  events: {},
  ticketTypes: {},
  bookings: {},
};

const failingMailTransporter = {
  sendMail: async () => {
    throw new Error('Simulated SMTP delivery failure');
  },
};

let server;
let pool;

const assertSafeUser = (user) => {
  assert.ok(user.id);
  assert.equal(Object.hasOwn(user, 'password'), false);
  assert.equal(Object.hasOwn(user, 'passwordHash'), false);
};

const closeServer = () => new Promise((resolve, reject) => {
  if (!server) {
    resolve();
    return;
  }

  server.close((error) => {
    if (error) {
      reject(error);
      return;
    }

    resolve();
  });
});

before(async () => {
  const [{ default: app }, { default: databasePool }] = await Promise.all([
    import('../src/app.js'),
    import('../src/config/database.js'),
  ]);

  pool = databasePool;
  server = await new Promise((resolve) => {
    const listeningServer = app.listen(0, '127.0.0.1', () => {
      resolve(listeningServer);
    });
  });

  const address = server.address();
  setApiUrl(`http://127.0.0.1:${address.port}/api`);
});

after(async () => {
  setMailTransporterForTests(null);
  await closeServer();
  await pool.end();
});

test('[System] health endpoint responds with JSON', async () => {
  const response = await request('/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('[Email] test environment never creates an external SMTP transport', () => {
  const originalEnabled = process.env.SMTP_ENABLED;

  try {
    process.env.SMTP_ENABLED = 'true';
    setMailTransporterForTests(null);
    assert.equal(getMailTransporter(), null);
  } finally {
    if (originalEnabled === undefined) {
      delete process.env.SMTP_ENABLED;
    } else {
      process.env.SMTP_ENABLED = originalEnabled;
    }
  }
});

test('[Email] unset recipient override delivers to the logical recipient', async () => {
  const messages = [];
  const logicalRecipient = 'logical.organizer@test.tickety.local';
  setMailTransporterForTests({
    sendMail: async (message) => {
      messages.push(message);
      return { messageId: 'test-logical-recipient' };
    },
  });

  try {
    process.env.SMTP_TEST_RECIPIENT = '';
    const result = await sendSmtpTest(logicalRecipient);

    assert.equal(result.sent, true);
    assert.equal(result.overridden, false);
    assert.equal(messages[0].to, logicalRecipient);
    assert.equal(messages[0].subject, 'Tickety SMTP Test');
    assert.equal(messages[0].headers, undefined);
  } finally {
    setMailTransporterForTests(null);
  }
});

test('[Email] non-production override redirects and preserves metadata', async () => {
  const messages = [];
  const logicalRecipient = 'logical.organizer@test.tickety.local';
  const testRecipient = 'delivery.inbox@example.com';
  setMailTransporterForTests({
    sendMail: async (message) => {
      messages.push(message);
      return { messageId: 'test-override-recipient' };
    },
  });

  try {
    process.env.SMTP_TEST_RECIPIENT = `  ${testRecipient}  `;
    const result = await sendSmtpTest(logicalRecipient);

    assert.equal(result.sent, true);
    assert.equal(result.logicalRecipient, logicalRecipient);
    assert.equal(result.deliveryRecipient, testRecipient);
    assert.equal(result.overridden, true);
    assert.equal(messages[0].to, testRecipient);
    assert.match(messages[0].subject, /^\[DEV → logical\.organizer@/);
    assert.equal(
      messages[0].headers['X-Tickety-Original-Recipient'],
      logicalRecipient,
    );
  } finally {
    process.env.SMTP_TEST_RECIPIENT = '';
    setMailTransporterForTests(null);
  }
});

test('[Email] production ignores the recipient override', () => {
  const originalNodeEnvironment = process.env.NODE_ENV;
  const logicalRecipient = 'logical.organizer@test.tickety.local';

  try {
    process.env.NODE_ENV = 'production';
    process.env.SMTP_TEST_RECIPIENT = 'delivery.inbox@example.com';
    const delivery = resolveMailDelivery(logicalRecipient);

    assert.equal(delivery.logicalRecipient, logicalRecipient);
    assert.equal(delivery.deliveryRecipient, logicalRecipient);
    assert.equal(delivery.overridden, false);
  } finally {
    process.env.NODE_ENV = originalNodeEnvironment;
    process.env.SMTP_TEST_RECIPIENT = '';
  }
});

test('[Auth] runtime configuration requires JWT_SECRET', async () => {
  const { validateRuntimeConfig } = await import('../src/config/environment.js');
  const originalSecret = process.env.JWT_SECRET;

  try {
    delete process.env.JWT_SECRET;
    assert.throws(validateRuntimeConfig, /JWT_SECRET is required/);
  } finally {
    process.env.JWT_SECRET = originalSecret;
  }

  assert.doesNotThrow(validateRuntimeConfig);
});

test('[Auth] registers a valid customer without exposing a password', async () => {
  const response = await register(credentials.customerA);

  assert.equal(response.status, 201);
  assert.equal(response.body.role, 'customer');
  assertSafeUser(response.body);
  state.users.customerA = response.body;
});

test('[Auth] public role=organizer is ignored and creates a Customer', async () => {
  const response = await register({
    ...credentials.organizerA,
    email: 'spoof.organizer@test.tickety.local',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.role, 'customer');
  assertSafeUser(response.body);
});

test('[Auth] public role=owner is ignored and creates a Customer', async () => {
  const response = await register({
    ...credentials.owner,
    email: 'spoof.owner@test.tickety.local',
    role: 'owner',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.role, 'customer');
  assertSafeUser(response.body);
});

test('[Auth] registers secondary Customers and bootstraps the test Owner', async () => {
  const customerResponse = await register(credentials.customerB);
  const ownerResponse = await register(credentials.owner);

  assert.equal(customerResponse.status, 201);
  assert.equal(ownerResponse.status, 201);
  state.users.customerB = customerResponse.body;
  const passwordBefore = await pool.query(
    'SELECT password FROM public.users WHERE id = $1',
    [ownerResponse.body.id],
  );
  const { promoteOwnerByEmail } = await import('../scripts/promoteOwner.js');
  const owner = await promoteOwnerByEmail(ownerResponse.body.email);
  const passwordAfter = await pool.query(
    'SELECT password FROM public.users WHERE id = $1',
    [ownerResponse.body.id],
  );

  assert.equal(owner.role, 'owner');
  assert.equal(passwordAfter.rows[0].password, passwordBefore.rows[0].password);
  state.users.owner = owner;
});

test('[Auth] rejects a duplicate email with 409', async () => {
  const response = await register(credentials.customerA);

  assert.equal(response.status, 409);
});

test('[Auth] rejects an invalid email with 400', async () => {
  const response = await register({
    ...credentials.customerA,
    email: 'not-an-email',
  });

  assert.equal(response.status, 400);
  assert.ok(response.body.errors.includes('Email must be valid'));
});

test('[Auth] rejects blank names with 400', async () => {
  const response = await register({
    ...credentials.customerA,
    email: 'blank.names@test.tickety.local',
    firstName: ' ',
    lastName: '',
  });

  assert.equal(response.status, 400);
  assert.ok(response.body.errors.includes('First name is required'));
  assert.ok(response.body.errors.includes('Last name is required'));
});

test('[Auth] ignores any client-supplied public role', async () => {
  const response = await register({
    ...credentials.customerA,
    email: 'invalid.role@test.tickety.local',
    role: 'admin',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.role, 'customer');
});

test('[Auth] rejects a short password with 400', async () => {
  const response = await register({
    ...credentials.customerA,
    email: 'short.password@test.tickety.local',
    password: 'short',
  });

  assert.equal(response.status, 400);
});

test('[Auth] logs in with valid credentials and returns safe data', async () => {
  const response = await login(
    credentials.customerA.email,
    credentials.customerA.password,
  );

  assert.equal(response.status, 200);
  assert.ok(response.body.token);
  assertSafeUser(response.body.user);
  state.tokens.customerA = response.body.token;
});

let invalidCredentialMessage;

test('[Auth] rejects a wrong password with a generic 401', async () => {
  const response = await login(credentials.customerA.email, 'WrongPass123!');

  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Invalid email or password');
  invalidCredentialMessage = response.body.message;
});

test('[Auth] rejects an unknown email with the same generic 401', async () => {
  const response = await login(
    'unknown@test.tickety.local',
    credentials.customerA.password,
  );

  assert.equal(response.status, 401);
  assert.equal(response.body.message, invalidCredentialMessage);
});

test('[Auth] logs in the secondary Customer and Owner', async () => {
  for (const name of ['customerB', 'owner']) {
    const account = credentials[name];
    const response = await login(account.email, account.password);

    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, name === 'owner' ? 'owner' : 'customer');
    state.tokens[name] = response.body.token;
  }
});

test('[Owner] anonymous cannot create an Organizer', async () => {
  const response = await request('/owner/organizers', {
    method: 'POST',
    body: credentials.organizerA,
  });

  assert.equal(response.status, 401);
});

test('[Owner] Customer cannot create an Organizer', async () => {
  const response = await request('/owner/organizers', {
    method: 'POST',
    token: state.tokens.customerA,
    body: credentials.organizerA,
  });

  assert.equal(response.status, 403);
});

test('[Owner] creates Organizer accounts with safe responses', async () => {
  const capturedMessages = [];

  for (const name of ['organizerA', 'organizerB']) {
    setMailTransporterForTests(name === 'organizerA'
      ? {
        sendMail: async (message) => {
          capturedMessages.push(message);
          return { messageId: 'test-organizer-welcome' };
        },
      }
      : failingMailTransporter);

    let response;

    try {
      response = await request('/owner/organizers', {
        method: 'POST',
        token: state.tokens.owner,
        body: { ...credentials[name], role: 'owner' },
      });
    } finally {
      setMailTransporterForTests(null);
    }

    assert.equal(response.status, 201);
    assert.equal(response.body.role, 'organizer');
    assertSafeUser(response.body);
    state.users[name] = response.body;
  }

  assert.equal(capturedMessages.length, 1);
  assert.equal(capturedMessages[0].subject, 'Welcome to Tickety Organizer');
  assert.equal(capturedMessages[0].to, credentials.organizerA.email);
  assert.equal(JSON.stringify(capturedMessages[0]).includes(testPassword), false);
  assert.equal(JSON.stringify(capturedMessages[0]).includes('$2b$'), false);
});

test('[Owner] duplicate Organizer email returns 409', async () => {
  const response = await request('/owner/organizers', {
    method: 'POST',
    token: state.tokens.owner,
    body: credentials.organizerA,
  });

  assert.equal(response.status, 409);
});

test('[Auth] logs in both Owner-created Organizers', async () => {
  for (const name of ['organizerA', 'organizerB']) {
    const account = credentials[name];
    const response = await login(account.email, account.password);

    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, 'organizer');
    state.tokens[name] = response.body.token;
  }
});

test('[Owner] Organizer cannot create another Organizer', async () => {
  const response = await request('/owner/organizers', {
    method: 'POST',
    token: state.tokens.organizerA,
    body: {
      ...credentials.organizerA,
      email: 'forbidden.organizer@test.tickety.local',
    },
  });

  assert.equal(response.status, 403);
});

test('[Owner] list returns only Organizers with real Event counts', async () => {
  const response = await request('/owner/organizers', {
    token: state.tokens.owner,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.length, 2);
  assert.ok(response.body.every((organizer) => organizer.eventCount === 0));
  response.body.forEach(assertSafeUser);
});

test('[Auth] rejects /auth/me without a token', async () => {
  const response = await request('/auth/me');

  assert.equal(response.status, 401);
});

test('[Auth] rejects /auth/me with an invalid token', async () => {
  const response = await request('/auth/me', { token: 'not-a-valid-jwt' });

  assert.equal(response.status, 401);
});

test('[Auth] returns the authenticated safe user from /auth/me', async () => {
  const response = await request('/auth/me', {
    token: state.tokens.customerA,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.id, state.users.customerA.id);
  assertSafeUser(response.body);
});

test('[Auth] returns the current Owner from /auth/me', async () => {
  const response = await request('/auth/me', {
    token: state.tokens.owner,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.id, state.users.owner.id);
  assert.equal(response.body.role, 'owner');
  assertSafeUser(response.body);
});

test('[Auth] local password reset preserves Owner role and bcrypt login', async () => {
  const { resetUserPassword } = await import('../scripts/resetUserPassword.js');
  const resetPassword = `${testPassword}-reset`;
  const user = await resetUserPassword(credentials.owner.email, resetPassword);
  const response = await login(credentials.owner.email, resetPassword);

  assert.equal(user.role, 'owner');
  assert.equal(response.status, 200);
  assert.equal(response.body.user.role, 'owner');
  assertSafeUser(response.body.user);
});

test('[Events] rejects Event creation by a customer with 403', async () => {
  const response = await createEvent(state.tokens.customerA, {
    title: 'Forbidden Event',
    description: null,
    location: 'Beirut',
      category: 'other',
    eventDate: '2030-01-01T18:00:00.000Z',
    status: 'active',
  });

  assert.equal(response.status, 403);
});

test('[Events] organizer creates an Event and spoofed organizerId is ignored', async () => {
  const response = await createEvent(state.tokens.organizerA, {
    organizerId: state.users.organizerB.id,
    approvalStatus: 'approved',
    approvedBy: state.users.owner.id,
    rejectionReason: 'spoofed',
    title: 'Automated Launch Concert',
    description: 'Music integration test event',
    location: 'Beirut Hall',
      category: 'other',
    eventDate: '2030-06-15T18:00:00.000Z',
    status: 'active',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.organizerId, state.users.organizerA.id);
  assert.equal(response.body.approvalStatus, 'pending');
  assert.equal(response.body.approvedBy, null);
  assert.equal(response.body.rejectionReason, null);
  state.events.main = response.body;
});

test('[Events] creates supporting owned, inactive, and cross-owner Events', async () => {
  const definitions = [
    ['filterDraft', state.tokens.organizerA, {
      title: 'Technology Workshop',
      description: 'A workshop for filter testing',
      location: 'Tripoli Campus',
      category: 'other',
      eventDate: '2030-07-20T10:00:00.000Z',
      status: 'draft',
    }],
    ['deletable', state.tokens.organizerA, {
      title: 'Disposable Event',
      description: null,
      location: 'Zahle',
      category: 'other',
      eventDate: '2030-08-10T12:00:00.000Z',
      status: 'active',
    }],
    ['inactive', state.tokens.organizerA, {
      title: 'Inactive Booking Event',
      description: null,
      location: 'Saida',
      category: 'other',
      eventDate: '2030-09-10T12:00:00.000Z',
      status: 'draft',
    }],
    ['otherOwner', state.tokens.organizerB, {
      title: 'Other Organizer Event',
      description: 'Owned by organizer B',
      location: 'Byblos',
      category: 'other',
      eventDate: '2031-01-15T12:00:00.000Z',
      status: 'active',
    }],
  ];

  for (const [name, token, event] of definitions) {
    const response = await createEvent(token, event);
    assert.equal(response.status, 201);
    state.events[name] = response.body;
  }
});

test('[Events] pending Events are absent from the public list', async () => {
  const response = await request('/events');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, []);
});

test('[Events] pending Event public details are hidden with 404', async () => {
  const response = await request(`/events/${state.events.main.id}`);

  assert.equal(response.status, 404);
});

test('[Owner] sees pending Events with Organizer and Ticket details', async () => {
  const response = await request('/owner/events', {
    token: state.tokens.owner,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.length, 5);
  assert.ok(response.body.every((event) => event.approvalStatus === 'pending'));
  assert.equal(response.body[0].organizerEmail.includes('@'), true);
  assert.ok(Array.isArray(response.body[0].ticketTypes));
});

test('[Owner] Customer and Organizer cannot approve or reject Events', async () => {
  const attempts = [
    request(`/owner/events/${state.events.main.id}/approve`, {
      method: 'POST',
      token: state.tokens.customerA,
    }),
    request(`/owner/events/${state.events.main.id}/approve`, {
      method: 'POST',
      token: state.tokens.organizerA,
    }),
    request(`/owner/events/${state.events.main.id}/reject`, {
      method: 'POST',
      token: state.tokens.customerA,
      body: { reason: 'No' },
    }),
    request(`/owner/events/${state.events.main.id}/reject`, {
      method: 'POST',
      token: state.tokens.organizerA,
      body: { reason: 'No' },
    }),
  ];
  const responses = await Promise.all(attempts);

  assert.deepEqual(responses.map((response) => response.status), [403, 403, 403, 403]);
});

test('[Owner] approves an active Event and makes it public', async () => {
  setMailTransporterForTests(failingMailTransporter);
  let approval;

  try {
    approval = await request(`/owner/events/${state.events.main.id}/approve`, {
      method: 'POST',
      token: state.tokens.owner,
    });
  } finally {
    setMailTransporterForTests(null);
  }

  const list = await request('/events');
  const details = await request(`/events/${state.events.main.id}`);

  assert.equal(approval.status, 200);
  assert.equal(approval.body.approvalStatus, 'approved');
  assert.equal(approval.body.approvedBy, state.users.owner.id);
  assert.ok(approval.body.approvedAt);
  assert.deepEqual(list.body.map((event) => event.id), [state.events.main.id]);
  assert.equal(details.status, 200);
  assert.equal(details.body.title, state.events.main.title);
});

test('[Events] search filter is case-insensitive', async () => {
  const response = await request('/events?search=LAUNCH');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.map((event) => event.id), [state.events.main.id]);
});

test('[Events] location filter matches partial text', async () => {
  const response = await request('/events?location=tripoli');

  assert.equal(response.status, 200);
  assert.deepEqual(
    response.body.map((event) => event.id),
    [],
  );
});

test('[Events] public status filter cannot expose draft Events', async () => {
  const response = await request('/events?status=draft');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.map((event) => event.id), [state.events.main.id]);
  assert.ok(response.body.every((event) => event.status === 'active'));
});

test('[Events] inclusive from/to filters select the expected date', async () => {
  const response = await request(
    '/events?from=2030-06-15&to=2030-06-15',
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.map((event) => event.id), [state.events.main.id]);
});

test('[Events] combined filters return the matching Event', async () => {
  const response = await request(
    '/events?search=music&location=beirut&status=active&from=2030-06-01&to=2030-06-30',
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.map((event) => event.id), [state.events.main.id]);
});

test('[Events] invalid calendar dates return 400', async () => {
  const response = await request('/events?from=2030-02-30');

  assert.equal(response.status, 400);
});

test('[Events] reversed date range returns 400', async () => {
  const response = await request('/events?from=2030-07-01&to=2030-06-01');

  assert.equal(response.status, 400);
});

test('[Events] invalid status filter returns 400', async () => {
  const response = await request('/events?status=published');

  assert.equal(response.status, 400);
});

test('[Events] /events/mine requires authentication', async () => {
  const response = await request('/events/mine');

  assert.equal(response.status, 401);
});

test('[Events] /events/mine rejects a customer', async () => {
  const response = await request('/events/mine', {
    token: state.tokens.customerA,
  });

  assert.equal(response.status, 403);
});

test('[Events] /events/mine returns only the organizer own Events', async () => {
  const response = await request('/events/mine', {
    token: state.tokens.organizerA,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.length, 4);
  assert.ok(
    response.body.every(
      (event) => event.organizerId === state.users.organizerA.id,
    ),
  );
});

test('[Owner] rejects an Event and its Organizer sees the reason', async () => {
  setMailTransporterForTests(failingMailTransporter);
  let rejection;

  try {
    rejection = await request(
      `/owner/events/${state.events.filterDraft.id}/reject`,
      {
        method: 'POST',
        token: state.tokens.owner,
        body: { reason: 'Please provide a clearer workshop description.' },
      },
    );
  } finally {
    setMailTransporterForTests(null);
  }

  const publicDetails = await request(`/events/${state.events.filterDraft.id}`);
  const organizerDetails = await request(
    `/events/${state.events.filterDraft.id}`,
    { token: state.tokens.organizerA },
  );

  assert.equal(rejection.status, 200);
  assert.equal(rejection.body.approvalStatus, 'rejected');
  assert.equal(publicDetails.status, 404);
  assert.equal(organizerDetails.status, 200);
  assert.equal(
    organizerDetails.body.rejectionReason,
    'Please provide a clearer workshop description.',
  );
});

test('[Owner] rejects blank rejection reasons with 400', async () => {
  const response = await request(
    `/owner/events/${state.events.inactive.id}/reject`,
    {
      method: 'POST',
      token: state.tokens.owner,
      body: { reason: '   ' },
    },
  );

  assert.equal(response.status, 400);
});

test('[Events] non-owner cannot update an Event', async () => {
  const response = await request(`/events/${state.events.main.id}`, {
    method: 'PUT',
    token: state.tokens.organizerB,
    body: {
      title: 'Unauthorized Update',
      description: null,
      location: 'Nowhere',
      category: 'other',
      eventDate: '2030-06-15T18:00:00.000Z',
      status: 'active',
    },
  });

  assert.equal(response.status, 403);
});

test('[Events] non-owner cannot delete an Event', async () => {
  const response = await request(`/events/${state.events.main.id}`, {
    method: 'DELETE',
    token: state.tokens.organizerB,
  });

  assert.equal(response.status, 403);
});

test('[Events] owner can update an Event', async () => {
  const response = await request(`/events/${state.events.filterDraft.id}`, {
    method: 'PUT',
    token: state.tokens.organizerA,
    body: {
      title: 'Technology Workshop Updated',
      description: 'Updated by its owner',
      location: 'Tripoli Campus',
      category: 'other',
      eventDate: '2030-07-20T10:00:00.000Z',
      status: 'active',
      organizerId: state.users.organizerB.id,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.organizerId, state.users.organizerA.id);
  assert.equal(response.body.status, 'active');
  assert.equal(response.body.approvalStatus, 'pending');
  assert.equal(response.body.rejectionReason, null);
});

test('[Events] editing an approved Event resets approval to pending', async () => {
  const approval = await request(
    `/owner/events/${state.events.otherOwner.id}/approve`,
    { method: 'POST', token: state.tokens.owner },
  );
  assert.equal(approval.status, 200);

  const update = await request(`/events/${state.events.otherOwner.id}`, {
    method: 'PUT',
    token: state.tokens.organizerB,
    body: {
      title: 'Other Organizer Event Updated',
      description: 'A meaningful Organizer update',
      location: 'Byblos',
      category: 'other',
      eventDate: '2031-01-15T12:00:00.000Z',
      status: 'active',
      approvalStatus: 'approved',
    },
  });
  const publicDetails = await request(`/events/${state.events.otherOwner.id}`);

  assert.equal(update.status, 200);
  assert.equal(update.body.approvalStatus, 'pending');
  assert.equal(update.body.approvedBy, null);
  assert.equal(publicDetails.status, 404);
  state.events.otherOwner = update.body;
});

test('[Events] missing Event returns 404', async () => {
  const response = await request('/events/999999');

  assert.equal(response.status, 404);
});

test('[Events] owner can delete an Event', async () => {
  const response = await request(`/events/${state.events.deletable.id}`, {
    method: 'DELETE',
    token: state.tokens.organizerA,
  });
  const missing = await request(`/events/${state.events.deletable.id}`);

  assert.equal(response.status, 204);
  assert.equal(missing.status, 404);
});

test('[Ticket Types] customer cannot create a Ticket Type', async () => {
  const response = await createTicketType(state.tokens.customerA, {
    eventId: state.events.main.id,
    name: 'Forbidden',
    price: 1,
    quantity: 1,
  });

  assert.equal(response.status, 403);
});

test('[Ticket Types] Event owner creates valid Ticket Types', async () => {
  const general = await createTicketType(state.tokens.organizerA, {
    eventId: state.events.main.id,
    name: 'General',
    price: 25,
    quantity: 10,
  });
  const vip = await createTicketType(state.tokens.organizerA, {
    eventId: state.events.main.id,
    name: 'VIP',
    price: 50,
    quantity: 10,
  });

  assert.equal(general.status, 201);
  assert.equal(vip.status, 201);
  state.ticketTypes.general = general.body;
  state.ticketTypes.vip = vip.body;

  const publicEvent = await request(`/events/${state.events.main.id}`);
  const publicTicket = await request(`/ticket-types/${general.body.id}`);
  const publicInventory = await request(
    `/events/${state.events.main.id}/ticket-types`,
  );

  assert.equal(publicEvent.status, 404);
  assert.equal(publicTicket.status, 404);
  assert.equal(publicInventory.status, 404);
});

test('[Ticket Types] creates inactive and other-owner test inventory', async () => {
  const inactive = await createTicketType(state.tokens.organizerA, {
    eventId: state.events.inactive.id,
    name: 'Inactive General',
    price: 12,
    quantity: 5,
  });
  const otherOwner = await createTicketType(state.tokens.organizerB, {
    eventId: state.events.otherOwner.id,
    name: 'Other General',
    price: 20,
    quantity: 5,
  });
  const pending = await createTicketType(state.tokens.organizerA, {
    eventId: state.events.filterDraft.id,
    name: 'Pending General',
    price: 15,
    quantity: 5,
  });

  assert.equal(inactive.status, 201);
  assert.equal(otherOwner.status, 201);
  assert.equal(pending.status, 201);
  state.ticketTypes.inactive = inactive.body;
  state.ticketTypes.otherOwner = otherOwner.body;
  state.ticketTypes.pending = pending.body;
});

test('[Owner] approves the main Event after Ticket Type creation', async () => {
  const response = await request(`/owner/events/${state.events.main.id}/approve`, {
    method: 'POST',
    token: state.tokens.owner,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.approvalStatus, 'approved');
});

test('[Ticket Types] public listing returns Ticket Types', async () => {
  const response = await request('/ticket-types');

  assert.equal(response.status, 200);
  assert.equal(response.body.length, 2);
});

test('[Ticket Types] public details return one Ticket Type', async () => {
  const response = await request(`/ticket-types/${state.ticketTypes.general.id}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.name, 'General');
});

test('[Ticket Types] public Event inventory route is Event-scoped', async () => {
  const response = await request(
    `/events/${state.events.main.id}/ticket-types`,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(
    response.body.map((ticketType) => ticketType.name),
    ['General', 'VIP'],
  );
});

test('[Ticket Types] hidden Event inventory cannot leak publicly', async () => {
  const list = await request(
    `/events/${state.events.inactive.id}/ticket-types`,
  );
  const details = await request(
    `/ticket-types/${state.ticketTypes.inactive.id}`,
  );
  const organizerList = await request(
    `/events/${state.events.inactive.id}/ticket-types`,
    { token: state.tokens.organizerA },
  );

  assert.equal(list.status, 404);
  assert.equal(details.status, 404);
  assert.equal(organizerList.status, 200);
});

test('[Ticket Types] invalid Event relationship returns 400', async () => {
  const response = await createTicketType(state.tokens.organizerA, {
    eventId: 999999,
    name: 'Missing Event',
    price: 10,
    quantity: 2,
  });

  assert.equal(response.status, 400);
});

test('[Ticket Types] out-of-range prices return 400', async () => {
  const negative = await createTicketType(state.tokens.organizerA, {
    eventId: state.events.main.id,
    name: 'Negative Price',
    price: -1,
    quantity: 2,
  });
  const tooLarge = await createTicketType(state.tokens.organizerA, {
    eventId: state.events.main.id,
    name: 'Oversized Price',
    price: 100000000,
    quantity: 2,
  });

  assert.equal(negative.status, 400);
  assert.equal(tooLarge.status, 400);
});

test('[Ticket Types] negative quantity returns 400', async () => {
  const response = await createTicketType(state.tokens.organizerA, {
    eventId: state.events.main.id,
    name: 'Negative Quantity',
    price: 1,
    quantity: -1,
  });

  assert.equal(response.status, 400);
});

test('[Ticket Types] blank name returns 400', async () => {
  const response = await createTicketType(state.tokens.organizerA, {
    eventId: state.events.main.id,
    name: ' ',
    price: 1,
    quantity: 1,
  });

  assert.equal(response.status, 400);
});

test('[Ticket Types] duplicate name for one Event returns 409', async () => {
  const response = await createTicketType(state.tokens.organizerA, {
    eventId: state.events.main.id,
    name: 'General',
    price: 30,
    quantity: 2,
  });

  assert.equal(response.status, 409);
});

test('[Ticket Types] other organizer cannot update a Ticket Type', async () => {
  const response = await request(
    `/ticket-types/${state.ticketTypes.general.id}`,
    {
      method: 'PUT',
      token: state.tokens.organizerB,
      body: {
        eventId: state.events.main.id,
        name: 'Stolen',
        price: 1,
        quantity: 1,
      },
    },
  );

  assert.equal(response.status, 403);
});

test('[Ticket Types] other organizer cannot delete a Ticket Type', async () => {
  const response = await request(
    `/ticket-types/${state.ticketTypes.general.id}`,
    {
      method: 'DELETE',
      token: state.tokens.organizerB,
    },
  );

  assert.equal(response.status, 403);
});

test('[Ticket Types] Event owner can update a Ticket Type', async () => {
  const response = await request(
    `/ticket-types/${state.ticketTypes.general.id}`,
    {
      method: 'PUT',
      token: state.tokens.organizerA,
      body: {
        eventId: state.events.main.id,
        name: 'General',
        price: 27.5,
        quantity: 10,
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.price, 27.5);
  state.ticketTypes.general = response.body;

  const publicEvent = await request(`/events/${state.events.main.id}`);
  assert.equal(publicEvent.status, 404);

  const approval = await request(`/owner/events/${state.events.main.id}/approve`, {
    method: 'POST',
    token: state.tokens.owner,
  });
  assert.equal(approval.status, 200);
});

test('[Ticket Types] Event owner can delete a Ticket Type', async () => {
  const created = await createTicketType(state.tokens.organizerA, {
    eventId: state.events.main.id,
    name: 'Disposable Ticket',
    price: 2,
    quantity: 1,
  });
  assert.equal(created.status, 201);

  const approvalBeforeDelete = await request(
    `/owner/events/${state.events.main.id}/approve`,
    { method: 'POST', token: state.tokens.owner },
  );
  assert.equal(approvalBeforeDelete.status, 200);

  const deleted = await request(`/ticket-types/${created.body.id}`, {
    method: 'DELETE',
    token: state.tokens.organizerA,
  });
  const missing = await request(`/ticket-types/${created.body.id}`);

  assert.equal(deleted.status, 204);
  assert.equal(missing.status, 404);

  const hiddenAfterDelete = await request(`/events/${state.events.main.id}`);
  assert.equal(hiddenAfterDelete.status, 404);

  const approvalAfterDelete = await request(
    `/owner/events/${state.events.main.id}/approve`,
    { method: 'POST', token: state.tokens.owner },
  );
  assert.equal(approvalAfterDelete.status, 200);
});

test('[Bookings] unauthenticated create returns 401', async () => {
  const response = await request('/bookings', {
    method: 'POST',
    body: {
      items: [{ ticketTypeId: state.ticketTypes.general.id, quantity: 1 }],
    },
  });

  assert.equal(response.status, 401);
});

test('[Bookings] organizer create returns 403', async () => {
  const response = await request('/bookings', {
    method: 'POST',
    token: state.tokens.organizerA,
    body: {
      items: [{ ticketTypeId: state.ticketTypes.general.id, quantity: 1 }],
    },
  });

  assert.equal(response.status, 403);
});

test('[Bookings] pending Event cannot be booked', async () => {
  const response = await request('/bookings', {
    method: 'POST',
    token: state.tokens.customerA,
    body: {
      items: [{ ticketTypeId: state.ticketTypes.pending.id, quantity: 1 }],
    },
  });

  assert.equal(response.status, 409);
});

test('[Bookings] rejected Event cannot be booked', async () => {
  const rejection = await request(
    `/owner/events/${state.events.filterDraft.id}/reject`,
    {
      method: 'POST',
      token: state.tokens.owner,
      body: { reason: 'Not ready for publication.' },
    },
  );
  assert.equal(rejection.status, 200);

  const response = await request('/bookings', {
    method: 'POST',
    token: state.tokens.customerA,
    body: {
      items: [{ ticketTypeId: state.ticketTypes.pending.id, quantity: 1 }],
    },
  });

  assert.equal(response.status, 409);
});

test('[Bookings] inactive Event Booking returns 409', async () => {
  const response = await request('/bookings', {
    method: 'POST',
    token: state.tokens.customerA,
    body: {
      items: [{ ticketTypeId: state.ticketTypes.inactive.id, quantity: 1 }],
    },
  });

  assert.equal(response.status, 409);
});

test('[Bookings] customer Booking uses authenticated ID and database price', async () => {
  assert.equal(getMailTransporter(), null);

  const response = await request('/bookings', {
    method: 'POST',
    token: state.tokens.customerA,
    body: {
      userId: state.users.customerB.id,
      items: [{
        ticketTypeId: state.ticketTypes.general.id,
        quantity: 2,
        price: 0.01,
      }],
    },
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.userId, state.users.customerA.id);
  assert.equal(response.body.items[0].price, 27.5);
  state.bookings.customerA = response.body;

  const stored = await pool.query(
    `SELECT b.user_id AS "userId",
            bi.price::float AS price,
            tt.quantity
     FROM public.bookings b
     JOIN public.booking_items bi ON bi.booking_id = b.id
     JOIN public.ticket_types tt ON tt.id = bi.ticket_type_id
     WHERE b.id = $1`,
    [response.body.id],
  );

  assert.equal(stored.rows[0].userId, state.users.customerA.id);
  assert.equal(stored.rows[0].price, 27.5);
  assert.equal(stored.rows[0].quantity, 8);
});

test('[Bookings] price edit preserves historical price and triggers reapproval', async () => {
  const update = await request(
    `/ticket-types/${state.ticketTypes.general.id}`,
    {
      method: 'PUT',
      token: state.tokens.organizerA,
      body: {
        eventId: state.events.main.id,
        name: 'General',
        price: 35,
        quantity: 8,
      },
    },
  );
  assert.equal(update.status, 200);
  state.ticketTypes.general = update.body;

  const hidden = await request(`/events/${state.events.main.id}`);
  const history = await request('/bookings/my', {
    token: state.tokens.customerA,
  });

  assert.equal(hidden.status, 404);
  assert.equal(history.status, 200);
  assert.equal(history.body[0].items[0].price, 27.5);

  const approval = await request(`/owner/events/${state.events.main.id}/approve`, {
    method: 'POST',
    token: state.tokens.owner,
  });
  assert.equal(approval.status, 200);
});

test('[Bookings] insufficient availability returns 409 without negative inventory', async () => {
  const response = await request('/bookings', {
    method: 'POST',
    token: state.tokens.customerA,
    body: {
      items: [{ ticketTypeId: state.ticketTypes.general.id, quantity: 999 }],
    },
  });
  const inventory = await pool.query(
    'SELECT quantity FROM public.ticket_types WHERE id = $1',
    [state.ticketTypes.general.id],
  );

  assert.equal(response.status, 409);
  assert.equal(inventory.rows[0].quantity, 8);
  assert.ok(inventory.rows[0].quantity >= 0);
});

test('[Bookings] invalid Ticket Type returns 404', async () => {
  const response = await request('/bookings', {
    method: 'POST',
    token: state.tokens.customerA,
    body: { items: [{ ticketTypeId: 999999, quantity: 1 }] },
  });

  assert.equal(response.status, 404);
});

test('[Bookings] mixed-Event Ticket Types return 400', async () => {
  const response = await request('/bookings', {
    method: 'POST',
    token: state.tokens.customerA,
    body: {
      items: [
        { ticketTypeId: state.ticketTypes.general.id, quantity: 1 },
        { ticketTypeId: state.ticketTypes.otherOwner.id, quantity: 1 },
      ],
    },
  });

  assert.equal(response.status, 400);
});

test('[Bookings] a second customer can create an independent Booking', async () => {
  setMailTransporterForTests(failingMailTransporter);
  let response;

  try {
    response = await request('/bookings', {
      method: 'POST',
      token: state.tokens.customerB,
      body: {
        items: [{ ticketTypeId: state.ticketTypes.vip.id, quantity: 1 }],
      },
    });
  } finally {
    setMailTransporterForTests(null);
  }

  assert.equal(response.status, 201);
  assert.equal(response.body.userId, state.users.customerB.id);
  state.bookings.customerB = response.body;
});

test('[Bookings] customer history returns only that customer Bookings', async () => {
  const customerA = await request('/bookings/my', {
    token: state.tokens.customerA,
  });
  const customerB = await request('/bookings/my', {
    token: state.tokens.customerB,
  });

  assert.equal(customerA.status, 200);
  assert.equal(customerB.status, 200);
  assert.deepEqual(
    customerA.body.map((booking) => booking.id),
    [state.bookings.customerA.id],
  );
  assert.deepEqual(
    customerB.body.map((booking) => booking.id),
    [state.bookings.customerB.id],
  );
});

test('[Bookings] customer cannot access another customer Booking', async () => {
  const response = await request(
    `/bookings/${state.bookings.customerB.id}`,
    { token: state.tokens.customerA },
  );

  assert.equal(response.status, 403);
});

test('[Bookings] organizer sees only Bookings for owned Events', async () => {
  const owner = await request('/bookings/organizer', {
    token: state.tokens.organizerA,
  });
  const other = await request('/bookings/organizer', {
    token: state.tokens.organizerB,
  });

  assert.equal(owner.status, 200);
  assert.deepEqual(
    new Set(owner.body.map((booking) => booking.id)),
    new Set([state.bookings.customerA.id, state.bookings.customerB.id]),
  );
  assert.equal(other.status, 200);
  assert.deepEqual(other.body, []);
});

test('[Bookings] other organizer cannot access an owned Event Booking', async () => {
  const owner = await request(`/bookings/${state.bookings.customerA.id}`, {
    token: state.tokens.organizerA,
  });
  const other = await request(`/bookings/${state.bookings.customerA.id}`, {
    token: state.tokens.organizerB,
  });

  assert.equal(owner.status, 200);
  assert.equal(other.status, 403);
});

test('[Bookings] existing histories remain visible after Event returns to pending', async () => {
  const update = await request(`/ticket-types/${state.ticketTypes.vip.id}`, {
    method: 'PUT',
    token: state.tokens.organizerA,
    body: {
      eventId: state.events.main.id,
      name: 'VIP',
      price: 55,
      quantity: 9,
    },
  });
  assert.equal(update.status, 200);
  state.ticketTypes.vip = update.body;

  const customerA = await request('/bookings/my', {
    token: state.tokens.customerA,
  });
  const customerB = await request('/bookings/my', {
    token: state.tokens.customerB,
  });

  assert.equal(customerA.status, 200);
  assert.equal(customerB.status, 200);
  assert.equal(customerA.body[0].event.id, state.events.main.id);
  assert.equal(customerB.body[0].event.id, state.events.main.id);
  assert.equal(customerB.body[0].items[0].price, 50);
});

test('[Bookings] customer cannot cancel another customer Booking', async () => {
  const response = await request(
    `/bookings/${state.bookings.customerB.id}/cancel`,
    {
      method: 'POST',
      token: state.tokens.customerA,
    },
  );

  assert.equal(response.status, 403);
});

test('[Bookings] owner cancellation restores inventory once', async () => {
  setMailTransporterForTests(failingMailTransporter);
  let response;

  try {
    response = await request(
      `/bookings/${state.bookings.customerA.id}/cancel`,
      {
        method: 'POST',
        token: state.tokens.customerA,
      },
    );
  } finally {
    setMailTransporterForTests(null);
  }

  const inventory = await pool.query(
    'SELECT quantity FROM public.ticket_types WHERE id = $1',
    [state.ticketTypes.general.id],
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'cancelled');
  assert.equal(inventory.rows[0].quantity, 10);
});

test('[Bookings] second cancellation conflicts and does not restore twice', async () => {
  const response = await request(
    `/bookings/${state.bookings.customerA.id}/cancel`,
    {
      method: 'POST',
      token: state.tokens.customerA,
    },
  );
  const inventory = await pool.query(
    'SELECT quantity FROM public.ticket_types WHERE id = $1',
    [state.ticketTypes.general.id],
  );

  assert.equal(response.status, 409);
  assert.equal(inventory.rows[0].quantity, 10);
});

test('[Interests] Customer adds and idempotently re-adds an approved Event', async () => {
  const approval = await request(`/owner/events/${state.events.main.id}/approve`, {
    method: 'POST',
    token: state.tokens.owner,
  });
  assert.equal(approval.status, 200);

  const first = await request(`/interests/${state.events.main.id}`, {
    method: 'POST',
    token: state.tokens.customerA,
  });
  const duplicate = await request(`/interests/${state.events.main.id}`, {
    method: 'POST',
    token: state.tokens.customerA,
  });
  const count = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM public.event_interests
     WHERE user_id = $1 AND event_id = $2`,
    [state.users.customerA.id, state.events.main.id],
  );

  assert.equal(first.status, 200);
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.body.id, first.body.id);
  assert.equal(count.rows[0].count, 1);
});

test('[Interests] Customer retrieves only their own visible interests', async () => {
  const secondCustomer = await request(`/interests/${state.events.main.id}`, {
    method: 'POST',
    token: state.tokens.customerB,
  });
  assert.equal(secondCustomer.status, 200);

  const customerA = await request('/interests/my', {
    token: state.tokens.customerA,
  });
  const customerB = await request('/interests/my', {
    token: state.tokens.customerB,
  });

  assert.deepEqual(customerA.body.map((event) => event.id), [state.events.main.id]);
  assert.deepEqual(customerB.body.map((event) => event.id), [state.events.main.id]);
  assert.notEqual(customerA.body[0].interestId, customerB.body[0].interestId);
});

test('[Interests] hidden Events cannot be added', async () => {
  const pending = await request(`/interests/${state.events.inactive.id}`, {
    method: 'POST',
    token: state.tokens.customerA,
  });
  const rejected = await request(`/interests/${state.events.filterDraft.id}`, {
    method: 'POST',
    token: state.tokens.customerA,
  });

  assert.equal(pending.status, 404);
  assert.equal(rejected.status, 404);
});

test('[Interests] endpoint is Customer-only', async () => {
  const anonymous = await request('/interests/my');
  const organizer = await request('/interests/my', {
    token: state.tokens.organizerA,
  });
  const owner = await request('/interests/my', {
    token: state.tokens.owner,
  });

  assert.deepEqual(
    [anonymous.status, organizer.status, owner.status],
    [401, 403, 403],
  );
});

test('[Interests] pending Events are omitted without deleting saved relationships', async () => {
  const update = await request(`/events/${state.events.main.id}`, {
    method: 'PUT',
    token: state.tokens.organizerA,
    body: {
      title: state.events.main.title,
      description: 'Edited after Customer interest',
      location: state.events.main.location,
      category: 'other',
      eventDate: state.events.main.eventDate,
      status: 'active',
    },
  });
  assert.equal(update.status, 200);
  assert.equal(update.body.approvalStatus, 'pending');

  const visible = await request('/interests/my', {
    token: state.tokens.customerA,
  });
  const stored = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM public.event_interests
     WHERE user_id = $1 AND event_id = $2`,
    [state.users.customerA.id, state.events.main.id],
  );

  assert.deepEqual(visible.body, []);
  assert.equal(stored.rows[0].count, 1);

  const approval = await request(`/owner/events/${state.events.main.id}/approve`, {
    method: 'POST',
    token: state.tokens.owner,
  });
  assert.equal(approval.status, 200);
});

test('[Interests] removal is idempotent and user-scoped', async () => {
  const first = await request(`/interests/${state.events.main.id}`, {
    method: 'DELETE',
    token: state.tokens.customerA,
  });
  const second = await request(`/interests/${state.events.main.id}`, {
    method: 'DELETE',
    token: state.tokens.customerA,
  });
  const customerA = await request('/interests/my', {
    token: state.tokens.customerA,
  });
  const customerB = await request('/interests/my', {
    token: state.tokens.customerB,
  });

  assert.equal(first.status, 204);
  assert.equal(second.status, 204);
  assert.deepEqual(customerA.body, []);
  assert.deepEqual(customerB.body.map((event) => event.id), [state.events.main.id]);
});

test('[Interests] Event deletion cascades related interests', async () => {
  const event = await createEvent(state.tokens.organizerA, {
    title: 'Interest Cascade Event',
    description: 'Disposable interest test Event',
    location: 'Beirut',
      category: 'other',
    eventDate: '2033-01-10T18:00:00.000Z',
    status: 'active',
  });
  assert.equal(event.status, 201);

  const approval = await request(`/owner/events/${event.body.id}/approve`, {
    method: 'POST',
    token: state.tokens.owner,
  });
  assert.equal(approval.status, 200);

  const interest = await request(`/interests/${event.body.id}`, {
    method: 'POST',
    token: state.tokens.customerA,
  });
  assert.equal(interest.status, 200);

  const deletion = await request(`/events/${event.body.id}`, {
    method: 'DELETE',
    token: state.tokens.organizerA,
  });
  const stored = await pool.query(
    'SELECT COUNT(*)::int AS count FROM public.event_interests WHERE event_id = $1',
    [event.body.id],
  );

  assert.equal(deletion.status, 204);
  assert.equal(stored.rows[0].count, 0);
});

test('[Concurrency] simultaneous requests cannot oversell three tickets', async () => {
  const event = await createEvent(state.tokens.organizerA, {
    title: 'Concurrency Event',
    description: 'Permanent transaction regression test',
    location: 'Beirut',
      category: 'other',
    eventDate: '2032-01-10T18:00:00.000Z',
    status: 'active',
  });
  assert.equal(event.status, 201);

  const ticketType = await createTicketType(state.tokens.organizerA, {
    eventId: event.body.id,
    name: 'Limited',
    price: 18,
    quantity: 3,
  });
  assert.equal(ticketType.status, 201);

  const approval = await request(`/owner/events/${event.body.id}/approve`, {
    method: 'POST',
    token: state.tokens.owner,
  });
  assert.equal(approval.status, 200);

  const bookingBody = {
    items: [{ ticketTypeId: ticketType.body.id, quantity: 2 }],
  };
  const [customerA, customerB] = await Promise.all([
    request('/bookings', {
      method: 'POST',
      token: state.tokens.customerA,
      body: bookingBody,
    }),
    request('/bookings', {
      method: 'POST',
      token: state.tokens.customerB,
      body: bookingBody,
    }),
  ]);

  assert.deepEqual(
    [customerA.status, customerB.status].sort((a, b) => a - b),
    [201, 409],
  );

  const result = await pool.query(
    `SELECT tt.quantity,
            COUNT(b.id) FILTER (WHERE b.status = 'confirmed')::int
              AS "confirmedBookings"
     FROM public.ticket_types tt
     LEFT JOIN public.booking_items bi ON bi.ticket_type_id = tt.id
     LEFT JOIN public.bookings b ON b.id = bi.booking_id
     WHERE tt.id = $1
     GROUP BY tt.id`,
    [ticketType.body.id],
  );

  assert.equal(result.rows[0].quantity, 1);
  assert.equal(result.rows[0].confirmedBookings, 1);

  const successful = customerA.status === 201 ? customerA : customerB;
  const successfulToken = customerA.status === 201
    ? state.tokens.customerA
    : state.tokens.customerB;
  const cancellation = await request(
    `/bookings/${successful.body.id}/cancel`,
    {
      method: 'POST',
      token: successfulToken,
    },
  );
  const restored = await pool.query(
    'SELECT quantity FROM public.ticket_types WHERE id = $1',
    [ticketType.body.id],
  );

  assert.equal(cancellation.status, 200);
  assert.equal(restored.rows[0].quantity, 3);
});

test('[Security] malformed JSON returns a safe 400', async () => {
  const response = await request('/auth/login', {
    method: 'POST',
    rawBody: '{"email":',
    headers: { 'Content-Type': 'application/json' },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    message: 'Request body must contain valid JSON',
  });
});

test('[Security] unknown API route returns a JSON 404', async () => {
  const response = await request('/does-not-exist');

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { message: 'Not found' });
});

test('[Security] unexpected database error returns only a generic 500', async () => {
  await pool.query('ALTER TABLE public.users RENAME TO users_test_unavailable');

  try {
    const response = await request('/auth/me', {
      token: state.tokens.customerA,
    });

    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message: 'Internal server error' });
  } finally {
    await pool.query(
      'ALTER TABLE public.users_test_unavailable RENAME TO users',
    );
  }
});
