const repository = require('./nutrition.repository');
const { pool } = require('../../lib/database');
const { createError } = require('../../lib/appError');

/**
 * Servicio de nutriología
 * REGLA: Lógica de negocio ÚNICAMENTE. Nunca queries SQL aquí.
 */

/**
 * Obtiene la cola de pacientes con flag de si es primera consulta
 */
const getPatientQueue = async () => {
  try {
    const queue = await repository.getQueue();
    
    // Agregar flag de si es primera consulta gratis
    return queue.map(patient => ({
      ...patient,
      isFirstConsult: !patient.first_consult_used,
      consultType: patient.first_consult_used ? 'De pago' : 'Gratis'
    }));
  } catch (error) {
    console.error('Error en getPatientQueue:', error);
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener cola de pacientes');
  }
};

/**
 * Crea una evaluación nutricional
 * Reglas críticas:
 * 1. Cliente debe tener plan con includes_nutrition=true
 * 2. Si first_consult_used=true: verificar pago 'nutrition_consult' del día
 * 3. Si is_free_consult=true: marcar first_consult_used en clients
 */
const createEvaluation = async (clientId, data, nutritionistId) => {
  const dbClient = await pool.connect();
  
  try {
    await dbClient.query('BEGIN');
    
    let entity = null;
    let resolvedEntityType = data.entity_type;
    let resolvedClientId = data.client_id || null;
    let resolvedPatientId = data.patient_id || null;
    const targetId = data.client_id || data.patient_id || clientId;

    // 1. Si se especificó client_id o entity_type 'gym', buscar en la tabla clients primero
    if (data.entity_type === 'gym' || data.client_id) {
      const clientCheckSql = `
        SELECT c.*, p.includes_nutrition, c.first_consult_used
        FROM clients c
        LEFT JOIN plans p ON c.plan_id = p.id
        WHERE c.id = $1
      `;
      const clientResult = await dbClient.query(clientCheckSql, [targetId]);
      if (clientResult.rows.length > 0) {
        entity = clientResult.rows[0];
        resolvedEntityType = 'gym';
        resolvedClientId = entity.id;
        resolvedPatientId = entity.patient_id || null;
      }
    }

    // 2. Si es consultorio o no se encontró en clients, buscar en la tabla patients
    if (!entity && (data.entity_type === 'consultorio' || data.patient_id || targetId)) {
      const patientCheckSql = `SELECT * FROM patients WHERE id = $1`;
      const patientResult = await dbClient.query(patientCheckSql, [targetId]);
      if (patientResult.rows.length > 0) {
        entity = patientResult.rows[0];
        resolvedEntityType = 'consultorio';
        resolvedPatientId = entity.id;
        resolvedClientId = entity.client_id || null;
      }
    }

    // 3. Fallback: Si con targetId no estuvo en patients, intentar en clients por si acaso
    if (!entity && targetId) {
      const clientCheckSql = `
        SELECT c.*, p.includes_nutrition, c.first_consult_used
        FROM clients c
        LEFT JOIN plans p ON c.plan_id = p.id
        WHERE c.id = $1
      `;
      const clientResult = await dbClient.query(clientCheckSql, [targetId]);
      if (clientResult.rows.length > 0) {
        entity = clientResult.rows[0];
        resolvedEntityType = 'gym';
        resolvedClientId = entity.id;
        resolvedPatientId = entity.patient_id || null;
      }
    }

    if (!entity) {
      throw createError(404, 'Paciente o cliente no encontrado');
    }

    const evaluationData = {
      ...data,
      entity_type: resolvedEntityType,
      client_id: resolvedClientId,
      patient_id: resolvedPatientId,
      is_free_consult: !entity.first_consult_used
    };
    
    const evaluation = await repository.createRecord(
      evaluationData,
      nutritionistId,
      dbClient
    );

    // Actualizar el peso y estatura más reciente en las tablas de clients/patients
    if (data.weight_kg !== undefined || data.height_cm !== undefined) {
      const setClauses = [];
      const queryParams = [];
      let pIdx = 1;

      if (data.weight_kg !== undefined && data.weight_kg !== null) {
        setClauses.push(`quick_weight_kg = $${pIdx++}`);
        queryParams.push(data.weight_kg);
      }
      if (data.height_cm !== undefined && data.height_cm !== null) {
        setClauses.push(`quick_height_cm = $${pIdx++}`);
        queryParams.push(data.height_cm);
      }

      if (setClauses.length > 0) {
        const fullSetSql = [...setClauses, 'quick_assessed_at = CURRENT_TIMESTAMP'].join(', ');
        const idParamIdx = pIdx;
        
        if (resolvedClientId) {
          await dbClient.query(
            `UPDATE clients SET ${fullSetSql} WHERE id = $${idParamIdx}`,
            [...queryParams, resolvedClientId]
          );
        }
        if (resolvedPatientId) {
          await dbClient.query(
            `UPDATE patients SET ${fullSetSql} WHERE id = $${idParamIdx}`,
            [...queryParams, resolvedPatientId]
          );
        }
      }
    }

    if (!entity.first_consult_used) {
      if (resolvedEntityType === 'gym' && resolvedClientId) {
        await dbClient.query('UPDATE clients SET first_consult_used = true WHERE id = $1', [resolvedClientId]);
      } else if (resolvedPatientId) {
        await dbClient.query('UPDATE patients SET first_consult_used = true WHERE id = $1', [resolvedPatientId]);
      }
    }
    
    await dbClient.query('COMMIT');
    return evaluation;
    
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Error en createEvaluation:', error);
    if (error.isOperational) throw error;
    throw createError(500, error.message || 'Error al crear evaluación nutricional');
  } finally {
    dbClient.release();
  }
};

/**
 * Obtiene el historial de evaluaciones de un cliente
 */
const getClientEvaluations = async (clientId) => {
  try {
    return await repository.findRecordsByClient(clientId);
  } catch (error) {
    console.error('Error en getClientEvaluations:', error);
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener evaluaciones');
  }
};

/**
 * Actualiza una evaluación existente
 */
const updateEvaluation = async (recordId, data) => {
  try {
    return await repository.updateRecord(recordId, data);
  } catch (error) {
    console.error('Error en updateEvaluation:', error);
    if (error.isOperational) throw error;
    throw createError(500, 'Error al actualizar evaluación');
  }
};

/**
 * Crea un plan de ejercicio (6 días: Lun-Sáb)
 */
const createPlan = async (clientId, data, nutritionistId) => {
  try {
    const planData = {
      ...data,
      client_id: data.entity_type === 'gym' ? (data.client_id || clientId) : null,
      patient_id: data.entity_type === 'consultorio' ? (data.patient_id || clientId) : null,
      entity_type: data.entity_type || 'gym',
      month_year: data.month_year || new Date().toISOString().slice(0, 7),
      content: data.content || {},
      nutrition_record_id: data.nutrition_record_id || null,
    };
    return await repository.createExercisePlan(planData, nutritionistId);
  } catch (error) {
    console.error('Error en createPlan:', error);
    if (error.isOperational) throw error;
    throw createError(500, 'Error al crear plan de ejercicio');
  }
};

/**
 * Obtiene planes de ejercicio de un cliente
 */
const getClientPlans = async (clientId) => {
  try {
    return await repository.getExercisePlansByClient(clientId);
  } catch (error) {
    console.error('Error en getClientPlans:', error);
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener planes');
  }
};

/**
 * Actualiza un plan de ejercicio
 */
const updatePlan = async (planId, data) => {
  try {
    return await repository.updateExercisePlan(planId, data);
  } catch (error) {
    console.error('Error en updatePlan:', error);
    if (error.isOperational) throw error;
    throw createError(500, 'Error al actualizar plan');
  }
};

/**
 * Obtiene un plan por ID
 */
const getPlanById = async (planId) => {
  try {
    return await repository.getExercisePlan(planId);
  } catch (error) {
    console.error('Error en getPlanById:', error);
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener plan');
  }
};

/**
 * Obtiene un cliente por ID
 */
const getClientById = async (clientId) => {
  try {
    const clientsRepo = require('../clients/clients.repository');
    const patientRepo = require('../patients/patients.repository');
    const client = await clientsRepo.findById(clientId);
    if (client) return client;
    return await patientRepo.findById(clientId);
  } catch (error) {
    console.error('Error en getClientById:', error);
    if (error.isOperational) throw error;
    throw createError(500, 'Error al obtener cliente');
  }
};

/**
 * Actualiza la URL del PDF en un plan
 */
const updatePlanPdfUrl = async (planId, pdfUrl) => {
  try {
    return await repository.updatePlanPdfUrl(planId, pdfUrl);
  } catch (error) {
    console.error('Error en updatePlanPdfUrl:', error);
    if (error.isOperational) throw error;
    throw createError(500, 'Error al actualizar URL del PDF');
  }
};

module.exports = {
  getPatientQueue,
  createEvaluation,
  getClientEvaluations,
  updateEvaluation,
  createPlan,
  getClientPlans,
  updatePlan,
  getPlanById,
  getClientById,
  updatePlanPdfUrl,
};
