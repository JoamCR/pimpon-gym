const { query } = require('../../lib/database');

/**
 * Crea un pago y lo audita.
 */
const create = async (data, registeredBy, dbClient) => {
  const executor = dbClient || { query };
  
  // 1. Insertar el pago
  const sql = `
    INSERT INTO payments (
      id, client_id, patient_id, entity_type, subscription_id, amount, payment_method, 
      payment_type, registered_by, notes, paid_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
    ) RETURNING *
  `;
  const params = [
    data.client_id || null,
    data.patient_id || null,
    data.entity_type || 'gym',
    data.subscription_id || null,
    data.amount,
    data.payment_method,
    data.payment_type,
    registeredBy,
    data.notes || null
  ];
  
  const { rows } = await executor.query(sql, params);
  const payment = rows[0];

  // 2. Insertar en el log de auditoría automáticamente (Regla de negocio)
  await executor.query(`
    INSERT INTO audit_log (
      id, table_name, record_id, action, new_values, performed_by, performed_at
    ) VALUES (
      gen_random_uuid(), 'payments', $1, 'INSERT', $2, $3, NOW()
    )
  `, [
    payment.id,
    JSON.stringify(payment),
    registeredBy
  ]);

  return payment;
};

/**
 * Historial de pagos de un cliente
 */
const findByClient = async (clientId) => {
  const sql = `
    SELECT p.*, u.full_name as registered_by_name
    FROM payments p
    LEFT JOIN app_users u ON p.registered_by = u.id
    WHERE p.client_id = $1
    ORDER BY p.paid_at DESC
  `;
  const { rows } = await query(sql, [clientId]);
  return rows;
};

const findByPatient = async (patientId) => {
  const sql = `
    SELECT p.*, u.full_name as registered_by_name
    FROM payments p
    LEFT JOIN app_users u ON p.registered_by = u.id
    WHERE p.patient_id = $1
    ORDER BY p.paid_at DESC
  `;
  const { rows } = await query(sql, [patientId]);
  return rows;
};

/**
 * Suma de ingresos por método de pago para el mes dado
 */
const getMonthlyTotal = async (monthDate) => {
  const sql = `
    SELECT payment_method, SUM(amount) as total
    FROM payments
    WHERE EXTRACT(MONTH FROM paid_at) = EXTRACT(MONTH FROM $1::date)
      AND EXTRACT(YEAR FROM paid_at) = EXTRACT(YEAR FROM $1::date)
      AND is_voided = false
    GROUP BY payment_method
  `;
  const { rows } = await query(sql, [monthDate]);
  return rows;
};

/**
 * Obtiene el registro de transfer_control
 */
const getTransferControl = async (monthDate) => {
  const sql = `
    SELECT * 
    FROM transfer_control
    WHERE EXTRACT(MONTH FROM month) = EXTRACT(MONTH FROM $1::date)
      AND EXTRACT(YEAR FROM month) = EXTRACT(YEAR FROM $1::date)
  `;
  const { rows } = await query(sql, [monthDate]);
  return rows[0] || null;
};

/**
 * Actualiza (o crea) el total de transferencias en el mes
 */
const updateTransferControl = async (monthDate, amount, dbClient) => {
  const executor = dbClient || { query };
  
  const checkSql = `
    SELECT id, total_received 
    FROM transfer_control 
    WHERE EXTRACT(MONTH FROM month) = EXTRACT(MONTH FROM $1::date) 
      AND EXTRACT(YEAR FROM month) = EXTRACT(YEAR FROM $1::date)
  `;
  const checkRes = await executor.query(checkSql, [monthDate]);
  
  if (checkRes.rows.length > 0) {
    const record = checkRes.rows[0];
    const newTotal = Number(record.total_received) + Number(amount);
    
    await executor.query(
      `UPDATE transfer_control SET total_received = $1, updated_at = NOW() WHERE id = $2`,
      [newTotal, record.id]
    );
    return { newTotal, limit: 30000 };
  } else {
    await executor.query(
      `INSERT INTO transfer_control (id, month, total_received, monthly_limit)
       VALUES (gen_random_uuid(), date_trunc('month', $1::date), $2, 30000)`,
      [amount]
    );
    return { newTotal: amount, limit: 30000 };
  }
};

/**
 * Reporte de corte de caja entre fechas
 */
const getCashCutoff = async (from, to) => {
  const sql = `
    SELECT payment_method, payment_type, SUM(amount) as total, COUNT(id) as count
    FROM payments
    WHERE paid_at::date >= $1::date AND paid_at::date <= $2::date
      AND is_voided = false
    GROUP BY payment_method, payment_type
    ORDER BY payment_method, payment_type
  `;
  const { rows } = await query(sql, [from, to]);
  return rows;
};

module.exports = {
  create,
  findByClient,
  getMonthlyTotal,
  getTransferControl,
  updateTransferControl,
  getCashCutoff
};
