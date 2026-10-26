# Tickety

Tickety is an online Event ticket booking platform created for the CSIS279 midterm/final project. It includes approved Event discovery, customer Bookings and interests, Organizer management, and an Owner moderation workspace.

Current Booking features include:

- Three server-controlled roles: Customer, Organizer, and Owner.
- Public Event Details and Ticket Types only for active, Owner-approved Events.
- Owner-created Organizer accounts and a local Owner-promotion command.
- Event approval/rejection with reapproval after Event or Ticket Type changes.
- Customer interests for currently public Events.
- Customer Bookings containing one or more Ticket Types from one Event.
- PostgreSQL transactions and row locks that prevent partial Bookings and overselling.
- Historical Booking Item prices loaded from PostgreSQL rather than trusted client data.
- Customer Booking history and cancellation with inventory restoration.
- Organizer Booking visibility restricted to Events owned by that organizer.
- Case-insensitive Event search plus location, status, and date filtering.
- Organizer Dashboard with owned Events, remaining inventory, quick actions, and Booking summary.
- Optional SMTP notifications for Bookings, cancellations, Event moderation, and Organizer onboarding.
- Responsive project CSS with clear loading, empty, success, and error states.

Project documents:

- `TESTING.md`: permanent integration tests, test database safety, and demo tooling.
- `MIDTERM_DOCUMENTATION.md`: setup, schema, API, security, and testing guide.
- `DEMO_CHECKLIST.md`: live classroom demonstration sequence.

## Folder structure

```text
.
|-- api/                 Express and PostgreSQL backend
|   |-- sql/             SQL schema references
|   `-- src/
|       |-- config/      Application configuration
|       |-- controllers/ HTTP request and response handling
|       |-- middleware/  Express middleware
|       |-- repositories/ PostgreSQL queries
|       |-- routes/      API route definitions
|       |-- services/    Business logic
|       `-- validators/  Request validation
`-- app/                 React and Vite frontend
    `-- src/
        |-- assets/      Static frontend assets
        |-- components/  Reusable React components
        |-- services/    Frontend API helpers
        `-- views/       Route-level React views
```

## Install the API

```bash
cd api
npm install
```

Copy the example environment file and fill in your local PostgreSQL settings:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux, use `cp .env.example .env` instead.

Set `JWT_SECRET` in `api/.env` to a long, private, randomly generated value. Never commit that value or reuse a production secret in development.

For local development, the API can generate and store one safely without
printing it:

```bash
npm run env:configure-jwt
```

For a new PostgreSQL database, create the schema from the project root:

```powershell
psql -d tickety -f api/sql/schema.sql
```

You may run the same file through pgAdmin's Query Tool.

For an existing local Tickety database, apply the additive migration from
`api` and confirm the exact `DB_NAME` configured in `api/.env`:

```powershell
npm run db:migrate:owner-approval -- --database Tickety
npm run db:migrate:event-category -- --database Tickety
```

Replace `Tickety` with the exact configured database name. The command refuses
non-local database hosts and mismatched names. Existing Events are preserved
and become `pending` so an Owner can review them.

Public registration always creates a Customer, even if a caller sends a role.
After registering the account that should be the first Owner, promote it
locally from `api`:

```powershell
npm run owner:promote -- --email owner@example.com
```

The promotion command requires an existing account and never accepts or logs a
password. Owners create all Organizer accounts in the Owner dashboard or with
`POST /api/owner/organizers`.

If a local account's current password is unknown, reset it without placing the
new value in source code or the command arguments:

```powershell
$resetSecret = Read-Host "New Tickety password" -AsSecureString
$env:RESET_USER_PASSWORD = [System.Net.NetworkCredential]::new('', $resetSecret).Password
npm run user:reset-password -- --email owner@example.com
Remove-Item Env:RESET_USER_PASSWORD
```

This command validates and bcrypt-hashes the new password, updates only that
User's password column, and leaves their role unchanged.

Start the backend in development mode:

```bash
npm run dev
```

The API runs at `http://localhost:3000` by default. Its health endpoint is `http://localhost:3000/api/health`.

Current API resources are available at:

- `http://localhost:3000/api/auth/register`
- `http://localhost:3000/api/auth/login`
- `http://localhost:3000/api/auth/me`
- `http://localhost:3000/api/events`
- `http://localhost:3000/api/events/mine`
- `http://localhost:3000/api/events/:id`
- `http://localhost:3000/api/events/:id/ticket-types`
- `http://localhost:3000/api/ticket-types`
- `http://localhost:3000/api/bookings`
- `http://localhost:3000/api/bookings/my`
- `http://localhost:3000/api/bookings/organizer`
- `http://localhost:3000/api/bookings/:id`
- `http://localhost:3000/api/bookings/:id/cancel`
- `http://localhost:3000/api/interests/my`
- `http://localhost:3000/api/interests/:eventId`
- `http://localhost:3000/api/owner/organizers`
- `http://localhost:3000/api/owner/events`
- `http://localhost:3000/api/owner/events/:id/approve`
- `http://localhost:3000/api/owner/events/:id/reject`

Public Event and Ticket Type reads expose only Events whose lifecycle status is
`active` and approval status is `approved`. Organizers may manage only their
own Events and Ticket Types. Owners can review hidden Events. Booking and
interest writes require a Customer account. Organizer Booking reads are
filtered to owned Events.

`GET /api/events` supports optional `search`, `location`, `category`, `status`, `from`, and `to` query parameters. The date format is `YYYY-MM-DD`; public results are always active, approved, and in the future. Organizers use the protected `/api/events/mine` endpoint to manage all lifecycle and approval states they own.

Creating or updating an Event leaves it pending. Creating, updating, or
deleting one of its Ticket Types resets it to pending in the same database
transaction. New Bookings require an active, approved, future Event. Booking cancellation is also blocked after the Event date has passed. Existing Booking history remains visible, and a cancelled Event is labelled in My Bookings.

### Optional SMTP email

Tickety uses Nodemailer with one reusable SMTP transporter. Email is disabled
by default and is attempted only after the related database operation commits.
Add provider-specific values to the ignored `api/.env` file when email is
needed:

```dotenv
SMTP_ENABLED=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password
SMTP_FROM_NAME=Tickety
SMTP_FROM_EMAIL=no-reply@example.com
SMTP_TEST_RECIPIENT=
```

For local demos, `SMTP_TEST_RECIPIENT=your-real-test-inbox@example.com`
redirects all delivery to one inbox without changing the logical recipient
stored in PostgreSQL. Redirected subjects identify the original recipient.
Never configure `SMTP_TEST_RECIPIENT` in production; production ignores it.

With SMTP configured, test one delivery from `api` without embedding a
recipient in source code:

```powershell
npm run email:test -- --to someone@example.com
```

Supported notifications are Booking confirmation, Booking cancellation,
Event approval, Event rejection with the Owner's reason, and Organizer
welcome. SMTP errors are logged without secrets and never roll back a
successful business operation. Automated tests never create an external SMTP
transport.

## Install the frontend

Open another terminal from the repository root:

```bash
cd app
npm install
```

Copy the example frontend environment file:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux, use `cp .env.example .env` instead.

Start the Vite development server:

```bash
npm run dev
```

Vite prints the local frontend URL in the terminal, normally `http://localhost:5173`.

Frontend routes include:

- `/register` and `/login`
- `/events` and `/events/:id`
- `/my-bookings` for customers
- `/interests` for customer interests
- `/organizer` for the Organizer Dashboard
- `/ticket-types` and Event/Ticket Type form routes for organizers
- `/organizer/bookings` for organizer Booking visibility
- `/owner/approvals` and `/owner/organizers` for Owner workflows

Role-specific routes are protected in the UI, while the API remains the authoritative security layer.

## Legacy development users

Older plaintext development passwords are intentionally rejected. Register a new account to receive a bcrypt password hash. Remove legacy development accounts only after checking their related Events and Bookings.

## Architecture and course alignment

Tickety follows a layered MVC-style structure. React views/components are the View layer, Express controllers are the Controller layer, and PostgreSQL plus repository modules form the Model/data layer. Services sit between controllers and repositories to enforce business rules and transactions, while routes and middleware handle request-level routing and authorization.

Authentication stays in React Context because it is small global session state used by navigation and route guards; Redux Toolkit would add another dependency and reducer layer without improving this project at its current size. If the client grows to shared server-state workflows across many unrelated features, Redux would be a reasonable next step.

Dependency injection means supplying a module's dependencies from outside instead of constructing them internally. Tickety's `createBookingService` factory receives the Booking repository and email senders, while the normal exported service uses the real dependencies. This keeps production behavior unchanged, makes dependencies explicit, and allows tests to supply substitutes.

Why raw `pg` instead of an ORM: **booking needs explicit transactions and `FOR UPDATE` row locks, so raw `pg` gives direct and predictable concurrency control.**

## Submission security

Real `.env` files are intentionally excluded from submission. SMTP credentials must live only in the ignored `api/.env`. If a Gmail app password has ever been shared or packaged, revoke it in the Google account and create a new app password before using email again.

For an existing database, apply `api/sql/migrations/002_event_category.sql` before running the updated application.

## Production build

To verify or create a frontend production build:

```bash
cd app
npm run build
```

## Automated integration tests

Automated API tests use Node's built-in test runner and a separate disposable
PostgreSQL database. They must not run against the normal Tickety database.
The current suite contains more than 100 real-HTTP integration tests, including a
simultaneous Booking concurrency test.

From `api`, copy `.env.test.example` to `.env.test`, fill in local PostgreSQL
credentials, keep `DB_NAME=tickety_test`, and set a test-only `JWT_SECRET`.
Then run:

```powershell
npm run test:create
npm test
```

`npm run test:create` is needed only when the test database does not exist.
`npm test` resets the guarded test database before and after the real-HTTP
integration suite. See `TESTING.md` for coverage, safeguards, cleanup, and
troubleshooting.

Optional classroom demo commands are `npm run demo:setup` and
`npm run demo:reset`. They require the explicit confirmations documented in
`TESTING.md` and an ignored `.env.demo` file; neither command runs
automatically.
