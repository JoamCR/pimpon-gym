const { query } = require('../../lib/database');

const findAll = async (filters = {}) => {
  let sql = `
    SELECT *
    FROM patients
    WHERE 1=1
  `;
  const params = [];
  let index = 1;

  if (filters.status) {
    sql += ` AND is_active = $${index}`;
    params.push(filters.status === 'active');
    index++;
  }

  if (filters.search) {
    sql += ` AND (first_name ILIKE $${index} OR last_name ILIKE $${index} OR phone ILIKE $${index} OR email ILIKE $${index})`;
    params.push(`%${filters.search}%`);
    index++;
  }

  sql += ` ORDER BY created_at DESC`;
  const { rows } = await query(sql, params);
  return rows;
};

const findById = async (id) => {
  const sql = `SELECT * FROM patients WHERE id = $1`;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
};

const create = async (data) => {
  const sql = `
    INSERT INTO patients (
      id, first_name, last_name, rfc, age, phone, email,
      occupation, referred_by, is_active, notes,
      quick_weight_kg, quick_height_cm, quick_goal, quick_health_notes, quick_assessed_at,
      created_by, created_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13, $14,
      $15, $16, NOW()
    ) RETURNING *
  `;
  const params = [
    data.first_name,
    data.last_name,
    data.rfc || null,
    data.age,
    data.phone,
    data.email || null,
    data.occupation || null,
    data.referred_by || null,
    data.is_active !== false,
    data.notes || null,
    data.quick_weight_kg || null,
    data.quick_height_cm || null,
    data.quick_goal || null,
    data.quick_health_notes || null,
    data.quick_assessed_at || null,
    data.created_by || null
  ];

  const { rows } = await query(sql, params);
  return rows[0];
};

const update = async (id, data) => {
  const updates = [];
  const params = [];
  let index = 1;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = $${index}`);
      params.push(value);
      index++;
    }
  });

  if (updates.length === 0) return null;

  params.push(id);
  const sql = `UPDATE patients SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`;
  const { rows } = await query(sql, params);
  return rows[0];
};

module.exports = {
  findAll,
  findById,
  create,
  update
};
