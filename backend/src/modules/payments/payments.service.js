const repository = require('./payments.repository');
const { pool } = require('../../lib/database');
const { createError } = require('../../lib/appError');

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
    
    // Lógica para RENOVAR SUSCRIPCIÓN si el pago es mensual o de visita
    if (data.entity_type === 'gym' && data.client_id && (data.payment_type === 'monthly' || data.payment_type === 'visit')) {
      const clientRes = await dbClient.query('SELECT plan_id, consecutive_months FROM clients WHERE id = $1', [data.client_id]);
      if (clientRes.rows.length > 0) {
        const planId = clientRes.rows[0].plan_id;
        let consecutiveMonths = clientRes.rows[0].consecutive_months || 0;
        const planRes = await dbClient.query('SELECT duration_days FROM plans WHERE id = $1', [planId]);
        
        if (planRes.rows.length > 0) {
          const duration = planRes.rows[0].duration_days;
          
          const subRes = await dbClient.query("SELECT id, end_date FROM subscriptions WHERE client_id = $1 AND status = 'active'", [data.client_id]);
          
          let currentEndDate = new Date();
          
          if (subRes.rows.length > 0) {
            const subEndDate = new Date(subRes.rows[0].end_date);
            // Si la suscripción aún está activa, extenderla desde el end_date actual
            // Si ya expiró (gap), reiniciar meses consecutivos y empezar desde hoy
            if (subEndDate >= new Date(new Date().setHours(0,0,0,0))) {
              currentEndDate = subEndDate;
              consecutiveMonths += 1;
            } else {
              consecutiveMonths = 1;
            }
            
            const newEndDate = new Date(currentEndDate);
            newEndDate.setDate(newEndDate.getDate() + duration);
            
            await dbClient.query("UPDATE subscriptions SET end_date = $1 WHERE id = $2", [newEndDate, subRes.rows[0].id]);
            data.subscription_id = subRes.rows[0].id;
          } else {
            // No tiene suscripción activa, crear una nueva
            consecutiveMonths = 1;
            const newEndDate = new Date(currentEndDate);
            newEndDate.setDate(newEndDate.getDate() + duration);
            
            const createSubRes = await dbClient.query(
              "INSERT INTO subscriptions (id, client_id, plan_id, start_date, end_date, status) VALUES (gen_random_uuid(), $1, $2, CURRENT_DATE, $3, 'active') RETURNING id",
              [data.client_id, planId, newEndDate]
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

module.exports = {
  registerPayment,
  getClientHistory,
  getCutoff,
  getCurrentTransferControl
};
