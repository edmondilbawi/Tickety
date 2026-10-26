import pg from 'pg';
import {
  assertLocalDatabase,
  assertNotProduction,
  getDemoAccounts,
} from './demoEnvironment.js';

const { Client } = pg;

assertNotProduction();
assertLocalDatabase();

if (process.env.DEMO_RESET_CONFIRM !== 'DELETE_DEMO_DATA') {
  throw new Error(
    'Set DEMO_RESET_CONFIRM=DELETE_DEMO_DATA in .env.demo to continue',
  );
}

if (process.env.DEMO_DATABASE_CONFIRM !== process.env.DB_NAME) {
  throw new Error('DEMO_DATABASE_CONFIRM must exactly match DB_NAME');
}

const accounts = getDemoAccounts();
const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  await client.connect();
  await client.query('BEGIN');

  await client.query(
    `DELETE FROM public.event_interests i
     WHERE i.user_id IN (
       SELECT id FROM public.users WHERE LOWER(email) = $1
     )
     OR i.event_id IN (
       SELECT e.id
       FROM public.events e
       JOIN public.users organizer ON organizer.id = e.organizer_id
       WHERE LOWER(organizer.email) = $2
     )`,
    [accounts.customer.email, accounts.organizer.email],
  );

  await client.query(
    `UPDATE public.ticket_types tt
     SET quantity = tt.quantity + restored.quantity
     FROM (
       SELECT bi.ticket_type_id, SUM(bi.quantity)::int AS quantity
       FROM public.booking_items bi
       JOIN public.bookings b ON b.id = bi.booking_id
       JOIN public.users customer ON customer.id = b.user_id
       WHERE LOWER(customer.email) = $1
         AND b.status = 'confirmed'
       GROUP BY bi.ticket_type_id
     ) restored
     WHERE tt.id = restored.ticket_type_id`,
    [accounts.customer.email],
  );

  const deletedBookings = await client.query(
    `DELETE FROM public.bookings b
     WHERE b.user_id IN (
       SELECT id FROM public.users WHERE LOWER(email) = $1
     )
     OR b.id IN (
       SELECT DISTINCT bi.booking_id
       FROM public.booking_items bi
       JOIN public.ticket_types tt ON tt.id = bi.ticket_type_id
       JOIN public.events e ON e.id = tt.event_id
       JOIN public.users organizer ON organizer.id = e.organizer_id
       WHERE LOWER(organizer.email) = $2
     )`,
    [accounts.customer.email, accounts.organizer.email],
  );

  const deletedEvents = await client.query(
    `DELETE FROM public.events
     WHERE organizer_id IN (
       SELECT id FROM public.users WHERE LOWER(email) = $1
     )`,
    [accounts.organizer.email],
  );

  const deletedUsers = await client.query(
    `DELETE FROM public.users
     WHERE LOWER(email) = ANY($1::text[])`,
    [[accounts.organizer.email, accounts.customer.email]],
  );

  await client.query('COMMIT');
  console.log(
    `Removed demo rows: ${deletedUsers.rowCount} Users, `
      + `${deletedEvents.rowCount} Events, `
      + `${deletedBookings.rowCount} Bookings.`,
  );
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await client.end();
}
