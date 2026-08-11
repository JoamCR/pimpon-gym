const { query } = require('../../lib/database');

/**
 * Crea un egreso y lo audita.
 */
const create = async (data, createdBy) => {
  const sql = `
    INSERT INTO expenses (
      id, concept, amount, payment_method, notes, created_by, expense_date, created_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW()
    ) RETURNING *
  `;
  const params = [
    data.concept,
    data.amount,
    data.payment_method,
    data.notes || null,
    createdBy
  ];

  const { rows } = await query(sql, params);
  const expense = rows[0];

  // Audit log
  await query(`
    INSERT INTO audit_log (
      id, table_name, record_id, action, new_values, performed_by, performed_at
    ) VALUES (
      gen_random_uuid(), 'expenses', $1, 'INSERT', $2, $3, NOW()
    )
  `, [
    expense.id,
    JSON.stringify(expense),
    createdBy
  ]);

  return expense;
};

/**
 * Lista todos los egresos con filtro de fechas opcional.
 */
const findAll = async (from, to) => {
  let sql = `
    SELECT e.*, u.full_name as created_by_name
    FROM expenses e
    LEFT JOIN app_users u ON e.created_by = u.id
    WHERE 1=1
  `;
  const params = [];

  if (from) {
    params.push(from);
    sql += ` AND (e.expense_date AT TIME ZONE 'America/Mexico_City')::date >= $${params.length}::date`;
  }

  if (to) {
    params.push(to);
    sql += ` AND (e.expense_date AT TIME ZONE 'America/Mexico_City')::date <= $${params.length}::date`;
  }

  sql += ` ORDER BY e.expense_date DESC`;

  const { rows } = await query(sql, params);
  return rows;
};

/**
 * Obtiene un egreso por ID.
 */
const findById = async (id) => {
  const sql = `
    SELECT e.*, u.full_name as created_by_name
    FROM expenses e
    LEFT JOIN app_users u ON e.created_by = u.id
    WHERE e.id = $1
  `;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
};

/**
 * Actualiza un egreso y audita el cambio.
 */
const update = async (id, data, userId) => {
  // Obtener valores anteriores para auditoría
  const oldResult = await query(`SELECT * FROM expenses WHERE id = $1`, [id]);
  const oldExpense = oldResult.rows[0];
  if (!oldExpense) return null;

  const sql = `
    UPDATE expenses
    SET
      concept = COALESCE($1, concept),
      amount = COALESCE($2, amount),
      payment_method = COALESCE($3, payment_method),
      notes = COALESCE($4, notes)
    WHERE id = $5
    RETURNING *
  `;
  const params = [
    data.concept !== undefined ? data.concept : null,
    data.amount !== undefined ? data.amount : null,
    data.payment_method !== undefined ? data.payment_method : null,
    data.notes !== undefined ? data.notes : null,
    id
  ];

  const { rows } = await query(sql, params);
  const expense = rows[0];
  if (!expense) return null;

  // Audit log
  await query(`
    INSERT INTO audit_log (
      id, table_name, record_id, action, old_values, new_values, performed_by, performed_at
    ) VALUES (
      gen_random_uuid(), 'expenses', $1, 'UPDATE', $2, $3, $4, NOW()
    )
  `, [
    expense.id,
    JSON.stringify(oldExpense),
    JSON.stringify(expense),
    userId
  ]);

  return expense;
};

/**
 * Elimina un egreso permanentemente y audita la acción.
 */
const remove = async (id, userId) => {
  // Obtener valores para auditoría antes de eliminar
  const oldResult = await query(`SELECT * FROM expenses WHERE id = $1`, [id]);
  const oldExpense = oldResult.rows[0];
  if (!oldExpense) return null;

  await query(`DELETE FROM expenses WHERE id = $1`, [id]);

  // Audit log
  await query(`
    INSERT INTO audit_log (
      id, table_name, record_id, action, old_values, performed_by, performed_at
    ) VALUES (
      gen_random_uuid(), 'expenses', $1, 'DELETE', $2, $3, NOW()
    )
  `, [
    id,
    JSON.stringify(oldExpense),
    userId
  ]);

  return oldExpense;
};

module.exports = {
  create,
  findAll,
  findById,
  update,
  remove
};
