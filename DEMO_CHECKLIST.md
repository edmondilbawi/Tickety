# Tickety Live Demo Checklist

## Before presenting

- [ ] PostgreSQL is running and the Tickety database is reachable.
- [ ] `api/.env` contains correct database values and a private `JWT_SECRET`.
- [ ] For an email demo, `api/.env` contains private SMTP values, `SMTP_ENABLED=true`, and `npm run email:test -- --to <test-address>` succeeds.
- [ ] `app/.env` points `VITE_API_URL` to the API.
- [ ] Ports 3000 and 5173 are available, or both configured URLs match alternatives.
- [ ] API dependencies and frontend dependencies are installed.
- [ ] The frontend production build passes with `npm run build`.
- [ ] Browser console is clear of unexpected errors.
- [ ] A local Owner has been promoted and Owner/Organizer/Customer demo emails are planned.
- [ ] No real password is written in slides or this repository.
- [ ] Demo Event date is in the future if that is part of the presentation story.
- [ ] Browser tabs are prepared for the app, API health endpoint, and optionally pgAdmin.
- [ ] Existing data will not conflict with the planned Event/Ticket Type names.
- [ ] The permanent integration suite passes twice against `tickety_test`.

## Optional guarded demo preparation

Customers may register through the UI; Organizers cannot. For a repeatable
local demo dataset, follow `TESTING.md` and copy
`api/.env.demo.example` to the ignored `api/.env.demo` file.

With the local API running, `npm run demo:setup` logs in as the configured
Owner, creates the Organizer through the Owner API, registers a Customer,
prepares one Event plus General/VIP Ticket Types, and approves the Event. It
requires `DEMO_SETUP_CONFIRM=CREATE_DEMO_DATA` and never prints passwords.

`npm run demo:reset` is manual and destructive only to the exact demo accounts
and their related data. Run it only after confirming the local database name in
`DEMO_DATABASE_CONFIRM` and setting
`DEMO_RESET_CONFIRM=DELETE_DEMO_DATA`. It refuses production mode, non-local
database hosts, non-demo email addresses, and mismatched confirmation.

## Start the application

1. Start PostgreSQL.
2. In `api`, run `npm run dev`.
3. Open `http://localhost:3000/api/health` and show `{ "status": "ok" }`.
4. In `app`, run `npm run dev`.
5. Open the Vite URL printed in the terminal.

## Recommended live sequence

1. Show the Home page and explain Customer, Organizer, and Owner roles.
2. Login as the Owner, create an Organizer, and show the Organizer list.
   Confirm the Organizer welcome email if SMTP is enabled.
3. Login as that Organizer and show the Organizer Dashboard.
4. Create an active Event with a clear title, location, and date.
5. Add at least two Ticket Types with different prices and quantities.
6. Return to the dashboard and show Ticket Type count and remaining inventory.
7. Login as Owner, approve the pending Event, then logout.
   Confirm the Organizer receives the approval email.
8. Register or login with a Customer account (the Register form has no role selector).
9. Explore Events and demonstrate keyword, location, and date filtering.
10. Open Event Details, save it to My Interests, and show price/current availability.
11. Select quantities and point out the estimated total.
12. Confirm the Booking and show the success message.
    Confirm the Customer receives the Booking confirmation email.
13. Open My Bookings and show Ticket Types, historical prices, total, and status.
14. Return to Event Details and show decreased availability.
15. Cancel the Booking after reading the confirmation prompt.
    Confirm the Customer receives the cancellation email.
16. Show the cancelled status and absence of an active Cancel button.
17. Return to Event Details and show restored availability.
18. Logout and login as the organizer.
19. Show Booking Summary on the Organizer Dashboard.
20. Change a Ticket price, show approval reset to pending/public hiding, then reapprove as Owner.
21. Open Organizer Bookings and show the Customer, Event, Ticket Type, quantity, historical price, date, and status.
22. Reject a separate pending Event with a real reason and confirm that exact reason appears in the Organizer email.

If SMTP is disabled or unavailable, continue the demo: email is secondary and
must not prevent any successful business operation.

## Ownership and security demonstration

- Show that organizer forms are absent for a customer.
- Try a protected URL while logged out and show the Login redirect.
- Explain that route guards are for usability; the API middleware is the security boundary.
- If time permits, login as a second organizer and show that the first organizer's Events and Bookings do not appear.
- Explain that Event organizer ID and Booking customer ID come from the JWT.
- Explain that Booking price comes from PostgreSQL, not browser JSON.
- Explain that the transaction and row lock prevent overselling.

## Recovery plan

- If an email already exists, use a new demo email rather than editing the database live.
- If a Ticket Type name conflicts, choose another name for that Event.
- If the API is unreachable, verify PostgreSQL, `api/.env`, port 3000, and the API terminal error.
- If React cannot reach the API, verify `VITE_API_URL` and restart Vite.
- If a Booking fails, confirm the Event is active and availability is sufficient.
- If email is unavailable, verify `SMTP_ENABLED` and the SMTP variable names; do not display credentials while troubleshooting.
- Keep one known active Event as backup, but do not store credentials in this checklist.

## After presenting

- [ ] Stop the React and API development servers.
- [ ] Remove disposable demo data only if it is safe and intended.
- [ ] Do not delete the original legacy organizer or Event accidentally.
