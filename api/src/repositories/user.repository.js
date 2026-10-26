import pool from '../config/database.js';

const safeUserColumns = `
  id,
  first_name AS "firstName",
  last_name AS "lastName",
  email,
  role,
  created_at AS "createdAt"
`;

const getUserById = async (id) => {
  const result = await pool.query(
    `SELECT ${safeUserColumns}
     FROM public.users
     WHERE id = $1`,
    [id],
  );

  return result.rows[0];
};

const getUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT ${safeUserColumns}, password
     FROM public.users
     WHERE LOWER(email) = $1`,
    [email],
  );

  return result.rows[0];
};

const createUser = async (user) => {
  const { firstName, lastName, email, passwordHash, role } = user;

  const result = await pool.query(
    `INSERT INTO public.users
      (first_name, last_name, email, password, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${safeUserColumns}`,
    [firstName, lastName, email, passwordHash, role],
  );

  return result.rows[0];
};

const getOrganizers = async () => {
  const result = await pool.query(
    `SELECT u.id,
            u.first_name AS "firstName",
            u.last_name AS "lastName",
            u.email,
            u.created_at AS "createdAt",
            COUNT(e.id)::int AS "eventCount"
     FROM public.users u
     LEFT JOIN public.events e ON e.organizer_id = u.id
     WHERE u.role = 'organizer'
     GROUP BY u.id
     ORDER BY u.created_at DESC, u.id DESC`,
  );

  return result.rows;
};

const updateUserRole = async (id, role) => {
  const result = await pool.query(
    `UPDATE public.users
     SET role = $1
     WHERE id = $2
     RETURNING ${safeUserColumns}`,
    [role, id],
  );

  return result.rows[0];
};

const updateUserPassword = async (id, passwordHash) => {
  const result = await pool.query(
    `UPDATE public.users
     SET password = $1
     WHERE id = $2
     RETURNING ${safeUserColumns}`,
    [passwordHash, id],
  );

  return result.rows[0];
};

export {
  createUser,
  getOrganizers,
  getUserByEmail,
  getUserById,
  updateUserPassword,
  updateUserRole,
};
