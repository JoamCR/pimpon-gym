const { query } = require('../../lib/database');

/**
 * Obtiene todos los clientes con su plan y estado actual de suscripción.
 * Hace JOIN con plans y subscriptions.
 */
const findAll = async (filters = {}) => {
  let sql = `
    SELECT 
      c.*, 
      p.name as plan_name, 
      s.status as subscription_status, 
      s.end_date
    FROM clients c
    LEFT JOIN plans p ON c.plan_id = p.id
    LEFT JOIN subscriptions s ON c.id = s.client_id AND s.status = 'active'
    WHERE 1=1
  `;
  const params = [];
  let paramCount = 1;

  if (filters.status) {
    if (filters.status === 'active') {
      sql += ` AND s.status = 'active' AND s.end_date >= NOW()`;
    } else {
      sql += ` AND (s.status != 'active' OR s.end_date < NOW() OR s.status IS NULL)`;
    }
  }

  if (filters.client_type) {
    sql += ` AND c.client_type = $${paramCount}`;
    params.push(filters.client_type);
    paramCount++;
  }

  if (filters.search) {
    sql += ` AND (c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount} OR c.phone ILIKE $${paramCount})`;
    params.push(`%${filters.search}%`);
    paramCount++;
  }

  sql += ` ORDER BY c.created_at DESC`;
  
  const { rows } = await query(sql, params);
  return rows;
};

/**
 * Obtiene un cliente por su ID con su plan y suscripción activa.
 */
const findById = async (id) => {
  const sql = `
    SELECT 
      c.*, 
      p.name as plan_name, 
      s.status as subscription_status, 
      s.start_date, 
      s.end_date
    FROM clients c
    LEFT JOIN plans p ON c.plan_id = p.id
    LEFT JOIN subscriptions s ON c.id = s.client_id AND s.status = 'active'
    WHERE c.id = $1
  `;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
};

/**
 * Busca un cliente por teléfono o RFC, útil para validaciones de duplicidad.
 */
const findByPhoneOrRfc = async (phone, rfc, dbClient) => {
  const conditions = [];
  const params = [];
  let paramCount = 1;

  if (phone) {
    conditions.push(`phone = $${paramCount}`);
    params.push(phone);
    paramCount++;
  }

  if (rfc) {
    conditions.push(`rfc = $${paramCount}`);
    params.push(rfc);
    paramCount++;
  }

  if (conditions.length === 0) return null;

  const sql = `SELECT * FROM clients WHERE ${conditions.join(' OR ')} LIMIT 1`;
  const executor = dbClient || { query };
  const { rows } = await executor.query(sql, params);
  return rows[0] || null;
};

/**
 * Crea un cliente nuevo. Recibe opcionalmente un dbClient para transacciones.
 */
const create = async (data, dbClient) => {
  const sql = `
    INSERT INTO clients (
      id, first_name, last_name, birth_date, age, phone, plan_id, 
      email, rfc, gender, enrollment_date, enrollment_expires_at,
      coach_fitness_level, coach_health_notes, coach_goal, created_by
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    ) RETURNING *
  `;
  const params = [
    data.first_name, 
    data.last_name,
    data.birth_date || null,
    data.age, 
    data.phone, 
    data.plan_id,
    data.email || null,
    data.rfc || null,
    data.gender || null,
    data.enrollment_date || null,
    data.enrollment_expires_at || null,
    data.coach_fitness_level || null, 
    data.coach_health_notes || null, 
    data.coach_goal || null,
    data.created_by
  ];
  
  const executor = dbClient || { query };
  const { rows } = await executor.query(sql, params);
  return rows[0];
};

/**
 * Actualiza un cliente parcialmente.
 */
const update = async (id, data, dbClient) => {
  const fields = [];
  const params = [];
  let paramCount = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    }
  }

  if (fields.length === 0) return null;

  params.push(id);
  const sql = `UPDATE clients SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
  
  const executor = dbClient || { query };
  const { rows } = await executor.query(sql, params);
  return rows[0];
};

/**
 * Obtiene clientes cuya suscripción vence en exactamente X días.
 */
const findExpiring = async (days) => {
  const sql = `
    SELECT c.*, s.end_date
    FROM clients c
    JOIN subscriptions s ON c.id = s.client_id
    WHERE s.status = 'active' 
    AND s.end_date::date = (CURRENT_DATE + $1::integer)
  `;
  const { rows } = await query(sql, [days]);
  return rows;
};

/**
 * Obtiene clientes cuya suscripción vence exactamente hoy.
 */
const findExpiredToday = async () => {
  const sql = `
    SELECT c.*, s.end_date
    FROM clients c
    JOIN subscriptions s ON c.id = s.client_id
    WHERE s.status = 'active' 
    AND s.end_date::date = CURRENT_DATE
  `;
  const { rows } = await query(sql);
  return rows;
};

/**
 * Obtiene clientes inscritos sin asistencia este mes.
 */
const findWithoutAttendanceThisMonth = async () => {
  const sql = `
    SELECT c.*
    FROM clients c
    JOIN subscriptions s ON c.id = s.client_id
    WHERE s.status = 'active' AND s.end_date >= NOW()
    AND NOT EXISTS (
      SELECT 1 FROM attendance a 
      WHERE a.client_id = c.id 
      AND EXTRACT(MONTH FROM a.checked_in_at) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM a.checked_in_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    )
  `;
  const { rows } = await query(sql);
  return rows;
};

// -- Helpers para la lógica transaccional de Service --

const getPlanById = async (planId, dbClient) => {
  const sql = `SELECT * FROM plans WHERE id = $1`;
  const executor = dbClient || { query };
  const { rows } = await executor.query(sql, [planId]);
  return rows[0] || null;
};

const createSubscription = async (data, dbClient) => {
  const sql = `
    INSERT INTO subscriptions (id, client_id, plan_id, start_date, end_date, status)
    VALUES (gen_random_uuid(), $1, $2, CURRENT_DATE, CURRENT_DATE + $3::integer, 'active')
    RETURNING *
  `;
  const executor = dbClient || { query };
  const { rows } = await executor.query(sql, [data.client_id, data.plan_id, data.duration_days]);
  return rows[0];
};

const createPayment = async (data, dbClient) => {
  const sql = `
    INSERT INTO payments (id, client_id, subscription_id, amount, payment_method, payment_type, registered_by, paid_at)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
    RETURNING *
  `;
  const executor = dbClient || { query };
  const { rows } = await executor.query(sql, [
    data.client_id, data.subscription_id, data.amount, data.payment_method, data.payment_type, data.registered_by
  ]);
  return rows[0];
};

const updateTransferControl = async (amount, dbClient) => {
  const executor = dbClient || { query };
  
  const checkSql = `
    SELECT id, total_received 
    FROM transfer_control 
    WHERE EXTRACT(MONTH FROM month) = EXTRACT(MONTH FROM CURRENT_DATE) 
      AND EXTRACT(YEAR FROM month) = EXTRACT(YEAR FROM CURRENT_DATE)
  `;
  const checkRes = await executor.query(checkSql);
  
  if (checkRes.rows.length > 0) {
    const record = checkRes.rows[0];
    const newTotal = Number(record.total_received) + Number(amount);
    
    await executor.query(
      `UPDATE transfer_control SET total_received = $1, updated_at = NOW() WHERE id = $2`,
      [newTotal, record.id]
    );
    return { newTotal, limit: 30000 };
  } else {
    // Es el primer pago por transferencia del mes
    await executor.query(
      `INSERT INTO transfer_control (id, month, total_received, monthly_limit)
       VALUES (gen_random_uuid(), date_trunc('month', CURRENT_DATE), $1, 30000)`,
      [amount]
    );
    return { newTotal: amount, limit: 30000 };
  }
};

module.exports = {
  findAll,
  findById,
  findByPhoneOrRfc,
  create,
  update,
  findExpiring,
  findExpiredToday,
  findWithoutAttendanceThisMonth,
  getPlanById,
  createSubscription,
  createPayment,
  updateTransferControl
};
