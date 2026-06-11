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
    const entityType = data.entity_type;
    let entity;

    if (entityType === 'gym') {
      const clientCheckSql = `
        SELECT c.*, p.includes_nutrition, c.first_consult_used
        FROM clients c
        JOIN plans p ON c.plan_id = p.id
        WHERE c.id = $1
      `;
      const clientResult = await dbClient.query(clientCheckSql, [data.client_id]);
      entity = clientResult.rows[0];

      if (!entity) {
        throw createError(404, 'Cliente no encontrado');
      }
      // Note: We no longer check if the plan includes nutrition, because 
      // clients can have their first free consult and subsequent paid ones.
    } else {
      const patientCheckSql = `
        SELECT * FROM patients WHERE id = $1
      `;
      const patientResult = await dbClient.query(patientCheckSql, [data.patient_id]);
      entity = patientResult.rows[0];

      if (!entity) {
        throw createError(404, 'Paciente no encontrado');
      }
    }

    if (entity.first_consult_used) {
      // Allow second consultation without prior payment
      // (Payment validation removed as per new requirement)
    }

    const evaluationData = {
      ...data,
      client_id: data.entity_type === 'gym' ? data.client_id : null,
      patient_id: data.entity_type === 'consultorio' ? data.patient_id : null,
      is_free_consult: !entity.first_consult_used
    };
    
    const evaluation = await repository.createRecord(
      evaluationData,
      nutritionistId,
      dbClient
    );

    if (!entity.first_consult_used) {
      if (entityType === 'gym') {
        await dbClient.query('UPDATE clients SET first_consult_used = true WHERE id = $1', [data.client_id]);
      } else {
        await dbClient.query('UPDATE patients SET first_consult_used = true WHERE id = $1', [data.patient_id]);
      }
    }
    
    await dbClient.query('COMMIT');
    return evaluation;
    
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Error en createEvaluation:', error);
    if (error.isOperational) throw error;
    throw createError(500, 'Error al crear evaluación nutricional');
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
      entity_type: data.entity_type
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
    const client = await clientsRepo.getById(clientId);
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
