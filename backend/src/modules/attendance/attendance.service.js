const repository = require('./attendance.repository');
const clientsRepository = require('../clients/clients.repository');
const { createError } = require('../../lib/appError');

const getAll = async () => {
  return await repository.findAll();
};

const getTodayAttendance = async () => {
  return await repository.findToday();
};

const getByClient = async (clientId) => {
  return await repository.findByClient(clientId);
};

const createAttendance = async (data, registeredBy) => {
  const { client_id, method, checked_in_at, checked_out_at } = data;

  let client = null;
  // 1. Identificar si nos mandaron un UUID (Escáner QR) o un texto/teléfono (Manual)
  const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(client_id);

  if (isUUID) {
    client = await clientsRepository.findById(client_id);
  } else {
    // Intentar buscar por teléfono o RFC
    const found = await clientsRepository.findByPhoneOrRfc(client_id, client_id);
    if (found) {
      client = await clientsRepository.findById(found.id);
    }
  }

  if (!client) {
    throw createError(404, 'No se encontró ningún cliente con ese código, ID o teléfono.');
  }

  // 2. Control y parseo de fechas al "inicio del día"
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const endMembership = client.end_date ? new Date(client.end_date) : null;
  if (endMembership) endMembership.setHours(0, 0, 0, 0);

  const endEnrollment = client.enrollment_expires_at ? new Date(client.enrollment_expires_at) : null;
  if (endEnrollment) endEnrollment.setHours(0, 0, 0, 0);

  // 3. Validación crítica (Expirado o inactivo)
  if (!endMembership || endMembership < today || client.subscription_status !== 'active') {
    throw createError(403, `Estimado ${client.first_name}, no cuentas con inscripción / membresía activa, renueva en recepción para continuar con tu acceso.`);
  }

  // 4. Todo bien, registrar la asistencia con el ID real del cliente
  const attendanceData = { client_id: client.id, method, checked_in_at, checked_out_at, registered_by: registeredBy };
  const record = await repository.create(attendanceData);

  const diffDays = (endDate) => Math.floor((endDate - today) / (1000 * 60 * 60 * 24));

  // 5. Analizar advertencias (Vence en 3 días o menos)
  if (endMembership) {
    const daysMembership = diffDays(endMembership);
    if (daysMembership >= 0 && daysMembership <= 3) {
      return { status: 'warning', message: `Estimado ${client.first_name}, tu membresía está por concluir, te invitamos a renovarla en recepción.`, record };
    }
  }

  if (endEnrollment) {
    const daysEnrollment = diffDays(endEnrollment);
    if (daysEnrollment >= 0 && daysEnrollment <= 3) {
      return { status: 'warning', message: `Apreciable ${client.first_name}, tu inscripción está por concluir, te invitamos a renovar tu anualidad en recepción.`, record };
    }
  }

  // 6. Estado perfecto
  return {
    status: 'success',
    message: `¡Acceso concedido! Bienvenido, ${client.first_name}`,
    record
  };
};

const checkoutAttendance = async (id, checkedOutAt) => {
  const record = await repository.findById(id);
  if (!record) {
    throw createError(404, 'Registro de asistencia no encontrado');
  }
  return await repository.updateCheckout(id, checkedOutAt);
};

module.exports = {
  getAll,
  getTodayAttendance,
  getByClient,
  createAttendance,
  checkoutAttendance
};
