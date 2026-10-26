import pool from '../config/database.js';

const ticketTypeColumns = `
  tt.id,
  tt.event_id AS "eventId",
  tt.name,
  tt.price::float AS price,
  tt.quantity
`;

const getPublicTicketTypes = async () => {
  const result = await pool.query(
    `SELECT ${ticketTypeColumns}
     FROM public.ticket_types tt
     JOIN public.events e ON e.id = tt.event_id
     WHERE e.status = 'active'
       AND e.approval_status = 'approved'
       AND e.event_date > CURRENT_TIMESTAMP
     ORDER BY tt.id ASC`,
  );

  return result.rows;
};

const getTicketTypesByOrganizerId = async (organizerId) => {
  const result = await pool.query(
    `SELECT ${ticketTypeColumns}
     FROM public.ticket_types tt
     JOIN public.events e ON e.id = tt.event_id
     WHERE e.organizer_id = $1
     ORDER BY tt.id ASC`,
    [organizerId],
  );

  return result.rows;
};

const getAllTicketTypes = async () => {
  const result = await pool.query(
    `SELECT ${ticketTypeColumns}
     FROM public.ticket_types tt
     ORDER BY tt.id ASC`,
  );

  return result.rows;
};

const getTicketTypesByEventId = async (eventId) => {
  const result = await pool.query(
    `SELECT ${ticketTypeColumns}
     FROM public.ticket_types tt
     WHERE tt.event_id = $1
     ORDER BY tt.id ASC`,
    [eventId],
  );

  return result.rows;
};

const getTicketTypeById = async (id, queryable = pool) => {
  const result = await queryable.query(
    `SELECT ${ticketTypeColumns}
     FROM public.ticket_types tt
     WHERE tt.id = $1`,
    [id],
  );

  return result.rows[0];
};

const getTicketTypeWithEvent = async (id) => {
  const result = await pool.query(
    `SELECT ${ticketTypeColumns},
            e.organizer_id AS "organizerId",
            e.status AS "eventStatus",
            e.event_date AS "eventDate",
            e.approval_status AS "approvalStatus"
     FROM public.ticket_types tt
     JOIN public.events e ON e.id = tt.event_id
     WHERE tt.id = $1`,
    [id],
  );

  return result.rows[0];
};

const createTicketType = async (ticketType, queryable = pool) => {
  const { eventId, name, price, quantity } = ticketType;

  const result = await queryable.query(
    `INSERT INTO public.ticket_types (event_id, name, price, quantity)
     VALUES ($1, $2, $3, $4)
     RETURNING id,
               event_id AS "eventId",
               name,
               price::float AS price,
               quantity`,
    [eventId, name, price, quantity],
  );

  return result.rows[0];
};

const updateTicketType = async (id, ticketType, queryable = pool) => {
  const { eventId, name, price, quantity } = ticketType;

  const result = await queryable.query(
    `UPDATE public.ticket_types
     SET event_id = $1,
         name = $2,
         price = $3,
         quantity = $4
     WHERE id = $5
     RETURNING id,
               event_id AS "eventId",
               name,
               price::float AS price,
               quantity`,
    [eventId, name, price, quantity, id],
  );

  return result.rows[0];
};

const deleteTicketType = async (id, queryable = pool) => {
  const result = await queryable.query(
    `DELETE FROM public.ticket_types
     WHERE id = $1
     RETURNING id,
               event_id AS "eventId",
               name,
               price::float AS price,
               quantity`,
    [id],
  );

  return result.rows[0];
};

const acquireClient = () => pool.connect();
const beginTransaction = (client) => client.query('BEGIN');
const commitTransaction = (client) => client.query('COMMIT');
const rollbackTransaction = (client) => client.query('ROLLBACK');

export {
  acquireClient,
  beginTransaction,
  commitTransaction,
  createTicketType,
  deleteTicketType,
  getAllTicketTypes,
  getPublicTicketTypes,
  getTicketTypeById,
  getTicketTypeWithEvent,
  getTicketTypesByEventId,
  getTicketTypesByOrganizerId,
  rollbackTransaction,
  updateTicketType,
};
