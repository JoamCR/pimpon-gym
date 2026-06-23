const repository = require('./clients.repository');
const { createError } = require('../../lib/appError');
const { pool } = require('../../lib/database');

/**
 * Obtiene la lista de clientes aplicando transformaciones necesarias
 */
const getAll = async (filters) => {
  return await repository.findAll(filters);
};

/**
 * Obtiene un cliente y lanza error 404 si no existe
 */
const getById = async (id) => {
  const client = await repository.findById(id);
  if (!client) {
    throw createError(404, 'Cliente no encontrado');
  }
  return client;
};

/**
 * Lógica compleja de negocio: crea el cliente y la suscripción en una transacción.
 * Maneja lógica de pago de inscripción, tipo de pago y control de transferencias.
 */
const create = async (data, registeredBy) => {
  // 0. Validar si ya existe un cliente con el mismo teléfono o RFC antes de abrir la transacción
  if (data.phone || data.rfc) {
    const existingClient = await repository.findByPhoneOrRfc(data.phone, data.rfc);
    if (existingClient) {
      if (existingClient.phone === data.phone && data.phone) {
        throw createError(400, 'Este número de teléfono ya está registrado');
      }
      if (existingClient.rfc === data.rfc && data.rfc) {
        throw createError(400, 'Este RFC ya está registrado');
      }
    }
  }

  // Obtenemos un cliente de conexión exclusivo para la transacción
  const dbClient = await pool.connect();
  
  try {
    await dbClient.query('BEGIN'); // Inicio de transacción
    
    // 1. Validar si el plan existe
    const plan = await repository.getPlanById(data.plan_id, dbClient);
    if (!plan) {
      throw createError(404, 'El plan seleccionado no existe');
    }

    // 2. Crear el cliente
    const clientData = { ...data, created_by: registeredBy };
    const newClient = await repository.create(clientData, dbClient);
    
    // 2.1 Asignar el UUID generado como código QR del cliente en la base de datos
    await dbClient.query('UPDATE clients SET qr_code = $1 WHERE id = $2', [newClient.id, newClient.id]);
    
    // 3. Crear la suscripción (usando la duración del plan)
    const subscriptionData = {
      client_id: newClient.id,
      plan_id: plan.id,
      duration_days: plan.duration_days
    };
    const subscription = await repository.createSubscription(subscriptionData, dbClient);
    
    // 4. Si el plan requiere inscripción, registrar el pago de tipo 'enrollment'
    if (plan.requires_enrollment && data.enrollment_amount !== undefined) {
      await repository.createPayment({
        client_id: newClient.id,
        subscription_id: subscription.id,
        amount: data.enrollment_amount,
        payment_method: data.payment_method,
        payment_type: 'enrollment',
        registered_by: registeredBy,
        entity_type: 'gym' // <-- AÑADIDO: Especificar la entidad para el pago
      }, dbClient);
    }
    
    // 5. Registrar el pago principal (visita o mensualidad)
    const mainPaymentType = plan.is_visit_based ? 'visit' : 'monthly';
    await repository.createPayment({
      client_id: newClient.id,
      subscription_id: subscription.id,
      amount: data.payment_amount,
      payment_method: data.payment_method,
      payment_type: mainPaymentType,
      registered_by: registeredBy,
      entity_type: 'gym' // <-- AÑADIDO: Especificar la entidad para el pago
    }, dbClient);
    
    // 6. Regla Crítica: Tope de transferencias ($30,000 MXN / mes)
    let transferWarning = null;
    if (data.payment_method === 'transfer') {
      const totalAmount = data.payment_amount + (plan.requires_enrollment ? (data.enrollment_amount || 0) : 0);
      const transferControl = await repository.updateTransferControl(totalAmount, dbClient);
      
      // ADVERTIR, pero NUNCA BLOQUEAR el pago.
      if (transferControl.newTotal > transferControl.limit) {
        transferWarning = `Precaución: El límite mensual de transferencias de $30,000 MXN ha sido superado (Actual: $${transferControl.newTotal}).`;
      }
    }
    
    await dbClient.query('COMMIT'); // Finalizar transacción
    
    return {
      client: newClient,
      subscription,
      warning: transferWarning
    };
  } catch (error) {
    await dbClient.query('ROLLBACK'); // Revertir en caso de error
    // Relanzar si es un error controlado operativo
    if (error.isOperational) throw error;
    
    console.error('Error interno en creación de cliente:', error);
    throw createError(500, 'Error al procesar la creación del cliente y sus pagos.');
  } finally {
    dbClient.release(); // Liberar la conexión devuelta al pool
  }
};

/**
 * Actualiza la información del cliente validando que primero exista
 */
const update = async (id, data) => {
  const exists = await repository.findById(id);
  if (!exists) {
    throw createError(404, 'Cliente no encontrado para actualizar');
  }
  
  const updated = await repository.update(id, data);
  return updated;
};

/**
 * Obtiene clientes a punto de expirar y clientes expirados hoy.
 * Regla de negocio: "vence en 3 días" y "vence hoy" son mutuamente excluyentes.
 */
const getExpiringClients = async () => {
  // Obtenemos los que vencen en 1, 2 y 3 días.
  const in1Day = await repository.findExpiring(1);
  const in2Days = await repository.findExpiring(2);
  const in3Days = await repository.findExpiring(3);
  
  const expiringIn3Days = [...in1Day, ...in2Days, ...in3Days];
  const expiringToday = await repository.findExpiredToday();
  
  return {
    expiringToday,
    expiringIn3Days
  };
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  getExpiringClients
};
