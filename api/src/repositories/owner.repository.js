import pool from '../config/database.js';

const getEventsByApprovalStatus = async (approvalStatus) => {
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
            u.first_name AS "organizerFirstName",
            u.last_name AS "organizerLastName",
            u.email AS "organizerEmail",
            COALESCE(
              json_agg(
                json_build_object(
                  'id', tt.id,
                  'name', tt.name,
                  'price', tt.price::float,
                  'quantity', tt.quantity
                ) ORDER BY tt.id
              ) FILTER (WHERE tt.id IS NOT NULL),
              '[]'::json
            ) AS "ticketTypes"
     FROM public.events e
     JOIN public.users u ON u.id = e.organizer_id
     LEFT JOIN public.ticket_types tt ON tt.event_id = e.id
     WHERE e.approval_status = $1
     GROUP BY e.id, u.id
     ORDER BY e.event_date ASC, e.id ASC`,
    [approvalStatus],
  );

  return result.rows;
};

const approveEvent = async (eventId, ownerId) => {
  const result = await pool.query(
    `WITH updated_event AS (
       UPDATE public.events
       SET approval_status = 'approved',
           approved_by = $1,
           approved_at = CURRENT_TIMESTAMP,
           rejection_reason = NULL
       WHERE id = $2
       RETURNING id,
                 organizer_id,
                 title,
                 status,
                 approval_status,
                 approved_by,
                 approved_at,
                 rejection_reason
     )
     SELECT e.id,
            e.organizer_id AS "organizerId",
            e.title,
            e.status,
            e.approval_status AS "approvalStatus",
            e.approved_by AS "approvedBy",
            e.approved_at AS "approvedAt",
            e.rejection_reason AS "rejectionReason",
            u.first_name AS "organizerFirstName",
            u.email AS "organizerEmail"
     FROM updated_event e
     JOIN public.users u ON u.id = e.organizer_id`,
    [ownerId, eventId],
  );

  return result.rows[0];
};

const rejectEvent = async (eventId, reason) => {
  const result = await pool.query(
    `WITH updated_event AS (
       UPDATE public.events
       SET approval_status = 'rejected',
           approved_by = NULL,
           approved_at = NULL,
           rejection_reason = $1
       WHERE id = $2
       RETURNING id,
                 organizer_id,
                 title,
                 status,
                 approval_status,
                 approved_by,
                 approved_at,
                 rejection_reason
     )
     SELECT e.id,
            e.organizer_id AS "organizerId",
            e.title,
            e.status,
            e.approval_status AS "approvalStatus",
            e.approved_by AS "approvedBy",
            e.approved_at AS "approvedAt",
            e.rejection_reason AS "rejectionReason",
            u.first_name AS "organizerFirstName",
            u.email AS "organizerEmail"
     FROM updated_event e
     JOIN public.users u ON u.id = e.organizer_id`,
    [reason, eventId],
  );

  return result.rows[0];
};

export { approveEvent, getEventsByApprovalStatus, rejectEvent };
