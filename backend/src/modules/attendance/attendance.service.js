const repository = require('./attendance.repository');
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
  const attendanceData = { ...data, registered_by: registeredBy };
  return await repository.create(attendanceData);
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
