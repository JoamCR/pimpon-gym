const { query } = require('../../lib/database');

const findAll = async () => {
  const sql = `
    SELECT a.*, c.first_name, c.last_name, c.phone
    FROM attendance a
    LEFT JOIN clients c ON a.client_id = c.id
    ORDER BY a.checked_in_at DESC
  `;
  const { rows } = await query(sql);
  return rows;
};

const findById = async (id) => {
  const sql = `SELECT * FROM attendance WHERE id = $1`;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
};

const findToday = async () => {
  const sql = `
    SELECT a.*, c.first_name, c.last_name, c.phone
    FROM attendance a
    LEFT JOIN clients c ON a.client_id = c.id
    WHERE a.checked_in_at::date = CURRENT_DATE
    ORDER BY a.checked_in_at DESC
  `;
  const { rows } = await query(sql);
  return rows;
};

const findByClient = async (clientId) => {
  const sql = `
    SELECT *
    FROM attendance
    WHERE client_id = $1
    ORDER BY checked_in_at DESC
  `;
  const { rows } = await query(sql, [clientId]);
  return rows;
};

const create = async (data) => {
  const sql = `
    INSERT INTO attendance (
      id, client_id, checked_in_at, checked_out_at, method, registered_by
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5
    ) RETURNING *
  `;
  const params = [
    data.client_id,
    data.checked_in_at || new Date(),
    data.checked_out_at || null,
    data.method,
    data.registered_by || null
  ];
  const { rows } = await query(sql, params);
  return rows[0];
};

const updateCheckout = async (id, checkedOutAt) => {
  const sql = `
    UPDATE attendance
    SET checked_out_at = $1
    WHERE id = $2
    RETURNING *
  `;
  const { rows } = await query(sql, [checkedOutAt || new Date(), id]);
  return rows[0];
};

module.exports = {
  findAll,
  findById,
  findToday,
  findByClient,
  create,
  updateCheckout
};
