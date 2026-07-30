const { query } = require('../../lib/database');

const findAll = async (filters = {}) => {
  let sql = `
    WITH all_records AS (
      SELECT 
        pat.id,
        pat.first_name,
        pat.last_name,
        pat.gender,
        pat.phone,
        pat.email,
        pat.age,
        pat.birth_date,
        pat.quick_weight_kg,
        pat.quick_height_cm,
        pat.quick_goal,
        pat.quick_health_notes,
        pat.quick_assessed_at,
        pat.initial_origin,
        pat.current_flow,
        pat.is_active,
        pat.created_at,
        'patient' as user_type,
        c.id as gym_client_id,
        c.plan_id as gym_plan_id,
        p.name as gym_plan_name,
        COALESCE(s.status, 'inactive') as gym_subscription_status,
        s.start_date as gym_subscription_start_date,
        s.end_date as gym_subscription_end_date,
        c.enrollment_date as gym_enrollment_date,
        c.enrollment_expires_at as gym_enrollment_expires_at
      FROM patients pat
      LEFT JOIN clients c ON (pat.client_id = c.id OR pat.id = c.patient_id OR (pat.phone IS NOT NULL AND pat.phone != '' AND pat.phone = c.phone))
      LEFT JOIN plans p ON c.plan_id = p.id
      LEFT JOIN subscriptions s ON c.id = s.client_id AND s.status = 'active'

      UNION ALL

      SELECT 
        c.id as id,
        c.first_name,
        c.last_name,
        c.gender,
        c.phone,
        c.email,
        c.age,
        c.birth_date,
        c.quick_weight_kg,
        c.quick_height_cm,
        c.quick_goal,
        c.quick_health_notes,
        c.quick_assessed_at,
        COALESCE(c.initial_origin, 'gimnasio') as initial_origin,
        COALESCE(c.current_flow, 'gimnasio') as current_flow,
        c.is_active,
        c.created_at,
        'client' as user_type,
        c.id as gym_client_id,
        c.plan_id as gym_plan_id,
        p.name as gym_plan_name,
        COALESCE(s.status, 'inactive') as gym_subscription_status,
        s.start_date as gym_subscription_start_date,
        s.end_date as gym_subscription_end_date,
        c.enrollment_date as gym_enrollment_date,
        c.enrollment_expires_at as gym_enrollment_expires_at
      FROM clients c
      LEFT JOIN plans p ON c.plan_id = p.id
      LEFT JOIN subscriptions s ON c.id = s.client_id AND s.status = 'active'
      WHERE c.patient_id IS NULL AND NOT EXISTS (
        SELECT 1 FROM patients p2 WHERE p2.client_id = c.id OR (c.phone IS NOT NULL AND c.phone != '' AND p2.phone = c.phone)
      )
    )
    SELECT * FROM all_records WHERE 1=1
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
  const sql = `
    WITH all_records AS (
      SELECT 
        pat.id,
        pat.first_name,
        pat.last_name,
        pat.gender,
        pat.phone,
        pat.email,
        pat.age,
        pat.birth_date,
        pat.quick_weight_kg,
        pat.quick_height_cm,
        pat.quick_goal,
        pat.quick_health_notes,
        pat.quick_assessed_at,
        pat.initial_origin,
        pat.current_flow,
        pat.is_active,
        pat.created_at,
        'patient' as user_type,
        c.id as gym_client_id,
        c.plan_id as gym_plan_id,
        p.name as gym_plan_name,
        COALESCE(s.status, 'inactive') as gym_subscription_status,
        s.start_date as gym_subscription_start_date,
        s.end_date as gym_subscription_end_date,
        c.enrollment_date as gym_enrollment_date,
        c.enrollment_expires_at as gym_enrollment_expires_at
      FROM patients pat
      LEFT JOIN clients c ON (pat.client_id = c.id OR pat.id = c.patient_id OR (pat.phone IS NOT NULL AND pat.phone != '' AND pat.phone = c.phone))
      LEFT JOIN plans p ON c.plan_id = p.id
      LEFT JOIN subscriptions s ON c.id = s.client_id AND s.status = 'active'

      UNION ALL

      SELECT 
        c.id as id,
        c.first_name,
        c.last_name,
        c.gender,
        c.phone,
        c.email,
        c.age,
        c.birth_date,
        c.quick_weight_kg,
        c.quick_height_cm,
        c.quick_goal,
        c.quick_health_notes,
        c.quick_assessed_at,
        COALESCE(c.initial_origin, 'gimnasio') as initial_origin,
        COALESCE(c.current_flow, 'gimnasio') as current_flow,
        c.is_active,
        c.created_at,
        'client' as user_type,
        c.id as gym_client_id,
        c.plan_id as gym_plan_id,
        p.name as gym_plan_name,
        COALESCE(s.status, 'inactive') as gym_subscription_status,
        s.start_date as gym_subscription_start_date,
        s.end_date as gym_subscription_end_date,
        c.enrollment_date as gym_enrollment_date,
        c.enrollment_expires_at as gym_enrollment_expires_at
      FROM clients c
      LEFT JOIN plans p ON c.plan_id = p.id
      LEFT JOIN subscriptions s ON c.id = s.client_id AND s.status = 'active'
    )
    SELECT * FROM all_records WHERE id = $1 LIMIT 1
  `;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
};

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

  const sql = `SELECT * FROM patients WHERE ${conditions.join(' OR ')} LIMIT 1`;
  const executor = dbClient || { query };
  const { rows } = await executor.query(sql, params);
  return rows[0] || null;
};

const create = async (data, dbClient) => {
  const sql = `
    INSERT INTO patients (
      id, first_name, last_name, birth_date, rfc, age, gender, phone, email,
      occupation, referred_by, is_active, notes,
      quick_weight_kg, quick_height_cm, quick_goal, quick_health_notes, quick_assessed_at,
      client_id, initial_origin, current_flow,
      created_by, created_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14, $15, $16, $17,
      $18, $19, $20,
      $21, NOW()
    ) RETURNING *
  `;
  const params = [
    data.first_name,
    data.last_name,
    data.birth_date || null,
    data.rfc || null,
    data.age || null,
    data.gender || null,
    data.phone || null,
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
    data.client_id || null,
    data.initial_origin || 'nutricion',
    data.current_flow || 'nutricion',
    data.created_by || null
  ];

  const executor = dbClient || { query };
  const { rows } = await executor.query(sql, params);
  return rows[0];
};

const update = async (id, data, dbClient) => {
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
  const executor = dbClient || { query };
  const { rows } = await executor.query(sql, params);
  return rows[0];
};

module.exports = {
  findAll,
  findById,
  findByPhoneOrRfc,
  create,
  update
};
