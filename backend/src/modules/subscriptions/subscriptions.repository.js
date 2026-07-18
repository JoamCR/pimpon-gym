const { pool } = require('../../lib/database');
const { createError } = require('../../lib/appError');

/**
 * Repository del módulo de suscripciones
 * REGLA: Todas las queries SQL van aquí, NUNCA en service.js
 */

/**
 * Obtiene clientes cuya suscripción vence entre hoy+1 y hoy+3 días
 */
const findExpiringIn3Days = async () => {
  const query = `
    SELECT * FROM (
      SELECT DISTINCT ON (c.id)
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        p.name as plan_name,
        s.end_date,
        s.status,
        EXTRACT(DAY FROM s.end_date::timestamp - CURRENT_DATE::timestamp) as days_left
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      JOIN plans p ON s.plan_id = p.id
      WHERE c.is_active = true AND p.is_visit_based = false
      ORDER BY c.id, s.end_date DESC
    ) latest_subs
    WHERE status = 'active'
      AND end_date::date > CURRENT_DATE
      AND end_date::date <= (CURRENT_DATE + INTERVAL '3 days')::date
    ORDER BY end_date ASC;
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error en findExpiringIn3Days:', err);
    // Devolvemos arreglo vacío para no romper el dashboard en producción
    return [];
  }
};

/**
 * Obtiene clientes cuya suscripción vence exactamente hoy
 */
const findExpiringToday = async () => {
  const query = `
    SELECT * FROM (
      SELECT DISTINCT ON (c.id)
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        p.name as plan_name,
        s.end_date,
        s.status,
        0 as days_left
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      JOIN plans p ON s.plan_id = p.id
      WHERE c.is_active = true AND p.is_visit_based = false
      ORDER BY c.id, s.end_date DESC
    ) latest_subs
    WHERE status = 'active'
      AND end_date::date = CURRENT_DATE
    ORDER BY end_date ASC;
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error en findExpiringToday:', err);
    return [];
  }
};

/**
 * Obtiene el control de transferencias del mes actual
 */
const getTransferControlCurrentMonth = async () => {
  const query = `
    SELECT 
      id,
      month,
      total_received,
      monthly_limit,
      updated_at
    FROM transfer_control
    WHERE DATE_TRUNC('month', month) = DATE_TRUNC('month', CURRENT_DATE)
    LIMIT 1;
  `;
  
  try {
    const result = await pool.query(query);
    
    // Si no existe registro para este mes, retornar defaults
    if (result.rows.length === 0) {
      return {
        id: null,
        total_received: 0,
        monthly_limit: parseInt(process.env.TRANSFER_MONTHLY_LIMIT || 30000),
        updated_at: null
      };
    }
    
    return result.rows[0];
  } catch (err) {
    console.error('Error en getTransferControlCurrentMonth:', err);
    return {
      id: null,
      total_received: 0,
      monthly_limit: parseInt(process.env.TRANSFER_MONTHLY_LIMIT || 30000),
      updated_at: null
    };
  }
};

/**
 * Cuenta de clientes con suscripción activa hoy
 */
const countActiveClients = async () => {
  const query = `
    SELECT COUNT(DISTINCT s.client_id) as count
    FROM subscriptions s
    JOIN clients c ON s.client_id = c.id
    JOIN plans p ON s.plan_id = p.id
    WHERE s.status = 'active'
      AND s.end_date >= CURRENT_DATE
      AND c.is_active = true
      AND p.is_visit_based = false;
  `;
  
  try {
    const result = await pool.query(query);
    return parseInt(result.rows[0].count, 10) || 0;
  } catch (err) {
    console.error('Error en countActiveClients:', err);
    return 0;
  }
};

/**
 * Obtiene las últimas 4 asistencias del día actual
 */
const getTodayAttendanceLastFour = async () => {
  const query = `
    SELECT 
      a.id,
      a.checked_in_at,
      a.checked_out_at,
      c.first_name,
      c.last_name,
      c.phone,
      a.method
    FROM attendance a
    JOIN clients c ON a.client_id = c.id
    WHERE a.checked_in_at::date = CURRENT_DATE
    ORDER BY a.checked_in_at DESC
    LIMIT 4;
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error en getTodayAttendanceLastFour:', err);
    return [];
  }
};

/**
 * Obtiene todos los clientes activos
 */
const findActiveClients = async () => {
  const query = `
    SELECT * FROM (
      SELECT DISTINCT ON (c.id)
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        p.name as plan_name,
        s.end_date,
        s.status
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      JOIN plans p ON s.plan_id = p.id
      WHERE c.is_active = true AND p.is_visit_based = false
      ORDER BY c.id, s.end_date DESC
    ) latest_subs
    WHERE status = 'active'
      AND end_date >= CURRENT_DATE
    ORDER BY end_date ASC;
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error en findActiveClients:', err);
    return [];
  }
};

/**
 * Obtiene los clientes con membresía vencida
 */
const findExpiredClients = async () => {
  const query = `
    SELECT * FROM (
      SELECT DISTINCT ON (c.id)
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        p.name as plan_name,
        s.end_date,
        s.status
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      JOIN plans p ON s.plan_id = p.id
      WHERE c.is_active = true AND p.is_visit_based = false
      ORDER BY c.id, s.end_date DESC
    ) latest_subs
    WHERE status = 'expired' OR (status = 'active' AND end_date < CURRENT_DATE)
    ORDER BY end_date DESC;
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error en findExpiredClients:', err);
    return [];
  }
};

/**
 * Cuenta total de asistencias del día
 */
const countTodayAttendance = async () => {
  const query = `
    SELECT COUNT(*) as count
    FROM attendance
    WHERE checked_in_at::date = CURRENT_DATE;
  `;
  
  try {
    const result = await pool.query(query);
    return parseInt(result.rows[0].count, 10) || 0;
  } catch (err) {
    console.error('Error en countTodayAttendance:', err);
    return 0;
  }
};

/**
 * Obtiene todas las asistencias del día actual
 */
const getTodayAttendanceAll = async () => {
  const query = `
    SELECT 
      a.id,
      a.checked_in_at,
      a.checked_out_at,
      c.first_name,
      c.last_name,
      c.phone,
      a.method
    FROM attendance a
    JOIN clients c ON a.client_id = c.id
    WHERE a.checked_in_at::date = CURRENT_DATE
    ORDER BY a.checked_in_at DESC;
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error en getTodayAttendanceAll:', err);
    return [];
  }
};

/**
 * Obtiene todos los clientes registrados
 */
const countTotalClients = async () => {
  const query = `
    SELECT 
      c.id, c.first_name, c.last_name, c.phone, c.email, p.name as plan_name
    FROM clients c
    LEFT JOIN plans p ON c.plan_id = p.id
    ORDER BY c.created_at DESC
  `;
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error en countTotalClients:', err);
    return [];
  }
};

/**
 * Obtiene los visitantes del día actual (pagos de tipo visit)
 */
const countTodayVisitors = async () => {
  const query = `
    SELECT 
      p.id, p.amount, p.paid_at, c.first_name, c.last_name, c.phone
    FROM payments p
    JOIN clients c ON p.client_id = c.id
    WHERE p.payment_type = 'visit' 
      AND p.paid_at::date = CURRENT_DATE
    ORDER BY p.paid_at DESC
  `;
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error en countTodayVisitors:', err);
    return [];
  }
};

/**
 * Obtiene las renovaciones del mes actual
 */
const countRenewalsThisMonth = async () => {
  const query = `
    SELECT 
      p.id, 
      p.amount, 
      p.paid_at, 
      c.first_name, 
      c.last_name, 
      c.phone,
      pl.name as plan_name,
      s.start_date,
      s.end_date
    FROM payments p
    JOIN clients c ON p.client_id = c.id
    LEFT JOIN subscriptions s ON s.id = COALESCE(p.subscription_id, (
      SELECT id FROM subscriptions WHERE client_id = c.id ORDER BY end_date DESC LIMIT 1
    ))
    LEFT JOIN plans pl ON pl.id = COALESCE(s.plan_id, c.plan_id)
    WHERE p.payment_type = 'monthly' 
      AND DATE_TRUNC('month', p.paid_at) = DATE_TRUNC('month', CURRENT_DATE)
    ORDER BY p.paid_at DESC
  `;
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error en countRenewalsThisMonth:', err);
    return [];
  }
};

/**
 * Obtiene las cancelaciones/expiraciones del mes actual
 */
const countCancellationsThisMonth = async () => {
  const query = `
    SELECT * FROM (
      SELECT DISTINCT ON (c.id)
        s.id,
        s.end_date,
        s.status,
        c.first_name,
        c.last_name,
        c.phone,
        p.name as plan_name,
        p.is_visit_based,
        c.is_active
      FROM subscriptions s
      JOIN clients c ON s.client_id = c.id
      JOIN plans p ON s.plan_id = p.id
      ORDER BY c.id, s.end_date DESC
    ) latest_subs
    WHERE is_active = true 
      AND is_visit_based = false
      AND (
        status = 'cancelled'
        OR (
          end_date < CURRENT_DATE
          AND DATE_TRUNC('month', end_date) = DATE_TRUNC('month', CURRENT_DATE)
        )
      )
    ORDER BY end_date DESC;
  `;
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error en countCancellationsThisMonth:', err);
    return [];
  }
};

/**
 * Obtiene los clientes nuevos registrados en el mes actual
 */
const countNewClientsThisMonth = async () => {
  const query = `
    SELECT 
      c.id, c.first_name, c.last_name, c.phone, c.email, p.name as plan_name, c.created_at
    FROM clients c
    LEFT JOIN plans p ON c.plan_id = p.id
    WHERE DATE_TRUNC('month', c.created_at) = DATE_TRUNC('month', CURRENT_DATE)
    ORDER BY c.created_at DESC
  `;
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error en countNewClientsThisMonth:', err);
    return [];
  }
};

/**
 * Obtiene los clientes con inscripción/anualidad vencida
 */
const findAnnualCancellations = async () => {
  const query = `
    SELECT 
      c.id, c.first_name, c.last_name, c.phone, c.email, c.enrollment_expires_at as end_date, p.name as plan_name
    FROM clients c
    JOIN plans p ON c.plan_id = p.id
    WHERE c.is_active = true
      AND p.requires_enrollment = true
      AND c.enrollment_expires_at IS NOT NULL
      AND c.enrollment_expires_at < CURRENT_DATE
    ORDER BY c.enrollment_expires_at DESC;
  `;
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error en findAnnualCancellations:', err);
    return [];
  }
};

/**
 * Obtiene los clientes cuyas anualidades vencen en los próximos 3 meses
 */
const findAnnualExpiringIn3Months = async () => {
  const query = `
    SELECT 
      c.id, c.first_name, c.last_name, c.phone, c.email, c.enrollment_expires_at as end_date, p.name as plan_name
    FROM clients c
    JOIN plans p ON c.plan_id = p.id
    WHERE c.is_active = true
      AND p.requires_enrollment = true
      AND c.enrollment_expires_at IS NOT NULL
      AND c.enrollment_expires_at >= CURRENT_DATE
      AND c.enrollment_expires_at <= (CURRENT_DATE + INTERVAL '3 months')::date
    ORDER BY c.enrollment_expires_at ASC;
  `;
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error en findAnnualExpiringIn3Months:', err);
    return [];
  }
};

module.exports = {
  findExpiringIn3Days,
  findExpiringToday,
  getTransferControlCurrentMonth,
  countActiveClients,
  findActiveClients,
  findExpiredClients,
  getTodayAttendanceLastFour,
  countTodayAttendance,
  getTodayAttendanceAll,
  countTotalClients,
  countTodayVisitors,
  countRenewalsThisMonth,
  countCancellationsThisMonth,
  countNewClientsThisMonth,
  findAnnualCancellations,
  findAnnualExpiringIn3Months,
};
