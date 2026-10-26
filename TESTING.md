# Tickety Automated Testing

Tickety uses Node's built-in test runner, real HTTP requests, and a real
PostgreSQL test database. Database and application behavior is not mocked; the
external SMTP boundary uses an injected in-memory transport so tests stay
offline. The suite starts
the Express application on an available local port and exercises the same
routes, middleware, controllers, services, repositories, and SQL used by the
React application.

The current permanent suite contains 105 tests.

## Why `app.js` is import-safe

`api/src/app.js` exports the Express application and calls `app.listen()` only
when Node executes that file directly. Therefore `npm start` and `npm run dev`
still launch the normal API, while the test suite can import the same app and
listen on an automatically selected port without opening a second unwanted
socket. The route and middleware configuration is shared; there is no separate
test application.

## Why the test database is separate

The suite creates Users, Events, Ticket Types, Bookings, Booking Items, and
Event Interests. It
also resets the schema before and after a run so every run starts in a known
state. Those operations must never target the normal Tickety development
database.

Use a disposable database named `tickety_test`. The reset utility refuses to
run unless `NODE_ENV` is `test` and `DB_NAME` ends with `_test`. The test runner
sets `NODE_ENV=test` itself. These checks are intentionally duplicated in the
document and code because the schema reset uses `DROP SCHEMA public CASCADE`.

## Test environment

From `api`, copy the example:

```powershell
Copy-Item .env.test.example .env.test
```

On macOS or Linux:

```bash
cp .env.test.example .env.test
```

Fill in local PostgreSQL values in the ignored `.env.test` file:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_local_postgresql_user
DB_PASSWORD=your_local_postgresql_password
DB_NAME=tickety_test
DB_ADMIN_NAME=postgres
JWT_SECRET=use_a_test_only_secret
TEST_USER_PASSWORD=use_a_disposable_test_password
```

Do not reuse a real password or production JWT secret, and do not commit
`.env.test`. `DB_ADMIN_NAME` is
the maintenance database used only by the optional database-creation command.
`NODE_ENV=test` always prevents construction of an external SMTP transport,
even if a developer has SMTP enabled in the normal ignored `api/.env` file.

## Create and initialize `tickety_test`

If the configured PostgreSQL user may create databases:

```powershell
cd api
npm run test:create
```

Otherwise create `tickety_test` in pgAdmin or with PostgreSQL tooling, then
grant the configured local user access. The command is idempotent: it creates
the database only when it does not already exist.

Initialize or manually reset it with:

```powershell
npm run test:setup
```

The reset utility reads `api/sql/schema.sql`, replaces only the `public` schema
inside the guarded test database, and runs the project schema. It never reads a
different schema file and never targets a database whose name lacks the
`_test` suffix.

## Run the tests

From `api`:

```powershell
npm test
```

The explicit integration command is equivalent:

```powershell
npm run test:integration
```

The runner resets the test database before the tests and resets it again in a
`finally` cleanup step, including after a test failure. Test files run with
concurrency disabled at the file level so the shared integration scenario is
deterministic.

## Coverage groups

- **System:** health response and JSON behavior.
- **Email:** no external test transport, password-free Organizer welcome
  content, disabled delivery, and simulated SMTP failures after Organizer
  creation, approval, rejection, Booking, and cancellation. Recipient override
  tests cover unset, non-production redirect, original-recipient metadata, and
  production-ignore behavior without contacting real SMTP.
- **Authentication:** Customer-only public registration (including role-spoof
  attempts), Owner/Organizer onboarding, duplicates, safe User JSON, login,
  JWT failures, role authorization, and `/auth/me`.
- **Events:** active-and-approved public reads, hidden detail behavior,
  moderation filters/approve/reject, validation, JWT-derived ownership,
  `/events/mine`, reapproval after edits, and cross-organizer denial.
- **Ticket Types:** public reads, validation, relationship errors, duplicates,
  owner writes, role checks, and cross-organizer denial.
- **Bookings:** authenticated customer identity, server-side prices,
  inventory changes, active-and-approved rules, preserved history while
  pending, organizer visibility, cross-customer denial, cancellation, and
  single restoration.
- **Interests:** add/list/remove, duplicate idempotency, role and Event
  visibility rules, cross-user isolation, hidden omission, and cascade cleanup.
- **Security:** malformed JSON, unknown routes, ID/price spoofing regressions,
  role/ownership boundaries, and a controlled test-database failure that must
  return only the generic 500 response.
- **Concurrency:** two customers simultaneously request two tickets each when
  only three remain. Exactly one request must return 201, one must return 409,
  one confirmed Booking must exist, and quantity must be one. Cancelling the
  winner must restore quantity to three.

The concurrency test proves the PostgreSQL transaction and `SELECT ... FOR
UPDATE` behavior still prevents overselling. A unit test of a service function
could not prove database lock behavior.

## Cleanup behavior

Test data exists only in `tickety_test`. The integration runner performs:

```text
guard test database
-> reset with schema.sql
-> run real HTTP integration tests
-> close API and connection pool
-> reset with schema.sql again
```

The normal database configured in `api/.env` is not a cleanup target. If
`.env.test` is missing, the fallback `.env` values still cannot pass the
`DB_NAME` suffix guard, so the destructive reset stops.

## Optional classroom demo data

Demo commands are manual and separate from automated tests. They are never run
by `npm test`.

1. Copy `api/.env.demo.example` to `api/.env.demo`.
2. Choose demo-only `@example.com` emails containing `demo`.
3. Configure an existing Owner email/password plus demo Customer/Organizer
   emails and passwords of at least eight characters. The file is ignored by Git.
4. Set `DEMO_SETUP_CONFIRM=CREATE_DEMO_DATA`.
5. Start the normal local API, then run `npm run demo:setup` from `api`.

`demo:setup` accepts only a local HTTP API, logs in as the configured Owner,
creates the Organizer through the Owner endpoint, publicly registers the
Customer, creates one active Event plus General/VIP Ticket Types as the
Organizer, and approves the Event as Owner. It is idempotent by account, Event
title, and Ticket Type name. Passwords are never printed.

To remove those exact demo accounts and their related demo records, also set:

```dotenv
DEMO_RESET_CONFIRM=DELETE_DEMO_DATA
DEMO_DATABASE_CONFIRM=the_exact_DB_NAME_from_api_env
```

Then run:

```powershell
npm run demo:reset
```

The reset refuses `NODE_ENV=production`, non-local PostgreSQL hosts, a database
confirmation mismatch, non-demo emails, or a missing confirmation phrase. It
restores inventory from confirmed Bookings owned by the demo customer before
deleting those Bookings. Review `.env.demo` and back up any development data
you value before running a manual reset.

## Troubleshooting

- **Connection refused:** start PostgreSQL and verify host/port in
  `.env.test`.
- **Database does not exist:** run `npm run test:create` or create
  `tickety_test` in pgAdmin.
- **Permission denied creating database:** use a PostgreSQL administrator to
  create it once; the test user only needs schema/table permissions afterward.
- **Safety refusal:** confirm the active `DB_NAME` ends with `_test`. Never
  bypass this check by renaming the development database value.
- **JWT configuration error:** set a test-only `JWT_SECRET` in `.env.test`.
- **Address already in use:** integration tests use an automatically selected
  port, so check whether a locally modified helper hard-coded a port.
- **A repeated run behaves differently:** `npm run test:setup`, then rerun
  `npm test`; inspect the first failing assertion rather than later dependent
  fixture failures.
- **Demo setup receives 409 then cannot login:** the demo email already exists
  with another password. Use the matching demo password or run the guarded
  demo reset after checking its target.
