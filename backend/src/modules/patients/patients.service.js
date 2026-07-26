const repository = require('./patients.repository');
const clientsRepository = require('../clients/clients.repository');
const { createError } = require('../../lib/appError');
const { pool } = require('../../lib/database');
const { parseLocalDate, formatLocalDate, addOneYearPreservingDayAndMonth } = require('../../lib/dateUtils');

const getAll = async (filters) => {
  return await repository.findAll(filters);
};

const getById = async (id) => {
  const patient = await repository.findById(id);
  if (!patient) {
    throw createError(404, 'Paciente no encontrado');
  }
  return patient;
};

const create = async (data, registeredBy) => {
  const patientData = { 
    ...data, 
    created_by: registeredBy,
    initial_origin: data.initial_origin || 'nutricion',
    current_flow: data.current_flow || 'nutricion'
  };
  return await repository.create(patientData);
};

const update = async (id, data) => {
  const exists = await repository.findById(id);
  if (!exists) {
    throw createError(404, 'Paciente no encontrado para actualizar');
  }
  
  const updatedPatient = await repository.update(id, data);

  // Sincronizar con el registro de cliente vinculado si existe
  const linkedClientId = exists.gym_client_id || exists.client_id;
  if (linkedClientId) {
    const clientFieldsToSync = {};
    if (data.first_name !== undefined) clientFieldsToSync.first_name = data.first_name;
    if (data.last_name !== undefined) clientFieldsToSync.last_name = data.last_name;
    if (data.phone !== undefined) clientFieldsToSync.phone = data.phone;
    if (data.email !== undefined) clientFieldsToSync.email = data.email;
    if (data.rfc !== undefined) clientFieldsToSync.rfc = data.rfc;
    if (data.gender !== undefined) clientFieldsToSync.gender = data.gender;
    if (data.age !== undefined) clientFieldsToSync.age = data.age;
    if (data.birth_date !== undefined) clientFieldsToSync.birth_date = data.birth_date;
    if (data.quick_weight_kg !== undefined) clientFieldsToSync.quick_weight_kg = data.quick_weight_kg;
    if (data.quick_height_cm !== undefined) clientFieldsToSync.quick_height_cm = data.quick_height_cm;
    if (data.quick_goal !== undefined) clientFieldsToSync.quick_goal = data.quick_goal;
    if (data.quick_health_notes !== undefined) clientFieldsToSync.quick_health_notes = data.quick_health_notes;

    if (Object.keys(clientFieldsToSync).length > 0) {
      await clientsRepository.update(linkedClientId, clientFieldsToSync);
    }
  }

  return updatedPatient;
};

/**
 * Inscribe un paciente existente de nutrición al gimnasio.
 * Crea o vincula un cliente de gimnasio, activa su suscripción y registra sus pagos.
 */
const enrollPatientToGym = async (patientId, data, registeredBy) => {
  const patient = await repository.findById(patientId);
  if (!patient) {
    throw createError(404, 'Paciente no encontrado');
  }

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    // 1. Validar plan
    const plan = await clientsRepository.getPlanById(data.plan_id, dbClient);
    if (!plan) {
      throw createError(404, 'El plan de gimnasio seleccionado no existe');
    }

    let client = null;
    const existingClientId = patient.gym_client_id || patient.client_id;

    if (existingClientId) {
      // Ya tiene un cliente vinculado, actualizamos su plan e información
      client = await clientsRepository.update(existingClientId, {
        plan_id: plan.id,
        current_flow: patient.initial_origin === 'nutricion' ? 'nutricion_y_gimnasio' : 'gimnasio_y_nutricion'
      }, dbClient);
    } else {
      // Crear nuevo cliente de gimnasio vinculado al paciente
      const clientData = {
        first_name: patient.first_name,
        last_name: patient.last_name,
        age: patient.age,
        phone: patient.phone,
        email: patient.email,
        rfc: patient.rfc,
        gender: patient.gender,
        birth_date: patient.birth_date,
        quick_weight_kg: patient.quick_weight_kg,
        quick_height_cm: patient.quick_height_cm,
        quick_goal: patient.quick_goal,
        quick_health_notes: patient.quick_health_notes,
        plan_id: plan.id,
        patient_id: patient.id,
        initial_origin: patient.initial_origin || 'nutricion',
        current_flow: 'nutricion_y_gimnasio',
        created_by: registeredBy,
        enrollment_date: data.enrollment_date || new Date().toISOString().split('T')[0],
      };
      client = await clientsRepository.create(clientData, dbClient);

      // Generar QR code
      await dbClient.query('UPDATE clients SET qr_code = $1 WHERE id = $2', [client.id, client.id]);

      // Vincular paciente -> cliente
      const nextFlow = patient.initial_origin === 'gimnasio' ? 'gimnasio_y_nutricion' : 'nutricion_y_gimnasio';
      await repository.update(patient.id, { client_id: client.id, current_flow: nextFlow }, dbClient);
    }

    // 2. Crear suscripción de gimnasio
    const subscriptionData = {
      client_id: client.id,
      plan_id: plan.id,
      duration_days: plan.duration_days
    };
    const subscription = await clientsRepository.createSubscription(subscriptionData, dbClient);

    // 3. Registrar pago de inscripción si aplica
    if (plan.requires_enrollment && data.enrollment_amount !== undefined) {
      await clientsRepository.createPayment({
        client_id: client.id,
        subscription_id: subscription.id,
        amount: data.enrollment_amount,
        payment_method: data.payment_method,
        payment_type: 'enrollment',
        registered_by: registeredBy,
        entity_type: 'gym'
      }, dbClient);

      const enrollmentDate = client.enrollment_date || formatLocalDate(new Date());
      const parsedEnrollment = parseLocalDate(enrollmentDate);
      const expiresObj = addOneYearPreservingDayAndMonth(parsedEnrollment, parsedEnrollment.getMonth(), parsedEnrollment.getDate());
      const enrollmentExpiresAt = formatLocalDate(expiresObj);

      await dbClient.query(
        "UPDATE clients SET enrollment_date = $1, enrollment_expires_at = $2 WHERE id = $3",
        [enrollmentDate, enrollmentExpiresAt, client.id]
      );
    }

    // 4. Registrar pago de mensualidad o visita
    const mainPaymentType = plan.is_visit_based ? 'visit' : 'monthly';
    const mainPaymentAmount = data.payment_amount !== undefined ? data.payment_amount : plan.price_monthly;
    
    await clientsRepository.createPayment({
      client_id: client.id,
      subscription_id: subscription.id,
      amount: mainPaymentAmount,
      payment_method: data.payment_method,
      payment_type: mainPaymentType,
      registered_by: registeredBy,
      entity_type: 'gym'
    }, dbClient);

    // 5. Control de tope de transferencias
    let transferWarning = null;
    if (data.payment_method === 'transfer') {
      const totalAmount = mainPaymentAmount + (plan.requires_enrollment ? (data.enrollment_amount || 0) : 0);
      const transferControl = await clientsRepository.updateTransferControl(totalAmount, dbClient);
      if (transferControl.newTotal > transferControl.limit) {
        transferWarning = `Precaución: El límite mensual de transferencias de $30,000 MXN ha sido superado (Actual: $${transferControl.newTotal}).`;
      }
    }

    await dbClient.query('COMMIT');

    const updatedPatient = await repository.findById(patient.id);

    return {
      patient: updatedPatient,
      client,
      subscription,
      warning: transferWarning
    };
  } catch (error) {
    await dbClient.query('ROLLBACK');
    if (error.isOperational) throw error;
    console.error('Error al inscribir paciente al gimnasio:', error);
    throw createError(500, 'Error al inscribir el paciente al gimnasio.');
  } finally {
    dbClient.release();
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  enrollPatientToGym
};
