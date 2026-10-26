import pool from '../config/database.js';

const publicEventColumns = `
  e.id,
  e.organizer_id AS "organizerId",
  e.title,
  e.description,
  e.location,
  e.category,
  e.event_date AS "eventDate",
  e.status
`;

const managedEventColumns = `
  e.id,
  e.organizer_id AS "organizerId",
  e.title,
  e.description,
  e.location,
  e.category,
  e.event_date AS "eventDate",
  e.status,
  e.approval_status AS "approvalStatus",
  e.approved_by AS "approvedBy",
  e.approved_at AS "approvedAt",
  e.rejection_reason AS "rejectionReason"
`;

const getPublicEvents = async (filters = {}) => {
  const conditions = [
    `e.status = 'active'`,
    `e.approval_status = 'approved'`,
    `e.event_date > CURRENT_TIMESTAMP`,
  ];
  const values = [];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const placeholder = `$${values.length}`;
    conditions.push(
      `(e.title ILIKE ${placeholder}
        OR COALESCE(e.description, '') ILIKE ${placeholder}
        OR e.location ILIKE ${placeholder})`,
    );
  }

  if (filters.location) {
    values.push(`%${filters.location}%`);
    conditions.push(`e.location ILIKE $${values.length}`);
  }

  if (filters.category) {
    values.push(filters.category);
    conditions.push(`e.category = $${values.length}`);
  }

  if (filters.from) {
    values.push(filters.from);
    conditions.push(`e.event_date >= $${values.length}`);
  }

  if (filters.toExclusive) {
    values.push(filters.toExclusive);
    conditions.push(`e.event_date < $${values.length}`);
  }

  const result = await pool.query(
    `SELECT ${publicEventColumns}
     FROM public.events e
     WHERE ${conditions.join('\n       AND ')}
     ORDER BY e.event_date ASC`,
    values,
  );

  return result.rows;
};

const getEventsByOrganizerId = async (organizerId) => {
  const result = await pool.query(
    `SELECT e.id,
            e.organizer_id AS "organizerId",
            e.title,
            e.description,
            e.location,
            e.category,
            e.event_date AS "eventDate",
            e.status,
            e.approval_status AS "approvalStatus",
            e.approved_by AS "approvedBy",
            e.approved_at AS "approvedAt",
            e.rejection_reason AS "rejectionReason",
            COUNT(tt.id)::int AS "ticketTypeCount",
            COALESCE(SUM(tt.quantity), 0)::int AS "remainingTickets"
     FROM public.events e
     LEFT JOIN public.ticket_types tt ON tt.event_id = e.id
     WHERE e.organizer_id = $1
     GROUP BY e.id
     ORDER BY e.event_date ASC`,
    [organizerId],
  );

  return result.rows;
};

const getEventById = async (id, queryable = pool) => {
  const result = await queryable.query(
    `SELECT ${managedEventColumns}
     FROM public.events e
     WHERE e.id = $1`,
    [id],
  );

  return result.rows[0];
};

const getPublicEventById = async (id) => {
  const result = await pool.query(
    `SELECT ${publicEventColumns}
     FROM public.events e
     WHERE e.id = $1
       AND e.status = 'active'
       AND e.approval_status = 'approved'
       AND e.event_date > CURRENT_TIMESTAMP`,
    [id],
  );

  return result.rows[0];
};

const createEvent = async (event) => {
  const {
    organizerId,
    title,
    description,
    location,
    category,
    eventDate,
    status,
  } = event;

  const result = await pool.query(
    `INSERT INTO public.events
      (organizer_id, title, description, location, category, event_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id,
               organizer_id AS "organizerId",
               title,
               description,
               location,
               category,
               event_date AS "eventDate",
               status,
               approval_status AS "approvalStatus",
               approved_by AS "approvedBy",
               approved_at AS "approvedAt",
               rejection_reason AS "rejectionReason"`,
    [organizerId, title, description, location, category, eventDate, status],
  );

  return result.rows[0];
};

const updateEvent = async (id, event) => {
  const {
    title,
    description,
    location,
    category,
    eventDate,
    status,
  } = event;

  const result = await pool.query(
    `UPDATE public.events
     SET title = $1,
         description = $2,
         location = $3,
         category = $4,
         event_date = $5,
         status = $6,
         approval_status = 'pending',
         approved_by = NULL,
         approved_at = NULL,
         rejection_reason = NULL
     WHERE id = $7
     RETURNING id,
               organizer_id AS "organizerId",
               title,
               description,
               location,
               category,
               event_date AS "eventDate",
               status,
               approval_status AS "approvalStatus",
               approved_by AS "approvedBy",
               approved_at AS "approvedAt",
               rejection_reason AS "rejectionReason"`,
    [title, description, location, category, eventDate, status, id],
  );

  return result.rows[0];
};

const resetApproval = async (eventIds, queryable = pool) => {
  const uniqueEventIds = [...new Set(eventIds)];

  if (uniqueEventIds.length === 0) {
    return;
  }

  await queryable.query(
    `UPDATE public.events
     SET approval_status = 'pending',
         approved_by = NULL,
         approved_at = NULL,
         rejection_reason = NULL
     WHERE id = ANY($1::int[])`,
    [uniqueEventIds],
  );
};

const deleteEvent = async (id) => {
  const result = await pool.query(
    `DELETE FROM public.events
     WHERE id = $1
     RETURNING id,
               organizer_id AS "organizerId",
               title,
               description,
               location,
               category,
               event_date AS "eventDate",
               status,
               approval_status AS "approvalStatus",
               approved_by AS "approvedBy",
               approved_at AS "approvedAt",
               rejection_reason AS "rejectionReason"`,
    [id],
  );

  return result.rows[0];
};

export {
  createEvent,
  deleteEvent,
  getEventById,
  getEventsByOrganizerId,
  getPublicEventById,
  getPublicEvents,
  resetApproval,
  updateEvent,
};
