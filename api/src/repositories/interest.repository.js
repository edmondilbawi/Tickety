import pool from '../config/database.js';

const getVisibleInterestsByUserId = async (userId) => {
  const result = await pool.query(
    `SELECT e.id,
            e.organizer_id AS "organizerId",
            e.title,
            e.description,
            e.location,
            e.category,
            e.event_date AS "eventDate",
            e.status,
            i.id AS "interestId",
            i.created_at AS "interestCreatedAt"
     FROM public.event_interests i
     JOIN public.events e ON e.id = i.event_id
     WHERE i.user_id = $1
       AND e.status = 'active'
       AND e.approval_status = 'approved'
       AND e.event_date > CURRENT_TIMESTAMP
     ORDER BY i.created_at DESC, i.id DESC`,
    [userId],
  );

  return result.rows;
};

const addInterest = async (userId, eventId) => {
  const result = await pool.query(
    `INSERT INTO public.event_interests (user_id, event_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, event_id)
     DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING id,
               user_id AS "userId",
               event_id AS "eventId",
               created_at AS "createdAt"`,
    [userId, eventId],
  );

  return result.rows[0];
};

const deleteInterest = async (userId, eventId) => {
  await pool.query(
    `DELETE FROM public.event_interests
     WHERE user_id = $1
       AND event_id = $2`,
    [userId, eventId],
  );
};

export { addInterest, deleteInterest, getVisibleInterestsByUserId };
