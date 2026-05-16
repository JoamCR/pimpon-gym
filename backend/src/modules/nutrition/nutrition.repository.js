const { pool } = require('../../lib/database');
const { createError } = require('../../lib/appError');

/**
 * Repository del módulo de nutriología
 * REGLA: Todas las queries SQL van aquí, NUNCA en service.js
 */

/**
 * Obtiene la cola de pacientes con plan que incluye nutriología
 * Registrados como clientes, ordenados por fecha de creación
 */
const getQueue = async () => {
  const sql = `
    SELECT 
      c.id,
      c.first_name,
      c.last_name,
      c.phone,
      c.email,
      c.first_consult_used,
      p.name as plan_name,
      p.includes_nutrition,
      s.status,
      s.end_date
    FROM clients c
    JOIN plans p ON c.plan_id = p.id
    LEFT JOIN subscriptions s ON c.id = s.client_id AND s.status = 'active'
    WHERE p.includes_nutrition = true
      AND c.is_active = true
    ORDER BY c.created_at ASC
  `;
  
  try {
    const result = await pool.query(sql);
    return result.rows;
  } catch (err) {
    console.error('Error en getQueue:', err.message);
    throw createError(500, 'Error al obtener la cola de pacientes');
  }
};

/**
 * Obtiene todos los registros de evaluación de un cliente
 */
const findRecordsByClient = async (clientId) => {
  const sql = `
    SELECT 
      nr.*,
      COALESCE(c.first_name, p.first_name) AS first_name,
      COALESCE(c.last_name, p.last_name) AS last_name,
      u.full_name as created_by_name
    FROM nutrition_records nr
    LEFT JOIN clients c ON nr.client_id = c.id
    LEFT JOIN patients p ON nr.patient_id = p.id
    LEFT JOIN app_users u ON nr.created_by = u.id
    WHERE nr.client_id = $1 OR nr.patient_id = $1
    ORDER BY nr.evaluation_date DESC
  `;
  
  try {
    const result = await pool.query(sql, [clientId]);
    return result.rows;
  } catch (err) {
    console.error('Error en findRecordsByClient:', err.message);
    throw createError(500, 'Error al obtener registros de evaluación');
  }
};

/**
 * Crea un registro de evaluación nutricional
 * Si is_free_consult=true, marca first_consult_used=true en clients
 */
const createRecord = async (data, nutritionistId, dbClient) => {
  const executor = dbClient || { query: pool.query.bind(pool) };
  
  const sql = `
    INSERT INTO nutrition_records (
      id, client_id, patient_id, entity_type, evaluation_date, weight_kg, height_cm,
      body_fat_pct, visceral_fat_pct, muscle_mass_kg, waist_cm,
      family_history, pathological_history, personal_history,
      body_composition_notes, is_free_consult,
      diet_plan, caloric_target, protein_target_g, carbs_target_g, fat_target_g,
      created_by, created_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, CURRENT_DATE, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW()
    ) RETURNING *
  `;
  
  const params = [
    data.client_id || null,
    data.patient_id || null,
    data.entity_type || 'gym',
    data.weight_kg,
    data.height_cm,
    data.body_fat_pct,
    data.visceral_fat_pct,
    data.muscle_mass_kg,
    data.waist_cm,
    data.family_history || null,
    data.pathological_history || null,
    data.personal_history || null,
    data.body_composition_notes || null,
    data.is_free_consult || false,
    data.diet_plan || null,
    data.caloric_target || null,
    data.protein_target_g || null,
    data.carbs_target_g || null,
    data.fat_target_g || null,
    nutritionistId
  ];
  
  try {
    const result = await executor.query(sql, params);
    const record = result.rows[0];
    
    // Si es primera consulta gratis, marcar en clients
    if (data.is_free_consult) {
      await executor.query(
        'UPDATE clients SET first_consult_used = true WHERE id = $1',
        [data.client_id]
      );
    }
    
    return record;
  } catch (err) {
    console.error('Error en createRecord:', err.message);
    throw createError(500, 'Error al crear registro de evaluación');
  }
};

/**
 * Actualiza un registro de evaluación
 */
const updateRecord = async (recordId, data, dbClient) => {
  const executor = dbClient || { query: pool.query.bind(pool) };
  
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  // Construir dinámicamente el UPDATE
  if (data.weight_kg !== undefined) {
    updates.push(`weight_kg = $${paramIndex++}`);
    values.push(data.weight_kg);
  }
  if (data.height_cm !== undefined) {
    updates.push(`height_cm = $${paramIndex++}`);
    values.push(data.height_cm);
  }
  if (data.body_fat_pct !== undefined) {
    updates.push(`body_fat_pct = $${paramIndex++}`);
    values.push(data.body_fat_pct);
  }
  if (data.visceral_fat_pct !== undefined) {
    updates.push(`visceral_fat_pct = $${paramIndex++}`);
    values.push(data.visceral_fat_pct);
  }
  if (data.muscle_mass_kg !== undefined) {
    updates.push(`muscle_mass_kg = $${paramIndex++}`);
    values.push(data.muscle_mass_kg);
  }
  if (data.waist_cm !== undefined) {
    updates.push(`waist_cm = $${paramIndex++}`);
    values.push(data.waist_cm);
  }
  if (data.family_history !== undefined) {
    updates.push(`family_history = $${paramIndex++}`);
    values.push(data.family_history);
  }
  if (data.pathological_history !== undefined) {
    updates.push(`pathological_history = $${paramIndex++}`);
    values.push(data.pathological_history);
  }
  if (data.personal_history !== undefined) {
    updates.push(`personal_history = $${paramIndex++}`);
    values.push(data.personal_history);
  }
  if (data.body_composition_notes !== undefined) {
    updates.push(`body_composition_notes = $${paramIndex++}`);
    values.push(data.body_composition_notes);
  }
  if (data.diet_plan !== undefined) {
    updates.push(`diet_plan = $${paramIndex++}`);
    values.push(data.diet_plan);
  }
  if (data.caloric_target !== undefined) {
    updates.push(`caloric_target = $${paramIndex++}`);
    values.push(data.caloric_target);
  }
  if (data.protein_target_g !== undefined) {
    updates.push(`protein_target_g = $${paramIndex++}`);
    values.push(data.protein_target_g);
  }
  if (data.carbs_target_g !== undefined) {
    updates.push(`carbs_target_g = $${paramIndex++}`);
    values.push(data.carbs_target_g);
  }
  if (data.fat_target_g !== undefined) {
    updates.push(`fat_target_g = $${paramIndex++}`);
    values.push(data.fat_target_g);
  }
  
  if (updates.length === 0) {
    throw createError(400, 'No hay datos para actualizar');
  }
  
  values.push(recordId);
  const sql = `UPDATE nutrition_records SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  
  try {
    const result = await executor.query(sql, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error en updateRecord:', err.message);
    throw createError(500, 'Error al actualizar registro de evaluación');
  }
};

/**
 * Obtiene un plan de ejercicio por ID
 */
const getExercisePlan = async (planId) => {
  const sql = `
    SELECT 
      ep.*,
      COALESCE(c.first_name, p.first_name) AS first_name,
      COALESCE(c.last_name, p.last_name) AS last_name
    FROM exercise_plans ep
    LEFT JOIN clients c ON ep.client_id = c.id
    LEFT JOIN patients p ON ep.patient_id = p.id
    WHERE ep.id = $1
  `;
  
  try {
    const result = await pool.query(sql, [planId]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error en getExercisePlan:', err.message);
    throw createError(500, 'Error al obtener plan de ejercicio');
  }
};

/**
 * Obtiene planes de ejercicio de un cliente
 */
const getExercisePlansByClient = async (clientId) => {
  const sql = `
    SELECT *
    FROM exercise_plans
    WHERE client_id = $1 OR patient_id = $1
    ORDER BY month_year DESC
  `;
  
  try {
    const result = await pool.query(sql, [clientId]);
    return result.rows;
  } catch (err) {
    console.error('Error en getExercisePlansByClient:', err.message);
    throw createError(500, 'Error al obtener planes de ejercicio');
  }
};

/**
 * Crea un plan de ejercicio
 */
const createExercisePlan = async (data, nutritionistId, dbClient) => {
  const executor = dbClient || { query: pool.query.bind(pool) };
  
  const sql = `
    INSERT INTO exercise_plans (
      id, client_id, patient_id, entity_type, nutrition_record_id, month_year, 
      content, created_by, created_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW()
    ) RETURNING *
  `;
  
  const params = [
    data.client_id || null,
    data.patient_id || null,
    data.entity_type || 'gym',
    data.nutrition_record_id,
    data.month_year,
    JSON.stringify(data.content || {}),
    nutritionistId
  ];
  
  try {
    const result = await executor.query(sql, params);
    return result.rows[0];
  } catch (err) {
    console.error('Error en createExercisePlan:', err.message);
    throw createError(500, 'Error al crear plan de ejercicio');
  }
};

/**
 * Actualiza un plan de ejercicio
 */
const updateExercisePlan = async (planId, data, dbClient) => {
  const executor = dbClient || { query: pool.query.bind(pool) };
  
  const updates = [];
  const values = [];
  let paramIndex = 1;
  
  if (data.content !== undefined) {
    updates.push(`content = $${paramIndex++}`);
    values.push(JSON.stringify(data.content));
  }
  if (data.month_year !== undefined) {
    updates.push(`month_year = $${paramIndex++}`);
    values.push(data.month_year);
  }
  
  if (updates.length === 0) {
    throw createError(400, 'No hay datos para actualizar');
  }
  
  values.push(planId);
  const sql = `UPDATE exercise_plans SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  
  try {
    const result = await executor.query(sql, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error en updateExercisePlan:', err.message);
    throw createError(500, 'Error al actualizar plan de ejercicio');
  }
};

/**
 * Verifica si existe pago de consulta nutricional para un cliente en una fecha
 */
const findNutritionPaymentOnDate = async (entityData, date, dbClient) => {
  const executor = dbClient || { query: pool.query.bind(pool) };
  const isGym = entityData.entity_type === 'gym';
  const sql = `
    SELECT *
    FROM payments
    WHERE payment_type = 'nutrition_consult'
      AND paid_at::date = $2::date
      AND ${isGym ? 'client_id' : 'patient_id'} = $1
    LIMIT 1
  `;
  
  try {
    const keyId = isGym ? entityData.client_id : entityData.patient_id;
    const result = await executor.query(sql, [keyId, date]);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error en findNutritionPaymentOnDate:', err.message);
    throw createError(500, 'Error al verificar pago de consulta');
  }
};

/**
 * Actualiza la URL del PDF de un plan
 */
const updatePlanPdfUrl = async (planId, pdfUrl) => {
  const sql = `UPDATE exercise_plans SET pdf_url = $1 WHERE id = $2 RETURNING *`;
  try {
    const result = await pool.query(sql, [pdfUrl, planId]);
    return result.rows[0];
  } catch (err) {
    console.error('Error en updatePlanPdfUrl:', err.message);
    throw createError(500, 'Error al actualizar URL del PDF del plan');
  }
};

module.exports = {
  getQueue,
  findRecordsByClient,
  createRecord,
  updateRecord,
  getExercisePlan,
  getExercisePlansByClient,
  createExercisePlan,
  updateExercisePlan,
  findNutritionPaymentOnDate,
  updatePlanPdfUrl,
};
