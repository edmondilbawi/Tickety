import pool from '../config/database.js';

const bookingDetailColumns = `
  b.id AS "bookingId",
  b.user_id AS "userId",
  b.booking_date AS "bookingDate",
  b.status,
  u.first_name AS "customerFirstName",
  u.last_name AS "customerLastName",
  u.email AS "customerEmail",
  e.id AS "eventId",
  e.organizer_id AS "organizerId",
  e.title AS "eventTitle",
  e.location AS "eventLocation",
  e.event_date AS "eventDate",
  e.status AS "eventStatus",
  bi.id AS "itemId",
  bi.ticket_type_id AS "ticketTypeId",
  tt.name AS "ticketTypeName",
  bi.quantity,
  bi.price::float AS price
`;

const bookingDetailFrom = `
  FROM public.bookings b
  JOIN public.users u ON u.id = b.user_id
  JOIN public.booking_items bi ON bi.booking_id = b.id
  JOIN public.ticket_types tt ON tt.id = bi.ticket_type_id
  JOIN public.events e ON e.id = tt.event_id
`;

const acquireClient = () => pool.connect();

const beginTransaction = (client) => client.query('BEGIN');

const commitTransaction = (client) => client.query('COMMIT');

const rollbackTransaction = (client) => client.query('ROLLBACK');

const getTicketTypesForBooking = async (client, ticketTypeIds) => {
  // Lock rows in a stable Ticket Type ID order so overlapping multi-item
  // Bookings wait predictably instead of acquiring the same locks in reverse.
  // Waiting requests then see the latest committed inventory before writing.
  const result = await client.query(
    `SELECT tt.id,
            tt.event_id AS "eventId",
            tt.name,
            tt.price,
            tt.quantity,
            e.organizer_id AS "organizerId",
            e.title AS "eventTitle",
            e.status AS "eventStatus",
            e.event_date AS "eventDate",
            e.approval_status AS "approvalStatus"
     FROM public.ticket_types tt
     JOIN public.events e ON e.id = tt.event_id
     WHERE tt.id = ANY($1::int[])
     ORDER BY tt.id ASC
     FOR UPDATE OF tt, e`,
    [ticketTypeIds],
  );

  return result.rows;
};

const createBooking = async (client, userId) => {
  const result = await client.query(
    `INSERT INTO public.bookings (user_id, status)
     VALUES ($1, 'confirmed')
     RETURNING id,
               user_id AS "userId",
               booking_date AS "bookingDate",
               status`,
    [userId],
  );

  return result.rows[0];
};

const createBookingItem = async (client, bookingId, item) => {
  const result = await client.query(
    `INSERT INTO public.booking_items
       (booking_id, ticket_type_id, quantity, price)
     VALUES ($1, $2, $3, $4)
     RETURNING id,
               booking_id AS "bookingId",
               ticket_type_id AS "ticketTypeId",
               quantity,
               price::float AS price`,
    [bookingId, item.ticketTypeId, item.quantity, item.price],
  );

  return result.rows[0];
};

const decreaseTicketQuantity = async (client, ticketTypeId, quantity) => {
  const result = await client.query(
    `UPDATE public.ticket_types
     SET quantity = quantity - $1
     WHERE id = $2
       AND quantity >= $1
     RETURNING quantity`,
    [quantity, ticketTypeId],
  );

  return result.rows[0];
};

const getBookingForUpdate = async (client, bookingId) => {
  const result = await client.query(
    `SELECT id,
            user_id AS "userId",
            booking_date AS "bookingDate",
            status
     FROM public.bookings
     WHERE id = $1
     FOR UPDATE`,
    [bookingId],
  );

  return result.rows[0];
};

const getBookingItemsForCancellation = async (client, bookingId) => {
  const result = await client.query(
    `SELECT bi.id,
            bi.ticket_type_id AS "ticketTypeId",
            bi.quantity,
            bi.price::float AS price,
            tt.name AS "ticketTypeName"
     FROM public.booking_items bi
     JOIN public.ticket_types tt ON tt.id = bi.ticket_type_id
     WHERE bi.booking_id = $1
     ORDER BY tt.id ASC
     FOR UPDATE OF tt`,
    [bookingId],
  );

  return result.rows;
};

const restoreTicketQuantity = async (client, ticketTypeId, quantity) => {
  const result = await client.query(
    `UPDATE public.ticket_types
     SET quantity = quantity + $1
     WHERE id = $2
     RETURNING quantity`,
    [quantity, ticketTypeId],
  );

  return result.rows[0];
};

const markBookingCancelled = async (client, bookingId) => {
  const result = await client.query(
    `UPDATE public.bookings
     SET status = 'cancelled'
     WHERE id = $1
       AND status = 'confirmed'
     RETURNING id,
               user_id AS "userId",
               booking_date AS "bookingDate",
               status`,
    [bookingId],
  );

  return result.rows[0];
};

const getBookingRowsByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT ${bookingDetailColumns}
     ${bookingDetailFrom}
     WHERE b.user_id = $1
     ORDER BY b.booking_date DESC, b.id DESC, bi.id ASC`,
    [userId],
  );

  return result.rows;
};

const getBookingRowsByOrganizerId = async (organizerId) => {
  const result = await pool.query(
    `SELECT ${bookingDetailColumns}
     ${bookingDetailFrom}
     WHERE e.organizer_id = $1
     ORDER BY b.booking_date DESC, b.id DESC, bi.id ASC`,
    [organizerId],
  );

  return result.rows;
};

const getBookingRowsById = async (bookingId, queryable = pool) => {
  const result = await queryable.query(
    `SELECT ${bookingDetailColumns}
     ${bookingDetailFrom}
     WHERE b.id = $1
     ORDER BY bi.id ASC`,
    [bookingId],
  );

  return result.rows;
};

export {
  acquireClient,
  beginTransaction,
  commitTransaction,
  createBooking,
  createBookingItem,
  decreaseTicketQuantity,
  getBookingForUpdate,
  getBookingItemsForCancellation,
  getBookingRowsById,
  getBookingRowsByOrganizerId,
  getBookingRowsByUserId,
  getTicketTypesForBooking,
  markBookingCancelled,
  restoreTicketQuantity,
  rollbackTransaction,
};
