const { pool } = require('../../lib/database');

/**
 * Busca un usuario por su email asegurando que esté activo.
 */
const getUserByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM app_users WHERE email = $1 AND is_active = true',
    [email]
  );
  return result.rows[0];
};

module.exports = { getUserByEmail };