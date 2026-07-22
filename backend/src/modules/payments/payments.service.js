const repository = require('./payments.repository');
const { pool } = require('../../lib/database');
const { createError } = require('../../lib/appError');

/**
 * Helpers para manejo de fechas de suscripción y día de corte sin desfase de zona horaria UTC
 */
const parseLocalDate = (dateInput) => {
  if (!dateInput) return new Date();
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
  }
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  }
  return new Date(dateInput);
};

const formatLocalDate = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addOneMonthPreservingDay = (dateObj, targetDay) => {
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 11) {
    nextYear += Math.floor(nextMonth / 12);
    nextMonth = nextMonth % 12;
  }

  const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
  const dayToSet = Math.min(targetDay, daysInNextMonth);

  return new Date(nextYear, nextMonth, dayToSet);
};

const calculateRenewalEndDate = (subEndDateInput, todayInput = new Date(), isVisit = false, durationDays = 30) => {
  const subEnd = parseLocalDate(subEndDateInput);
  const today = parseLocalDate(todayInput);

  if (isVisit || durationDays < 28) {
    const baseDate = subEnd >= today ? subEnd : today;
    const newEnd = new Date(baseDate);
    newEnd.setDate(newEnd.getDate() + durationDays);
    return newEnd;
  }

  const targetDay = subEnd.getDate();
  let candidate = new Date(subEnd);

  if (candidate >= today) {
    candidate = addOneMonthPreservingDay(candidate, targetDay);
  } else {
    while (candidate <= today) {
      candidate = addOneMonthPreservingDay(candidate, targetDay);
    }
  }

  return candidate;
};

const addOneYearPreservingDayAndMonth = (dateObj, targetMonth, targetDay) => {
  const nextYear = dateObj.getFullYear() + 1;
  const daysInNextMonth = new Date(nextYear, targetMonth + 1, 0).getDate();
  const dayToSet = Math.min(targetDay, daysInNextMonth);
  return new Date(nextYear, targetMonth, dayToSet);
};

const calculateAnnualRenewalEndDate = (enrollmentExpiresInput, todayInput = new Date()) => {
  const currentEnd = parseLocalDate(enrollmentExpiresInput);
  const today = parseLocalDate(todayInput);

  const targetMonth = currentEnd.getMonth();
  const targetDay = currentEnd.getDate();

  let candidate = new Date(currentEnd);

  if (candidate >= today) {
    candidate = addOneYearPreservingDayAndMonth(candidate, targetMonth, targetDay);
  } else {
    while (candidate <= today) {
      candidate = addOneYearPreservingDayAndMonth(candidate, targetMonth, targetDay);
    }
  }

  return candidate;
};

/**
 * Registra un pago evaluando la regla del tope de transferencias.
 */
const registerPayment = async (data, registeredBy) => {
  const dbClient = await pool.connect();
  
  try {
    await dbClient.query('BEGIN');
    
    let transferWarning = null;
    
    // Regla de Negocio: Tope de transferencias ($30,000 MXN / mes)
    if (data.payment_method === 'transfer') {
      const limit = parseFloat(process.env.TRANSFER_MONTHLY_LIMIT || '30000');
      const today = new Date().toISOString();
      
      const currentControl = await repository.getTransferControl(today);
      const currentTotal = currentControl ? parseFloat(currentControl.total_received) : 0;
      const newTotal = currentTotal + data.amount;
      
      if (newTotal > limit) {
        transferWarning = {
          warning: true,
          message: "Tope superado",
          newTotal,
          limit
        };
      }
      
      // Actualizamos el registro de control de transferencias del mes
      await repository.updateTransferControl(today, data.amount, dbClient);
    }

    // Lógica para RENOVAR ANUALIDAD / INSCRIPCIÓN
    if (data.entity_type === 'gym' && data.client_id && data.payment_type === 'enrollment') {
      const clientRes = await dbClient.query('SELECT enrollment_date, enrollment_expires_at FROM clients WHERE id = $1', [data.client_id]);
      if (clientRes.rows.length > 0) {
        const clientRow = clientRes.rows[0];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const baseExpiresAt = clientRow.enrollment_expires_at 
          ? clientRow.enrollment_expires_at 
          : (clientRow.enrollment_date || today);

        const newEnrollmentExpiresAt = calculateAnnualRenewalEndDate(baseExpiresAt, today);
        const newEnrollmentDate = clientRow.enrollment_date || formatLocalDate(today);

        await dbClient.query(
          "UPDATE clients SET enrollment_date = $1, enrollment_expires_at = $2 WHERE id = $3",
          [formatLocalDate(parseLocalDate(newEnrollmentDate)), formatLocalDate(newEnrollmentExpiresAt), data.client_id]
        );
      }
    }

    // Lógica para RENOVAR SUSCRIPCIÓN si el pago es mensual o de visita
    if (data.entity_type === 'gym' && data.client_id && (data.payment_type === 'monthly' || data.payment_type === 'visit')) {
      const clientRes = await dbClient.query('SELECT plan_id, consecutive_months, enrollment_expires_at FROM clients WHERE id = $1', [data.client_id]);
      if (clientRes.rows.length > 0) {
        const effectivePlanId = data.plan_id || clientRes.rows[0].plan_id;
        let consecutiveMonths = clientRes.rows[0].consecutive_months || 0;
        const enrollmentExpiresAt = clientRes.rows[0].enrollment_expires_at;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // REGLA CRÍTICA: Todo pago de mensualidad requiere tener la Anualidad pagada y vigente.
        if (data.payment_type === 'monthly') {
          if (!enrollmentExpiresAt || parseLocalDate(enrollmentExpiresAt) < today) {
            throw createError(400, 'El cliente no cuenta con la anualidad (inscripción) pagada y vigente. Debe renovar la anualidad primero.');
          }
        }

        // Si cambió el plan, actualizarlo en la ficha del cliente
        if (data.plan_id && data.plan_id !== clientRes.rows[0].plan_id) {
          await dbClient.query('UPDATE clients SET plan_id = $1 WHERE id = $2', [data.plan_id, data.client_id]);
        }

        const planRes = await dbClient.query('SELECT duration_days, is_visit_based FROM plans WHERE id = $1', [effectivePlanId]);
        
        if (planRes.rows.length > 0) {
          const duration = planRes.rows[0].duration_days;
          const isVisit = planRes.rows[0].is_visit_based;
          
          // Se busca la última suscripción (activa o expirada) para preservar su día de corte N
          const subRes = await dbClient.query("SELECT id, start_date, end_date FROM subscriptions WHERE client_id = $1 ORDER BY end_date DESC LIMIT 1", [data.client_id]);
      
          let newStartDate;
          let newEndDate;

          if (subRes.rows.length > 0) {
            const sub = subRes.rows[0];
            const subEndDate = parseLocalDate(sub.end_date);
            const diffDays = Math.floor((today - subEndDate) / (1000 * 60 * 60 * 24));

            if (diffDays <= 31) {
              // Racha continua: renovación a tiempo o atrasada dentro del margen del mes (con penalización si aplica)
              newStartDate = subEndDate >= today ? subEndDate : today;
              newEndDate = calculateRenewalEndDate(sub.end_date, today, isVisit, duration);
              consecutiveMonths += 1;
            } else {
              // Abandono de un mes completo o más (ej. temas de salud o ausencia de 32+ días)
              // Se reinicia la racha a 1 y la nueva fecha de inicio es el día de regreso
              newStartDate = today;
              newEndDate = calculateRenewalEndDate(today, today, isVisit, duration);
              consecutiveMonths = 1;
            }

            // Marcar suscripciones activas anteriores como 'expired' para conservar el historial intacto
            await dbClient.query(
              "UPDATE subscriptions SET status = 'expired' WHERE client_id = $1 AND status = 'active'",
              [data.client_id]
            );

            // Crear una NUEVA fila en la tabla de suscripciones para registrar el historial imborrable de cada renovación
            const createSubRes = await dbClient.query(
              "INSERT INTO subscriptions (id, client_id, plan_id, start_date, end_date, status) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active') RETURNING id",
              [data.client_id, effectivePlanId, formatLocalDate(newStartDate), formatLocalDate(newEndDate)]
            );
            data.subscription_id = createSubRes.rows[0].id;

          } else {
            // No tiene suscripción previa
            consecutiveMonths = 1;
            newStartDate = today;
            newEndDate = calculateRenewalEndDate(today, today, isVisit, duration);
            
            const createSubRes = await dbClient.query(
              "INSERT INTO subscriptions (id, client_id, plan_id, start_date, end_date, status) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active') RETURNING id",
              [data.client_id, effectivePlanId, formatLocalDate(newStartDate), formatLocalDate(newEndDate)]
            );
            data.subscription_id = createSubRes.rows[0].id;
          }
          
          // Actualizar meses consecutivos en el cliente
          await dbClient.query("UPDATE clients SET consecutive_months = $1 WHERE id = $2", [consecutiveMonths, data.client_id]);
        }
      }
    }
    
    // Crear el pago (el repositorio se encarga de inyectar en audit_log)
    const payment = await repository.create(data, registeredBy, dbClient);
    
    await dbClient.query('COMMIT');
    
    return {
      payment,
      ...(transferWarning ? { transferWarning } : {})
    };
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Error interno en creación de pago:', error);
    throw createError(500, 'Error al procesar el pago.');
  } finally {
    dbClient.release();
  }
};

/**
 * Obtiene el historial de pagos de un cliente
 */
const getClientHistory = async (clientId) => {
  return await repository.findByClient(clientId);
};

const getPatientHistory = async (patientId) => {
  return await repository.findByPatient(patientId);
};

/**
 * Obtiene el corte de caja general de fechas indicadas
 */
const getCutoff = async (from, to) => {
  return await repository.getCashCutoff(from, to);
};

/**
 * Consulta el estado actual de transferencias del mes en curso
 */
const getCurrentTransferControl = async () => {
  const today = new Date().toISOString();
  return await repository.getTransferControl(today);
};

const getPaymentsHistory = async (entityType, from, to) => {
  return await repository.getPaymentsHistory(entityType, from, to);
};

/**
 * Actualiza un pago existente (monto, método de pago, notas) y ajusta transfer_control si aplica.
 */
const updatePayment = async (paymentId, data, registeredBy) => {
  const dbClient = await pool.connect();
  
  try {
    await dbClient.query('BEGIN');
    
    const existingPayment = await repository.findById(paymentId, dbClient);
    if (!existingPayment) {
      throw createError(404, 'El pago no existe.');
    }

    const oldAmount = Number(existingPayment.amount);
    const oldMethod = existingPayment.payment_method;
    const newAmount = data.amount !== undefined ? Number(data.amount) : oldAmount;
    const newMethod = data.payment_method || oldMethod;

    const paidAtIso = existingPayment.paid_at ? new Date(existingPayment.paid_at).toISOString() : new Date().toISOString();

    // Ajuste de transfer_control si el pago fue o pasa a ser transferencia
    if (oldMethod === 'transfer' && newMethod === 'transfer') {
      const diff = newAmount - oldAmount;
      if (diff !== 0) {
        await repository.updateTransferControl(paidAtIso, diff, dbClient);
      }
    } else if (oldMethod === 'transfer' && newMethod !== 'transfer') {
      await repository.updateTransferControl(paidAtIso, -oldAmount, dbClient);
    } else if (oldMethod !== 'transfer' && newMethod === 'transfer') {
      await repository.updateTransferControl(paidAtIso, newAmount, dbClient);
    }

    const updatedPayment = await repository.update(paymentId, data, registeredBy, dbClient);
    
    await dbClient.query('COMMIT');
    return updatedPayment;
  } catch (error) {
    await dbClient.query('ROLLBACK');
    if (error.statusCode) throw error;
    console.error('Error interno en actualización de pago:', error);
    throw createError(500, 'Error al actualizar el pago.');
  } finally {
    dbClient.release();
  }
};

/**
 * Anula/elimina un pago por cobro duplicado o error, ajustando transfer_control si aplica.
 */
const deletePayment = async (paymentId, registeredBy) => {
  const dbClient = await pool.connect();
  
  try {
    await dbClient.query('BEGIN');
    
    const existingPayment = await repository.findById(paymentId, dbClient);
    if (!existingPayment) {
      throw createError(404, 'El pago no existe.');
    }

    if (existingPayment.is_voided) {
      throw createError(400, 'El pago ya ha sido anulado previamente.');
    }

    if (existingPayment.payment_method === 'transfer') {
      const paidAtIso = existingPayment.paid_at ? new Date(existingPayment.paid_at).toISOString() : new Date().toISOString();
      await repository.updateTransferControl(paidAtIso, -Number(existingPayment.amount), dbClient);
    }

    const voidedPayment = await repository.voidPayment(paymentId, registeredBy, dbClient);
    
    await dbClient.query('COMMIT');
    return voidedPayment;
  } catch (error) {
    await dbClient.query('ROLLBACK');
    if (error.statusCode || error.isOperational) throw error;
    console.error('Error interno al anular el pago:', error);
    throw createError(500, error.message || 'Error al anular el pago.');
  } finally {
    dbClient.release();
  }
};


module.exports = {
  registerPayment,
  updatePayment,
  deletePayment,
  getClientHistory,
  getPatientHistory,
  getCutoff,
  getCurrentTransferControl,
  getPaymentsHistory
};


