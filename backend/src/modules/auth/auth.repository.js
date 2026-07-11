const { pool } = require('../../lib/database');

/**
 * Busca un usuario por su nombre de usuario.
 */
async function findUserByUsername(username) {
  const result = await pool.query('SELECT * FROM app_users WHERE username = $1', [username]);
  return result.rows[0];
}

/**
 * Busca el primer usuario que coincida con un rol específico.
 */
async function findUserByRole(role) {
  const result = await pool.query('SELECT * FROM app_users WHERE role = $1 LIMIT 1', [role]);
  return result.rows[0];
}

/**
 * Crea el usuario 'administrador' con rol 'admin'.
 */
async function createAdminUser(hashedPassword) {
  const query = `
    INSERT INTO app_users (username, password_hash, full_name, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, username, full_name, role, created_at;
  `;
  const values = [
    'administrador',
    hashedPassword,
    'Administrador del Gimnasio',
    'admin'
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
}


module.exports = {
  findUserByUsername,
  findUserByRole,
  createAdminUser,
};