# Tickety Midterm Documentation

## 1. Project Overview

Tickety is an online Event ticket booking platform. Public visitors can discover active Events and inspect Ticket Types. Customers can create and cancel Bookings. Organizers can manage their Events and Ticket Types and view Bookings for Events they own.

The project intentionally stops before payments, seat maps, QR validation, resale, or recommendation features.

## 2. Technology Stack

- Frontend: React 19, Vite, React Router, JavaScript, Fetch API, project CSS.
- Backend: Node.js, Express 5, JavaScript ES modules.
- Database: PostgreSQL through the `pg` package.
- Authentication: bcrypt password hashes and signed JWT Bearer tokens.
- Email: optional SMTP delivery through Nodemailer.
- Configuration: `dotenv` and separate frontend/backend `.env` files.
- Development: nodemon for automatic API restarts.

No ORM, Axios, Redux, TypeScript, or component library is used.

## 3. Project Architecture

Backend request flow:

```text
Route
-> Authentication/authorization middleware when required
-> Controller
-> Service and validator
-> Repository
-> PostgreSQL
```

- Routes declare URLs, HTTP methods, and middleware.
- Controllers translate HTTP input and send JSON responses.
- Validators check request shape and field rules.
- Services enforce business rules, ownership, and transactions.
- Repositories contain parameterized SQL.

Frontend flow:

```text
View or reusable Component
-> frontend service
-> fetch with JSON and optional Bearer token
-> API
-> handleResponse
-> React state
```

### MVC mapping

- **Model/data layer:** PostgreSQL tables plus repository modules that own parameterized SQL.
- **Controller layer:** Express controllers translate HTTP input/output; service modules coordinate use cases and business rules between controllers and repositories.
- **View/presentation layer:** React route views and reusable components render the user interface.
- **Routing/middleware:** Express routes, authentication and role middleware sit in front of controllers and enforce request-level concerns.

The project uses a layered MVC interpretation rather than putting SQL directly in controllers.

## 4. Folder Structure

```text
Tickety Project/
|-- api/
|   |-- sql/                 PostgreSQL schema references
|   `-- src/
|       |-- config/          Database configuration
|       |-- controllers/     HTTP handling
|       |-- middleware/      Authentication and role checks
|       |-- repositories/    SQL queries
|       |-- routes/          Express routes
|       |-- services/        Business logic and transactions
|       `-- validators/      Input validation
|-- app/
|   `-- src/
|       |-- components/      Reusable React UI
|       |-- context/         Authentication state
|       |-- services/        Fetch helpers
|       `-- views/           Route-level pages
|-- README.md
|-- DEMO_CHECKLIST.md
`-- MIDTERM_DOCUMENTATION.md
```

## 5. Setup Instructions

Requirements:

- Node.js and npm.
- PostgreSQL.
- A PostgreSQL database and user with permission to create tables.

Install API packages:

```powershell
cd api
npm install
Copy-Item .env.example .env
```

Install frontend packages in another terminal:

```powershell
cd app
npm install
Copy-Item .env.example .env
```

On macOS/Linux, use `cp` instead of `Copy-Item`.

## 6. Environment Variables

`api/.env`:

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_postgresql_user
DB_PASSWORD=your_postgresql_password
DB_NAME=tickety
PORT=3000
JWT_SECRET=replace_with_a_long_private_random_value
SMTP_ENABLED=false
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password
SMTP_FROM_NAME=Tickety
SMTP_FROM_EMAIL=no-reply@example.com
```

`app/.env`:

```dotenv
VITE_API_URL=http://localhost:3000/api
```

Do not commit real passwords or JWT secrets. Restart Vite after changing its environment file.

## 7. PostgreSQL Database Setup

Create an empty database named `tickety`, then run the schema reference from the project root:

```powershell
psql -d tickety -f api/sql/schema.sql
```

The same file can be opened and executed through pgAdmin's Query Tool. `schema.sql` uses `CREATE TABLE IF NOT EXISTS` and contains no sample Users or credentials.

After creating the schema, set the matching connection values in `api/.env`.

## 8. Database Schema

### `users`

Stores `id`, first and last name, unique email, bcrypt password hash, role, and creation date. Roles are `customer`, `organizer`, and `owner`.

### `events`

Stores `id`, organizer foreign key, title, optional description, location, category,
Event date, lifecycle `status`, and Owner moderation fields
`approval_status`, `approved_by`, `approved_at`, and `rejection_reason`.
Lifecycle statuses are `draft`, `active`, and `cancelled`; approval statuses
are `pending`, `approved`, and `rejected`. Public Events require active and
approved.

### `ticket_types`

Stores `id`, Event foreign key, name, current price, and current remaining quantity. Price and quantity cannot be negative. Ticket Type names are unique within one Event.

### `bookings`

Stores `id`, customer User foreign key, Booking date, and status. Application statuses are `confirmed` and `cancelled`.

### `booking_items`

Stores `id`, Booking foreign key, Ticket Type foreign key, positive quantity, and historical price. A Ticket Type appears at most once per Booking.

### `event_interests`

Stores an explicit Customer bookmark using `id`, Customer `user_id`,
`event_id`, and `created_at`. The User/Event pair is unique and both foreign
keys cascade on deletion.

## 9. Relationships

```text
Organizer User 1 -> many Events
Event 1 -> many Ticket Types
Customer User 1 -> many Bookings
Booking 1 -> many Booking Items
Ticket Type 1 -> many Booking Items
```

Booking and Booking Item are separate because one Booking can contain several Ticket Types. The Booking stores customer/date/status once, while each Booking Item stores one Ticket Type and quantity.

`booking_items.price` is intentionally separate from `ticket_types.price`. It records the price at Booking time. Changing a Ticket Type price later must not rewrite old customer history.

## 10. API Endpoint Table

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | API health check |
| POST | `/api/auth/register` | Public | Register a customer account |
| POST | `/api/auth/login` | Public | Return JWT and safe User |
| GET | `/api/auth/me` | Authenticated | Restore current User |
| GET | `/api/events` | Public | List/filter Events |
| GET | `/api/events/mine` | Organizer | Owned Events with simple counts |
| GET | `/api/events/:id` | Public | Event Details |
| GET | `/api/events/:id/ticket-types` | Public | Ticket Types for one Event |
| POST | `/api/events` | Organizer | Create owned Event |
| PUT | `/api/events/:id` | Event owner | Update Event |
| DELETE | `/api/events/:id` | Event owner | Delete Event when allowed |
| GET | `/api/ticket-types` | Public | List Ticket Types |
| GET | `/api/ticket-types/:id` | Public | Read Ticket Type |
| POST | `/api/ticket-types` | Event owner | Create Ticket Type |
| PUT | `/api/ticket-types/:id` | Event owner | Update Ticket Type |
| DELETE | `/api/ticket-types/:id` | Event owner | Delete Ticket Type when allowed |
| POST | `/api/bookings` | Customer | Create confirmed Booking |
| GET | `/api/bookings/my` | Customer | Own Booking history |
| GET | `/api/bookings/organizer` | Organizer | Bookings for owned Events |
| GET | `/api/bookings/:id` | Authorized owner | Read one Booking |
| POST | `/api/bookings/:id/cancel` | Booking owner | Cancel and restore availability |

Optional `/api/events` filters are `search`, `location`, `category`, `status`, `from`, and `to`. Dates use `YYYY-MM-DD`.

Example:

```text
GET /api/events?search=music&location=Beirut&status=active&from=2026-10-01&to=2026-12-31
```

## 11. Authentication

Registration hashes passwords with bcrypt. Login compares the hash and returns a JWT that expires after two hours. Protected requests use:

```http
Authorization: Bearer JWT_VALUE
```

Authentication middleware verifies the signature, reloads the User from PostgreSQL, and sets `request.user`. The frontend stores the classroom-project Bearer token in local storage and restores the User through `/api/auth/me`.

## 12. Event Functionality

- Public search matches title, description, and location case-insensitively.
- Category, location, status, and inclusive date-range filters are supported.
- Explore Events returns only active, approved Events whose date is still in the future.
- Organizers use `/api/events/mine` and the dashboard to see all owned statuses.
- Event create uses the authenticated organizer ID, never a browser organizer ID.
- Update/delete require Event ownership.

## 13. Ticket Type Functionality

- Ticket Types belong to Events through `event_id`.
- Organizers manage only Ticket Types for Events they own.
- The management table shows Event title rather than a raw relationship ID.
- Quantity is current remaining inventory.
- Public visitors see Ticket Types through Event Details.

## 14. Booking Functionality

Customers submit Ticket Type IDs and quantities. The service uses one PostgreSQL transaction and one acquired client to:

1. Lock Ticket Types and their Event with `SELECT ... FOR UPDATE`.
2. Verify all Ticket Types exist and belong to one active Event.
3. Verify current availability.
4. Create the Booking using the authenticated User ID.
5. Copy database Ticket Type prices into Booking Items.
6. Decrease inventory and commit.

Any failure rolls back all changes. Cancellation locks the Booking, rejects an already-cancelled Booking, restores inventory once, changes the status, and commits.

Email is deliberately outside each transaction. After commit and client
release, the service attempts the relevant Booking confirmation or
cancellation notification. It uses the assembled Booking Items, including
their historical `booking_items.price` values. SMTP failure is secondary and
does not change the successful Booking result.

The same post-success notification rule covers Event approval, Event
rejection, and Owner-created Organizer accounts. `email.service.js` owns the
HTML/plain-text templates, `config/mail.js` owns the reusable transporter, and
repositories remain the only layer containing SQL.

## 15. Validation and Error Handling

Validators check Event, Ticket Type, User, Booking, and Event-filter inputs. Expected JSON errors use either:

```json
{ "message": "Readable error" }
```

or:

```json
{ "errors": ["Validation error one", "Validation error two"] }
```

Status meanings:

- 400 invalid request data or filters.
- 401 missing or invalid authentication.
- 403 authenticated but unauthorized.
- 404 missing resource.
- 409 business conflict such as insufficient inventory.
- 500 unexpected server error, returned without raw database details.

Views handle loading, errors, empty arrays, and success feedback defensively.

## 16. Security Measures

- JWT secret and database credentials remain environment-only.
- SMTP credentials remain backend environment values and are never sent to React.
- Passwords are bcrypt hashes and never returned in JSON.
- SQL values use PostgreSQL parameters.
- Role and ownership checks run on the server.
- Event organizer and Booking customer IDs come from JWT identity.
- Booking Item prices come from locked database rows.
- Only active Events can be booked.
- Inventory updates cannot reduce quantity below zero.
- Cancellation cannot restore inventory twice.
- Frontend route guards and hidden buttons are usability features, not security boundaries.

## 17. How to Run

Start PostgreSQL first. Then start the API:

```powershell
cd api
npm run dev
```

In another terminal, start React:

```powershell
cd app
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. The API normally runs at `http://localhost:3000`.

## 18. How to Test

Build the frontend:

```powershell
cd app
npm run build
```

Suggested smoke sequence:

1. Request `/api/health` and `/api/events`.
2. Confirm an unauthenticated POST to `/api/events` or `/api/bookings` returns 401.
3. Register/login an organizer, create an Event, and add Ticket Types.
4. Verify search, location, and date filters.
5. Register/login a customer and make a Booking.
6. Verify quantity decreases and excessive quantity returns 409.
7. Open My Bookings, cancel, and verify quantity restores.
8. Login as the organizer and verify the dashboard and owned-Event Bookings.
9. Try another organizer and verify ownership returns 403 or excludes the data.

Use temporary accounts and remove their records afterward when direct database inspection is part of testing.

## 19. Current Scope

Implemented scope includes authentication, roles, Event CRUD/search, Ticket Type CRUD, Event Details, transactional Booking creation, history, cancellation, organizer Booking visibility, organizer dashboard, optional SMTP notifications, responsive project styling, and midterm/demo documentation.

## 20. Features Intentionally Outside Scope

- Payments and refunds.
- Seat maps or assigned seating.
- QR ticket generation or validation.
- Ticket resale.
- Dynamic pricing.
- Recommendation systems.
- OAuth or third-party login.
- Redux.
- Deployment infrastructure.


## Syllabus Alignment Notes

**Redux:** Tickety keeps authentication in Context because the global client state is limited to the current user/session and route guards. Redux Toolkit would be justified later if many unrelated features needed coordinated shared client state.

**Dependency injection:** DI means a module receives its collaborators from outside instead of creating them internally. Tickety's `createBookingService` factory receives the Booking repository and email senders. The normal service uses the real dependencies, while tests can supply substitutes, which makes dependencies clearer and transaction logic easier to test.

**Raw `pg`:** Booking requires explicit transactions and `FOR UPDATE` row locks; raw `pg` provides precise, transparent concurrency control without hiding SQL behind an ORM.

## Deviations from Proposal

The midterm implementation intentionally narrows the broader proposal to the course deadline. It uses a React web frontend, Express/Node backend and PostgreSQL rather than the earlier mobile/Spring direction. Payments, QR validation, social gifting and advanced recommendation features are deferred. The delivered scope focuses on authentication, event moderation, real category filtering, ticket inventory, transactional booking, cancellation, interests and role-based dashboards. These deviations keep the project demonstrable and aligned with the technologies taught in CSIS 279.

## User Data Exposure

There is no public User-by-ID endpoint. Authentication responses return only the fields needed by the logged-in client, and Owner organizer listings return the minimum account fields needed for administration. Password hashes are never returned by API responses.
