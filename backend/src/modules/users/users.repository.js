const { pool } = require('../../lib/database');

async function findAllUsers() {
  const result = await pool.query(
    'SELECT id, username, full_name, role, allowed_pages, is_active, created_at FROM app_users ORDER BY created_at DESC'
  );
  return result.rows;
}

async function findUserById(id) {
  const result = await pool.query(
    'SELECT id, username, full_name, role, allowed_pages, is_active, created_at FROM app_users WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

async function findUserByUsername(username) {
  const result = await pool.query(
    'SELECT * FROM app_users WHERE username = $1',
    [username]
  );
  return result.rows[0];
}

async function createUser({ username, hashedPassword, full_name, role, allowed_pages }) {
  const query = `
    INSERT INTO app_users (username, password_hash, full_name, role, allowed_pages)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, username, full_name, role, allowed_pages, is_active, created_at;
  `;
  const values = [
    username,
    hashedPassword,
    full_name,
    role || 'receptionist',
    JSON.stringify(allowed_pages || [])
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function updateUser(id, fields) {
  const setClauses = [];
  const values = [];
  let paramCount = 1;

  if (fields.username !== undefined) {
    setClauses.push(`username = $${paramCount++}`);
    values.push(fields.username);
  }
  if (fields.password_hash !== undefined) {
    setClauses.push(`password_hash = $${paramCount++}`);
    values.push(fields.password_hash);
  }
  if (fields.full_name !== undefined) {
    setClauses.push(`full_name = $${paramCount++}`);
    values.push(fields.full_name);
  }
  if (fields.role !== undefined) {
    setClauses.push(`role = $${paramCount++}`);
    values.push(fields.role);
  }
  if (fields.allowed_pages !== undefined) {
    setClauses.push(`allowed_pages = $${paramCount++}`);
    values.push(JSON.stringify(fields.allowed_pages));
  }
  if (fields.is_active !== undefined) {
    setClauses.push(`is_active = $${paramCount++}`);
    values.push(fields.is_active);
  }

  if (setClauses.length === 0) {
    return findUserById(id);
  }

  values.push(id);
  const query = `
    UPDATE app_users
    SET ${setClauses.join(', ')}
    WHERE id = $${paramCount}
    RETURNING id, username, full_name, role, allowed_pages, is_active, created_at;
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
}

async function deleteUser(id) {
  const result = await pool.query(
    'DELETE FROM app_users WHERE id = $1 RETURNING id, username, full_name',
    [id]
  );
  return result.rows[0];
}

module.exports = {
  findAllUsers,
  findUserById,
  findUserByUsername,
  createUser,
  updateUser,
  deleteUser,
};
