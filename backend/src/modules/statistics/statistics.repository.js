const { pool } = require('../../lib/database');
const { createError } = require('../../lib/appError');

/**
 * 1. getMonthlyIncome(year): ingresos por mes agrupados por método de pago
 */
const getMonthlyIncome = async (year) => {
  const sql = `
    SELECT 
      EXTRACT(MONTH FROM paid_at) as month, 
      payment_method, 
      SUM(amount) as total 
    FROM payments 
    WHERE EXTRACT(YEAR FROM paid_at) = $1 
      AND is_voided = false 
    GROUP BY month, payment_method
    ORDER BY month ASC
  `;
  try {
    const result = await pool.query(sql, [year]);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo ingresos mensuales');
  }
};

/**
 * 2. getActiveClientsReal(): clientes con subscription activa HOY (no histórico)
 */
const getActiveClientsReal = async () => {
  const sql = `
    SELECT COUNT(DISTINCT c.id) as active_count
    FROM clients c
    JOIN subscriptions s ON c.id = s.client_id
    WHERE s.status = 'active' 
      AND s.end_date >= CURRENT_DATE
  `;
  try {
    const result = await pool.query(sql);
    return result.rows[0].active_count;
  } catch (err) {
    throw createError(500, 'Error obteniendo clientes activos');
  }
};

/**
 * 3. getClientsByPlan(): distribución de clientes por plan, con conteo
 */
const getClientsByPlan = async () => {
  const sql = `
    SELECT 
      p.id, 
      p.name, 
      COUNT(DISTINCT c.id) as client_count
    FROM plans p
    LEFT JOIN clients c ON c.plan_id = p.id 
    LEFT JOIN subscriptions s ON c.id = s.client_id 
      AND s.status = 'active' 
      AND s.end_date >= CURRENT_DATE
    GROUP BY p.id, p.name
    ORDER BY client_count DESC
  `;
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo clientes por plan');
  }
};

/**
 * 4. getExpiredClients(): lista de clientes con suscripción vencida sin renovar
 */
const getExpiredClients = async () => {
  const sql = `
    WITH LastSubs AS (
      SELECT client_id, MAX(end_date) as last_end_date
      FROM subscriptions
      GROUP BY client_id
    )
    SELECT 
      c.id, c.first_name, c.last_name, c.phone, p.name as plan_name, ls.last_end_date
    FROM clients c
    JOIN plans p ON c.plan_id = p.id
    JOIN LastSubs ls ON c.id = ls.client_id
    WHERE ls.last_end_date < CURRENT_DATE
  `;
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo clientes con suscripción vencida');
  }
};

/**
 * 5. getEnrollmentCutoff(month, year): inscripciones anuales del mes dado
 */
const getEnrollmentCutoff = async (month, year) => {
  const sql = `
    SELECT 
      p.id, p.amount, p.paid_at, c.first_name, c.last_name
    FROM payments p
    JOIN clients c ON p.client_id = c.id
    WHERE p.payment_type = 'enrollment' 
      AND EXTRACT(MONTH FROM p.paid_at) = $1
      AND EXTRACT(YEAR FROM p.paid_at) = $2
      AND p.is_voided = false
  `;
  try {
    const result = await pool.query(sql, [month, year]);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo inscripciones del mes');
  }
};

/**
 * 6. getClientsWithoutAttendance(month, year): clientes con inscripción activa
 *    que no tienen ningún registro en attendance en el mes dado
 */
const getClientsWithoutAttendance = async (month, year) => {
  const sql = `
    SELECT 
      c.id, c.first_name, c.last_name, c.phone, p.name as plan_name,
      (SELECT MAX(checked_in_at) FROM attendance a2 WHERE a2.client_id = c.id) as last_attendance
    FROM clients c
    JOIN plans p ON c.plan_id = p.id
    JOIN subscriptions s ON c.id = s.client_id
    WHERE s.status = 'active' 
      AND s.end_date >= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 
        FROM attendance a 
        WHERE a.client_id = c.id 
          AND EXTRACT(MONTH FROM a.checked_in_at) = $1
          AND EXTRACT(YEAR FROM a.checked_in_at) = $2
      )
  `;
  try {
    const result = await pool.query(sql, [month, year]);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo inasistencias');
  }
};

/**
 * 7. getConsistentClients(minMonths): clientes con consecutive_months >= minMonths
 */
const getConsistentClients = async (minMonths) => {
  const sql = `
    SELECT 
      c.id, c.first_name, c.last_name, c.phone, c.consecutive_months, p.name as plan_name
    FROM clients c
    JOIN plans p ON c.plan_id = p.id
    JOIN subscriptions s ON c.id = s.client_id
    WHERE c.consecutive_months >= $1
      AND s.status = 'active'
      AND s.end_date >= CURRENT_DATE
  `;
  try {
    const result = await pool.query(sql, [minMonths]);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo clientes consistentes');
  }
};

/**
 * 8. getCashCutoffHistory(from, to): cortes de caja agrupados por fecha
 */
const getCashCutoffHistory = async (fromDate, toDate) => {
  const sql = `
    SELECT 
      paid_at::date as cutoff_date, 
      payment_method, 
      SUM(amount) as total,
      COUNT(id) as transaction_count
    FROM payments 
    WHERE paid_at >= $1::timestamp 
      AND paid_at < ($2::timestamp + interval '1 day')
      AND is_voided = false 
    GROUP BY cutoff_date, payment_method
    ORDER BY cutoff_date DESC
  `;
  try {
    const result = await pool.query(sql, [fromDate, toDate]);
    return result.rows;
  } catch (err) {
    throw createError(500, 'Error obteniendo historial de cortes de caja');
  }
};

module.exports = {
  getMonthlyIncome,
  getActiveClientsReal,
  getClientsByPlan,
  getExpiredClients,
  getEnrollmentCutoff,
  getClientsWithoutAttendance,
  getConsistentClients,
  getCashCutoffHistory
};
